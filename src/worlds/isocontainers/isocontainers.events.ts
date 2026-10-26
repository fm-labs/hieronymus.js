/**
 * The live engine events of the 'isocontainers' world: the API streams each host's docker events
 * (GET /containers/{alias}/events/stream, one JSON event a line), and each becomes a line of the log.
 *
 * `engineLine()` is pure: an event as Docker sends it, and the host it came from, give the line (or
 * none, for the noise). `EngineEvents` reads the stream of one host, and connects again when it
 * ends or fails, a bit later each time.
 *
 * The events change the city too: `applyEngineState()` sets the state of a container on the map
 * (start, die, stop, pause, unpause, health_status), and `LiveChanges` gathers the containers that
 * came (create) and went (destroy), and has the world rebuilt from the changed spec.
 */
import { fromInspect } from './isocontainers.import.ts'
import type { LogInput, LogLevel } from './isocontainers.log.ts'
import { STOP_SECONDS } from './isocontainers.sim.ts'
import type {
  Container,
  ContainerSpec,
  ContainersSpec,
  Environment,
} from './isocontainers.types.ts'

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

/** A docker event, as GET /events streams it */
export type DockerEvent = {
  Type?: string
  Action?: string
  Actor?: { ID?: string; Attributes?: Record<string, string> }
  time?: number
  timeNano?: number
}

/** Actions that say little: left out of the log */
const QUIET = new Set([
  'exec_create',
  'exec_detach',
  'attach',
  'detach',
  'resize',
  'top',
  'archive-path',
])

const short = (id?: string) => (id && /^[0-9a-f]{64}$/.test(id) ? id.slice(0, 12) : id)

/** The container of an id (or of a name) on the host, if it was there when the stack loaded */
export function findContainer(env: Environment, id?: string, name?: string): Container | undefined {
  if (!id && !name) return undefined
  return env.containers.find((c) => (id && c.id === id) || (name && c.name === name))
}

/**
 * The line of a docker event on a host; undefined for the noise. `names` remembers the container
 * names seen in container events, by id, so the network and volume events of a container that came
 * after the load are named too.
 */
export function engineLine(
  e: DockerEvent,
  env: Environment,
  names?: Map<string, string>,
): LogInput | undefined {
  const type = e.Type ?? 'event'
  const full = e.Action ?? ''
  // 'exec_start: redis-cli ping', 'health_status: healthy': the action, then what it is about
  const [action, ...rest] = full.split(': ')
  const detail = rest.join(': ')
  if (!action || QUIET.has(action)) return undefined
  const attrs = e.Actor?.Attributes ?? {}
  const id = e.Actor?.ID
  const time = e.timeNano ? Math.round(e.timeNano / 1e6) : e.time ? e.time * 1000 : undefined
  const line = (level: LogLevel, text: string, c?: Container, actor?: string): LogInput => ({
    source: 'engine',
    level,
    host: env.key,
    key: c?.key,
    actor: c?.name ?? actor,
    text,
    time,
  })

  if (type === 'container') {
    if (id && attrs.name) names?.set(id, attrs.name)
    const c = findContainer(env, id, attrs.name)
    const actor = attrs.name ?? short(id)
    const exit = Number(attrs.exitCode ?? 0)
    switch (action) {
      case 'start':
        return line('info', `container start image=${attrs.image ?? c?.image ?? '?'}`, c, actor)
      case 'die':
        return line(exit ? 'error' : 'warn', `container die exitCode=${exit}`, c, actor)
      case 'kill':
        return line('warn', `container kill signal=${attrs.signal ?? '?'}`, c, actor)
      case 'oom':
        return line('error', 'container oom: out of memory', c, actor)
      case 'health_status':
        return line(detail === 'unhealthy' ? 'warn' : 'info', `health_status: ${detail}`, c, actor)
      case 'exec_start':
        return line('debug', `exec_start: ${detail}`, c, actor)
      case 'exec_die':
        // a health check or exec that worked says nothing
        return exit ? line('warn', `exec_die exitCode=${exit}`, c, actor) : undefined
      case 'rename':
        return line(
          'info',
          `container rename ${attrs.oldName?.replace(/^\//, '') ?? '?'} → ${actor}`,
          c,
          actor,
        )
      default:
        return line('info', `container ${full}`, c, actor)
    }
  }
  if (type === 'network') {
    // connect / disconnect name the container by id, and the network by name
    const c = findContainer(env, attrs.container)
    const network = attrs.name ?? short(id) ?? '?'
    if (attrs.container)
      return line(
        'info',
        `network ${action} ${network}`,
        c,
        c ? undefined : names?.get(attrs.container) ?? short(attrs.container),
      )
    return line('info', `network ${action} ${network}`, undefined, `network ${network}`)
  }
  if (type === 'volume') {
    const volume = short(id) ?? '?'
    if (attrs.container) {
      const c = findContainer(env, attrs.container)
      const to = attrs.destination ? ` → ${attrs.destination}` : ''
      return line(
        'info',
        `volume ${action} ${volume}${to}`,
        c,
        c ? undefined : names?.get(attrs.container) ?? short(attrs.container),
      )
    }
    return line('info', `volume ${action} ${volume}`, undefined, `volume ${volume}`)
  }
  if (type === 'image')
    return line(
      action === 'delete' ? 'warn' : 'info',
      `image ${action} ${attrs.name ?? short(id) ?? ''}`.trim(),
      undefined,
      'images',
    )
  return line('info', `${type} ${full} ${attrs.name ?? short(id) ?? ''}`.trim(), undefined, type)
}

/** The part of the simulation that starts and stops containers */
export type StateSim = { start(c: Container): void; stop(c: Container): void }

/**
 * Set a container's state from its engine event; returns whether it changed. A start rises out of
 * the ground like a start in the view; a die falls dark.
 */
export function applyEngineState(c: Container, e: DockerEvent, sim: StateSim): boolean {
  const [action, ...rest] = (e.Action ?? '').split(': ')
  const detail = rest.join(': ')
  const attrs = e.Actor?.Attributes ?? {}
  switch (action) {
    case 'start':
      if (c.state === 'running' || c.state === 'restarting') return false
      sim.start(c)
      if (c.healthcheck) c.health = 'starting'
      return true
    case 'die': {
      const exitCode = Number(attrs.exitCode ?? 0)
      if (c.state === 'exited' && c.exitCode === exitCode) return false
      c.state = 'exited'
      c.exitCode = exitCode
      c.transition = STOP_SECONDS
      c.health = undefined
      return true
    }
    case 'stop':
      // after the die; a stop without one (e.g. a missed event) still stops it
      if (c.state === 'exited' || c.state === 'dead' || c.state === 'created') return false
      sim.stop(c)
      return true
    case 'pause':
      if (c.state !== 'running') return false
      c.state = 'paused'
      return true
    case 'unpause':
      if (c.state !== 'paused') return false
      c.state = 'running'
      return true
    case 'health_status':
      if (detail !== 'healthy' && detail !== 'unhealthy' && detail !== 'starting') return false
      if (c.health === detail) return false
      c.health = detail
      return true
    default:
      return false
  }
}

/** The container actions that tell of a container: one the map doesn't have yet is fetched */
const SEEN = new Set([
  'create',
  'start',
  'restart',
  'die',
  'stop',
  'pause',
  'unpause',
  'health_status',
])

export type LiveChangesOptions = {
  /** The live spec: changed in place (its environments' containers) */
  spec: ContainersSpec
  /** `docker inspect` of a container on a host (alias), or undefined when it is gone */
  inspect: (alias: string, id: string) => Promise<unknown>
  /** The spec changed: build the world again (the state events that came meanwhile are replayed) */
  rebuild: (spec: ContainersSpec) => void
  /** The containers of a host on the map now (they change with each rebuild) */
  environment: (name: string) => Environment | undefined
  sim: () => StateSim
  /** A container's state changed */
  changed?: (c: Container) => void
  /** Wait this long after the last change, so a `compose up` is one rebuild (ms) */
  delay?: number
}

/**
 * The containers that come and go on the live hosts. A create (or any event of a container the map
 * doesn't have, e.g. one that was restarting when the stack loaded) is inspected and added to the
 * spec; a destroy takes it out. A while after the last change the world is rebuilt once.
 */
export class LiveChanges {
  /** Containers to add: id → host alias and environment name */
  private readonly creates = new Map<string, { alias: string; name: string }>()
  /** Containers to take out: id → environment name */
  private readonly removes = new Map<string, string>()
  /**
   * The events of containers not on the map yet, in order: replayed once they are (the inspect may
   * be older than them, e.g. from the API's cache)
   */
  private pending: Array<{ name: string; e: DockerEvent }> = []
  private timer?: ReturnType<typeof setTimeout>
  private fetching = false
  private closed = false

  constructor(private readonly options: LiveChangesOptions) {}

  /** An event of a host (its alias, and the name of its environment) */
  event(alias: string, name: string, e: DockerEvent) {
    if (e.Type !== 'container' || !e.Actor?.ID) return
    const id = e.Actor.ID
    const action = (e.Action ?? '').split(': ')[0]
    const env = this.options.environment(name)
    const c = env?.containers.find((x) => x.id === id)
    if (action === 'destroy') {
      this.pending.push({ name, e })
      this.creates.delete(id)
      if (c || this.spec(name)?.containers?.some((s) => s.id === id)) this.removes.set(id, name)
      this.schedule()
      return
    }
    if (c) {
      if (applyEngineState(c, e, this.options.sim())) this.options.changed?.(c)
      return
    }
    if (!SEEN.has(action)) return
    this.pending.push({ name, e })
    if (!this.creates.has(id)) {
      this.creates.set(id, { alias, name })
      this.schedule()
    }
  }

  close() {
    this.closed = true
    clearTimeout(this.timer)
  }

  private spec(name: string) {
    return this.options.spec.environments.find((e) => (e.name || '') === name)
  }

  private schedule() {
    clearTimeout(this.timer)
    // while fetching, the next round waits for this one (it schedules itself after)
    if (this.fetching) return
    this.timer = setTimeout(() => void this.flush(), this.options.delay ?? 600)
  }

  /** Inspect the new containers, change the spec, rebuild, then replay their events */
  async flush() {
    if (this.closed || (!this.creates.size && !this.removes.size)) return
    const creates = [...this.creates]
    const removes = [...this.removes]
    this.creates.clear()
    this.removes.clear()
    this.fetching = true
    const added = await Promise.all(
      creates.map(async ([id, { alias, name }]) => {
        const inspect = await this.options.inspect(alias, id).catch(() => undefined)
        const spec = inspect
          ? fromInspect([inspect as Record<string, unknown>]).containers?.[0]
          : undefined
        return spec && { name, spec }
      }),
    )
    this.fetching = false
    if (this.closed) return
    const destroyed = new Set(
      this.pending.filter((p) => p.e.Action === 'destroy').map((p) => p.e.Actor!.ID!),
    )
    let changed = false
    for (const [id, name] of removes) {
      const env = this.spec(name)
      if (!env?.containers) continue
      const before = env.containers.length
      env.containers = env.containers.filter((s) => s.id !== id)
      changed ||= env.containers.length !== before
    }
    for (const a of added) {
      const env = a && this.spec(a.name)
      // gone again meanwhile (e.g. docker run --rm)
      if (!a || !env || destroyed.has(a.spec.id!)) continue
      // a container of the same name (recreated by compose) is replaced
      env.containers = (env.containers ?? []).filter(
        (s) => s.id !== a.spec.id && s.name !== a.spec.name,
      )
      env.containers.push(a.spec as ContainerSpec)
      changed = true
    }
    if (changed) this.options.rebuild(this.options.spec)
    // replay the events of the containers now on the map; keep those of the next round
    const replay = this.pending
    this.pending = []
    for (const r of replay) {
      const id = r.e.Actor!.ID!
      const c = this.options.environment(r.name)?.containers.find((x) => x.id === id)
      if (c) {
        if (applyEngineState(c, r.e, this.options.sim())) this.options.changed?.(c)
      } else if (this.creates.has(id)) this.pending.push(r)
    }
    if (this.creates.size || this.removes.size) this.schedule()
  }
}

/** Reads the lines of a streamed body, one JSON value a line */
export async function readNdjson(
  body: ReadableStream<Uint8Array>,
  onValue: (value: unknown) => void,
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffered = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffered += decoder.decode(value, { stream: true })
    const lines = buffered.split('\n')
    buffered = lines.pop() ?? ''
    for (const l of lines) {
      const text = l.trim()
      if (!text) continue
      try {
        onValue(JSON.parse(text))
      } catch {
        // a line that is not JSON (e.g. a keep-alive) is skipped
      }
    }
  }
  if (buffered.trim()) {
    try {
      onValue(JSON.parse(buffered))
    } catch {
      // the stream ended in the middle of a line
    }
  }
}

export type EngineEventsOptions = {
  /** The API, e.g. '/mc-api' */
  base: string
  /** The host's alias in the API */
  alias: string
  /** Each event of the host */
  onEvent: (e: DockerEvent) => void
  /** The stream connected, or was lost (with why, and when it is tried again) */
  onStatus?: (status: { connected: boolean; error?: string; retryIn?: number }) => void
  fetchFn?: typeof fetch
}

/** The live events of one host: reads its stream, and connects again when it ends or fails */
export class EngineEvents {
  private readonly abort = new AbortController()
  private retries = 0
  private timer?: ReturnType<typeof setTimeout>

  constructor(private readonly options: EngineEventsOptions) {
    void this.connect()
  }

  /** Stop listening */
  close() {
    this.abort.abort()
    clearTimeout(this.timer)
  }

  private async connect() {
    const { base, alias, onEvent, onStatus, fetchFn = fetch } = this.options
    const url = `${base}/containers/${encodeURIComponent(alias)}/events/stream`
    let error: string
    try {
      const response = await fetchFn(url, {
        headers: { accept: 'application/x-ndjson' },
        signal: this.abort.signal,
      })
      if (!response.ok || !response.body)
        throw new Error(`${response.status} ${response.statusText}`)
      this.retries = 0
      onStatus?.({ connected: true })
      await readNdjson(response.body, (value) => {
        if (value && typeof value === 'object' && !Array.isArray(value))
          onEvent(value as Json as DockerEvent)
      })
      error = 'the stream ended'
    } catch (e) {
      if (this.abort.signal.aborted) return
      error = (e as Error).message
    }
    if (this.abort.signal.aborted) return
    // 2 s, 4 s, 8 s, … up to 30 s
    const retryIn = Math.min(30, 2 ** ++this.retries)
    onStatus?.({ connected: false, error, retryIn })
    this.timer = setTimeout(() => void this.connect(), retryIn * 1000)
  }
}
