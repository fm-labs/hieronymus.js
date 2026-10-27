/**
 * The live state of a containers model. Pure, no engine imports; takes `random` so tests can seed it.
 *
 * Links carry flows, drawn like the data in 'isoflow': a glowing streak that slides along the line and
 * drains into its target. A call sends a request from a running container at a steady rate; a request
 * to a container that is down fails (drawn red). Ingress comes from the host gate all the time.
 * Mounts read and write their volume. Containers can be stopped and started, which is how you see
 * what breaks when a database goes down.
 */
import { linkLength } from './isocontainers.layout.ts'
import type {
  Container,
  ContainerKind,
  ContainersModel,
  Link,
  Pulse,
  Volume,
} from './isocontainers.types.ts'

/** How much of each link's rate is drawn: fewer flows keep the streets calm */
export const TRAFFIC = 0.45
/** Cells per second a flow travels */
export const PULSE_SPEED = 3.2
/** The length of a flow's glowing tail, in cells; it drains into the target before it is gone */
export const TAIL = 0.5
const MAX_PULSES = 8
/** How long a ripple or a spark burst lasts */
export const EVENT_SECONDS = 1.2
/** How long a started container takes to come up (it rises out of the ground meanwhile) */
export const START_SECONDS = 2.4
export const STOP_SECONDS = 0.6

const BASE_CPU: Record<ContainerKind, number> = {
  proxy: 4,
  web: 6,
  app: 12,
  worker: 18,
  database: 10,
  cache: 3,
  queue: 6,
  storage: 4,
  monitor: 8,
  tool: 1,
}

const BASE_MEM: Record<ContainerKind, number> = {
  proxy: 48,
  web: 140,
  app: 320,
  worker: 260,
  database: 620,
  cache: 90,
  queue: 380,
  storage: 210,
  monitor: 240,
  tool: 24,
}

/** What happens in the simulation, for whoever listens (the log) */
export type SimEvent =
  | { type: 'request'; link: Link; failed: boolean }
  /** docker stop, docker start, and the started container is up */
  | { type: 'stop' | 'start' | 'up'; container: Container }

/** Takes requests: running, and not paused */
export const isUp = (c: Container) => c.state === 'running'

export class ContainersSimulation {
  speed = 1
  paused = false
  /** Seconds since the start */
  time = 0
  /** Requests per second, all environments, smoothed */
  rps = 0
  /** Failed requests per second, smoothed */
  eps = 0
  totalRequests = 0
  totalErrors = 0
  /** Called for each request that arrives (or fails) and each container stopped, started or up */
  onEvent?: (e: SimEvent) => void

  private arrivals = 0
  private failures = 0
  private bucket = 0
  private rising = new Set<Container | Volume>()

  constructor(
    readonly model: ContainersModel,
    private readonly random: () => number = Math.random,
  ) {
    // spread the first flows out, so the links don't start in step
    for (const l of model.links) l.timer = this.random() / (l.rate * TRAFFIC)
    for (const c of model.containers) {
      c.mem = isUp(c) ? BASE_MEM[c.kind] * (0.7 + this.random() * 0.6) : 0
      c.cpu = isUp(c) ? BASE_CPU[c.kind] : 0
    }
  }

  /** Stop a container (docker stop) */
  stop(c: Container) {
    if (c.state === 'exited' || c.state === 'dead') return
    c.state = 'exited'
    c.exitCode = 0
    c.transition = STOP_SECONDS
    this.onEvent?.({ type: 'stop', container: c })
  }

  /** Start a container; it takes a moment to come up */
  start(c: Container) {
    if (c.state === 'running') return
    c.state = 'restarting'
    c.exitCode = undefined
    c.transition = START_SECONDS
    this.onEvent?.({ type: 'start', container: c })
  }

  step(seconds: number) {
    const { model } = this
    // a glow eases in (~0.2 s) and fades out slowly (~1.2 s), so it never blinks
    // ripples and sparks age in real time, also while paused, so they finish
    for (const c of model.containers) {
      if (c.sparks.length)
        c.sparks = c.sparks.map((a) => a + seconds).filter((a) => a < EVENT_SECONDS)
    }
    for (const x of [...model.containers, ...model.volumes]) {
      if (this.rising.has(x)) {
        x.flash = Math.min(1, x.flash + seconds * 5)
        if (x.flash >= 1) this.rising.delete(x)
      } else x.flash = Math.max(0, x.flash - seconds * 0.8)
    }
    if (this.paused) return
    const dt = seconds * this.speed
    this.time += dt

    for (const c of model.containers) this.stepContainer(c, dt)
    for (const l of model.links) this.stepLink(l, dt)

    this.bucket += dt
    if (this.bucket >= 0.5) {
      this.rps = this.rps * 0.5 + (this.arrivals / this.bucket) * 0.5
      this.eps = this.eps * 0.5 + (this.failures / this.bucket) * 0.5
      this.arrivals = 0
      this.failures = 0
      this.bucket = 0
    }
  }

  private stepContainer(c: Container, dt: number) {
    if (c.transition > 0) {
      c.transition = Math.max(0, c.transition - dt)
      if (c.transition === 0 && c.state === 'restarting') {
        c.state = 'running'
        this.onEvent?.({ type: 'up', container: c })
      }
    }
    const up = isUp(c)
    // cpu follows the load smoothly; memory drifts slowly
    const load = up ? BASE_CPU[c.kind] + c.flash * 22 : 0
    c.cpu += (load - c.cpu) * Math.min(1, dt * 0.8)
    const mem = up ? BASE_MEM[c.kind] * (1 + 0.15 * Math.sin(this.time * 0.07 + c.name.length)) : 0
    c.mem += (mem - c.mem) * Math.min(1, dt * (up ? 0.6 : 3))
  }

  private stepLink(l: Link, dt: number) {
    const length = linkLength(l)
    const step = (dt * PULSE_SPEED) / length
    // the head arrives at 1; the pulse lives on until its tail has drained in too
    const end = 1 + TAIL / length
    for (const p of l.pulses) {
      p.t += step
      if (!p.arrived && p.t >= 1) {
        p.arrived = true
        this.arrive(l, p)
      }
    }
    if (l.pulses.some((p) => p.t >= end)) l.pulses = l.pulses.filter((p) => p.t < end)

    // new flows at a steady rate, with a little jitter
    const active =
      l.kind === 'ingress' ? true : l.kind === 'mount' ? isUp(l.to) : !!l.from && isUp(l.from)
    if (!active) return
    l.timer -= dt
    if (l.timer > 0) return
    l.timer = (0.85 + this.random() * 0.3) / (l.rate * TRAFFIC)
    if (l.pulses.length >= MAX_PULSES) return
    if (l.kind === 'mount') {
      // databases write more than they read
      const write = this.random() < (l.to.kind === 'database' ? 0.6 : 0.4)
      l.pulses.push({ t: 0, back: !write, failed: false, arrived: false })
    } else l.pulses.push({ t: 0, back: false, failed: !isUp(l.to), arrived: false })
  }

  private arrive(l: Link, p: Pulse) {
    if (l.kind === 'mount') {
      const v = l.volume!
      this.rising.add(v)
      if (p.back) v.reads++
      else v.writes++
      return
    }
    if (p.failed || !isUp(l.to)) {
      p.failed = true
      if (l.to.sparks.length < 3) l.to.sparks.push(0)
      l.to.errors++
      this.totalErrors++
      this.failures++
      this.onEvent?.({ type: 'request', link: l, failed: true })
      return
    }
    l.to.requests++
    this.totalRequests++
    this.arrivals++
    this.rising.add(l.to)
    if (l.network) l.network.packets++
    this.onEvent?.({ type: 'request', link: l, failed: false })
  }
}

/**
 * Where the flows of a link are: the distance (cells) of each head along the link, from its start;
 * a read flows back from the end. Heads past the end are draining into the target.
 */
export function pulseDistances(l: Link): Array<{ d: number; pulse: Pulse }> {
  const length = linkLength(l)
  return l.pulses.map((pulse) => ({ d: (pulse.back ? 1 - pulse.t : pulse.t) * length, pulse }))
}
