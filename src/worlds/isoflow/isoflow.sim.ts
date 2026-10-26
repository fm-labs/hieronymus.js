/**
 * Runs a workflow model.
 *
 * Batch: a run starts at the sources. A node starts once every incoming edge is resolved and at least
 * one of them delivered data; otherwise it is skipped. A finished node sends data along its outgoing
 * edges (a decision along one of them), a failed one skips everything downstream.
 *
 * Stream: the sources send events all the time. An event that reaches a node flashes it and moves on
 * along all its outgoing edges; clients and tables show the messages they received.
 */
import type { FlowEdge, FlowModel, FlowNode } from './isoflow.types.ts'

/** Cells per second the data moves along the edges */
const FLOW_SPEED = 7
const QUEUE_DELAY = 0.25
const RESTART_DELAY = 2.5
const PAYLOADS = [
  'Morning.',
  'Hello team.',
  'Ship it!',
  'LGTM',
  'On my way',
  'Coffee?',
  'Deployed.',
]

export type RunResult = 'success' | 'failed'

export class FlowSimulation {
  /** Speed of the simulation, 1 is real time */
  speed = 1
  paused = false
  run = 0
  /** Seconds since the run started */
  runTime = 0
  /** Results of the finished runs, the last one at the end */
  readonly history: RunResult[] = []
  /** 'running' while a run is in progress, the result while waiting for the next one */
  status: 'running' | RunResult = 'running'

  private waiting = 0
  private queuedFor = new Map<FlowNode, number>()
  private nextEvent = new Map<FlowNode, number>()
  private messageId = 0
  /** Nodes whose glow is still rising after an event */
  private rising = new Set<FlowNode>()
  private onChange?: () => void

  constructor(
    readonly model: FlowModel,
    private readonly random: () => number = Math.random,
  ) {
    if (model.mode === 'batch') this.restart()
    else this.model.nodes.forEach((n) => this.nextEvent.set(n, 0.4 + this.random() * 1.5))
  }

  /** Called when a run starts or ends, e.g. to update the HUD */
  set changed(listener: () => void) {
    this.onChange = listener
  }

  restart() {
    if (this.model.mode === 'stream') return
    this.run++
    this.runTime = 0
    this.status = 'running'
    this.queuedFor.clear()
    for (const n of this.model.nodes) {
      n.state = 'idle'
      n.progress = 0
      n.elapsed = 0
    }
    for (const e of this.model.edges) {
      e.state = e.back ? 'skipped' : 'idle'
      e.progress = 0
    }
    for (const n of this.model.nodes) if (!this.incoming(n).length) this.queue(n)
    this.onChange?.()
  }

  step(seconds: number) {
    // the glow of an event eases in (~0.2 s) and fades out slowly (~1.2 s), so it never blinks
    for (const n of this.model.nodes) {
      if (this.rising.has(n)) {
        n.flash = Math.min(1, n.flash + seconds * 5)
        if (n.flash >= 1) this.rising.delete(n)
      } else n.flash = Math.max(0, n.flash - seconds * 0.8)
    }
    if (this.paused) return
    const dt = seconds * this.speed
    if (this.model.mode === 'stream') this.stepStream(dt)
    else this.stepBatch(dt)
  }

  private incoming(n: FlowNode) {
    return n.in.filter((e) => !e.back)
  }

  private outgoing(n: FlowNode) {
    return n.out.filter((e) => !e.back)
  }

  private queue(n: FlowNode) {
    n.state = 'queued'
    this.queuedFor.set(n, 0)
  }

  private stepBatch(dt: number) {
    if (this.status !== 'running') {
      this.waiting -= dt
      if (this.waiting <= 0) this.restart()
      return
    }
    this.runTime += dt
    const { nodes, edges } = this.model

    for (const [n, t] of this.queuedFor) {
      if (t + dt < QUEUE_DELAY) {
        this.queuedFor.set(n, t + dt)
        continue
      }
      this.queuedFor.delete(n)
      n.state = 'running'
      n.progress = 0
      n.elapsed = 0
    }

    for (const n of nodes) {
      if (n.state !== 'running') continue
      n.elapsed += dt
      n.progress = Math.min(1, n.elapsed / n.duration)
      if (n.progress < 1) continue
      const out = this.outgoing(n)
      if (this.random() < n.failRate) {
        n.state = 'failed'
        out.forEach((e) => (e.state = 'skipped'))
      } else {
        n.state = 'success'
        this.rising.add(n)
        // a decision sends the data along one of its branches, mostly the first
        const chosen =
          n.kind === 'decision' && out.length > 1
            ? out[this.random() < 0.75 ? 0 : 1 + Math.floor(this.random() * (out.length - 1))]
            : undefined
        for (const e of out) {
          e.state = !chosen || e === chosen ? 'flowing' : 'skipped'
          e.progress = 0
        }
      }
    }

    for (const e of edges) {
      if (e.state !== 'flowing') continue
      const length = e.lengths[e.lengths.length - 1] || 1
      e.progress += (dt * FLOW_SPEED) / Math.max(2, length)
      if (e.progress >= 1) {
        e.progress = 1
        e.state = 'done'
      }
    }

    // nodes whose inputs are all resolved: start, or skip
    let changed = true
    while (changed) {
      changed = false
      for (const n of nodes) {
        if (n.state !== 'idle') continue
        const inputs = this.incoming(n)
        if (!inputs.every((e) => e.state === 'done' || e.state === 'skipped')) continue
        changed = true
        if (inputs.some((e) => e.state === 'done')) this.queue(n)
        else {
          n.state = 'skipped'
          this.outgoing(n).forEach((e) => (e.state = 'skipped'))
        }
      }
    }

    const busy =
      nodes.some((n) => n.state === 'queued' || n.state === 'running') ||
      edges.some((e) => e.state === 'flowing')
    if (!busy) {
      this.status = nodes.some((n) => n.state === 'failed') ? 'failed' : 'success'
      this.history.push(this.status)
      if (this.history.length > 24) this.history.shift()
      this.waiting = RESTART_DELAY
      this.onChange?.()
    }
  }

  private stepStream(dt: number) {
    this.runTime += dt
    for (const n of this.model.nodes) {
      if (this.incoming(n).length) continue
      const t = (this.nextEvent.get(n) ?? 0) - dt
      if (t > 0) {
        this.nextEvent.set(n, t)
        continue
      }
      this.nextEvent.set(n, 1.8 + this.random() * 2.6)
      const payload = PAYLOADS[Math.floor(this.random() * PAYLOADS.length)]
      this.receive(n, payload)
    }
    for (const e of this.model.edges) {
      if (!e.pulses.length) continue
      const length = e.lengths[e.lengths.length - 1] || 1
      for (const p of e.pulses) p.t += (dt * FLOW_SPEED) / Math.max(2, length)
      const arrived = e.pulses.filter((p) => p.t >= 1)
      if (!arrived.length) continue
      e.pulses = e.pulses.filter((p) => p.t < 1)
      for (const p of arrived) this.receive(e.to, p.payload)
    }
  }

  /** An event reaches a node: show it, and pass it on */
  private receive(n: FlowNode, payload: string) {
    this.rising.add(n)
    n.count++
    if (n.table) {
      n.table.rows.push([String(++this.messageId), payload])
      if (n.table.rows.length > 3) n.table.rows.shift()
    } else if (n.kind === 'client') {
      n.lines.push(payload)
      if (n.lines.length > 2) n.lines.shift()
    }
    for (const e of this.outgoing(n)) e.pulses.push({ t: 0, payload })
  }
}

/** The data of an edge: the distances (in cells) of the glowing parts on it */
export function edgeGlows(e: FlowEdge): number[] {
  const length = e.lengths[e.lengths.length - 1] || 0
  if (e.state === 'flowing') return [e.progress * length]
  return e.pulses.map((p) => p.t * length)
}
