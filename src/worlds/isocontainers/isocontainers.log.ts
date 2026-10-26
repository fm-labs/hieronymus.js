/**
 * The event log of the 'isocontainers' world: one stream of lines from the container engine (docker
 * events), from the containers (their output) and from the world itself (what you do in it). Pure, no
 * engine imports; takes `random` and `now` so tests can seed them.
 *
 * For now the lines are simulated from what the simulation does: requests arriving and failing,
 * containers stopped and started, and the states of the containers (health checks, crash loops).
 * The live stack has no simulated lines: the engine's own events (isocontainers.events.ts) write into
 * the same stream.
 */
import { moodOf } from './isocontainers.fx.ts'
import type { SimEvent } from './isocontainers.sim.ts'
import type { Container, ContainersModel, Link } from './isocontainers.types.ts'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/** Who wrote a line: the container engine, a container (its output), or the world itself */
export type LogSource = 'engine' | 'container' | 'world'

export type LogEvent = {
  /** Increasing, unique in the stream */
  id: number
  /** When, in epoch milliseconds */
  time: number
  source: LogSource
  level: LogLevel
  /** The host it happened on (its environment key) */
  host?: string
  /** The entity it is about (its key), e.g. to jump to it */
  key?: string
  /** Who wrote it or what it is about, as shown: a container's name, `network db`, … */
  actor?: string
  text: string
}

export type LogInput = Omit<LogEvent, 'id' | 'time'> & { time?: number }

/** The last lines, oldest first; listeners hear each new one */
export class LogStream {
  readonly events: LogEvent[] = []
  private nextId = 1
  private listeners = new Set<(e: LogEvent) => void>()

  constructor(
    readonly capacity = 500,
    private readonly now: () => number = Date.now,
  ) {}

  push(input: LogInput): LogEvent {
    const event: LogEvent = { ...input, id: this.nextId++, time: input.time ?? this.now() }
    this.events.push(event)
    if (this.events.length > this.capacity)
      this.events.splice(0, this.events.length - this.capacity)
    for (const listen of this.listeners) listen(event)
    return event
  }

  /** Hear each new line; returns the way to stop */
  subscribe(listen: (e: LogEvent) => void): () => void {
    this.listeners.add(listen)
    return () => this.listeners.delete(listen)
  }
}

// ---- the simulated log ----

const METHODS = ['GET', 'GET', 'GET', 'GET', 'POST', 'POST', 'PUT', 'DELETE']
const API_PATHS = [
  '/api/orders',
  '/api/users/me',
  '/api/cart',
  '/api/products',
  '/api/search',
  '/api/session',
  '/healthz',
]
const ASSETS = [
  '/',
  '/index.html',
  '/assets/app.js',
  '/assets/app.css',
  '/assets/logo.svg',
  '/favicon.ico',
]
const TABLES = ['orders', 'users', 'products', 'sessions', 'cart_items', 'payments']
const JOBS = ['email.send', 'invoice.render', 'image.resize', 'search.reindex', 'report.daily']
const TOPICS = ['orders.created', 'users.signup', 'payments.settled', 'events.audit']

/** The usual port of a kind, for containers that publish none */
const DEFAULT_PORTS: Record<Container['kind'], number> = {
  proxy: 443,
  web: 80,
  app: 8080,
  worker: 8080,
  database: 5432,
  cache: 6379,
  queue: 5672,
  storage: 9000,
  monitor: 9090,
  tool: 8080,
}

/** The port a container listens on */
export const portOf = (c: Container) => c.ports[0]?.port ?? DEFAULT_PORTS[c.kind]

/** The health check the engine runs, by kind (it shows as an `exec_start` event) */
const HEALTH_COMMANDS: Partial<Record<Container['kind'], string>> = {
  database: 'pg_isready -U postgres',
  cache: 'redis-cli ping',
  web: 'wget -qO- http://localhost/',
  app: 'curl -fs http://localhost:8080/healthz',
  proxy: 'wget -qO- http://localhost:8080/ping',
}

/**
 * Writes believable lines into a stream from the simulation: a sample of the requests (a few lines a
 * second at most, so it stays readable), every failed request (at most one a second per target), the
 * engine events of stops and starts, and now and then a health check, a failing health check or a
 * crash of the containers in trouble.
 */
export class LogSimulator {
  /** Lines a second for the traffic, at most */
  rate = 2.2
  private tokens = 1
  private failedAt = new Map<Container, number>()
  private time = 0
  private nextEngine = 1.5

  constructor(
    /** Set again when the live stack is rebuilt */
    public model: ContainersModel,
    private readonly stream: LogStream,
    private readonly random: () => number = Math.random,
  ) {}

  private pick<T>(list: T[]): T {
    return list[Math.floor(this.random() * list.length)]
  }

  private ms(base: number) {
    return Math.max(1, Math.round(base * (0.4 + this.random() * 1.6)))
  }

  private hex(n: number) {
    let out = ''
    for (let i = 0; i < n; i++) out += Math.floor(this.random() * 16).toString(16)
    return out
  }

  /** Seconds of simulation time pass */
  step(dt: number) {
    this.time += dt
    this.tokens = Math.min(3, this.tokens + dt * this.rate)
    this.nextEngine -= dt
    if (this.nextEngine <= 0) {
      this.nextEngine = 2 + this.random() * 4
      this.engineTick()
    }
  }

  /** Hear the simulation (set as its `onEvent`) */
  hear = (e: SimEvent) => {
    if (e.type === 'request') {
      if (e.failed) this.failed(e.link)
      else if (this.tokens >= 1) {
        this.tokens -= 1
        this.request(e.link)
      }
    } else if (e.type === 'stop') this.stopped(e.container)
    else if (e.type === 'start') this.started(e.container)
    else this.up(e.container)
  }

  private container(c: Container, text: string, level: LogEvent['level'] = 'info') {
    this.stream.push({
      source: 'container',
      level,
      host: c.env.key,
      key: c.key,
      actor: c.name,
      text,
    })
  }

  private engine(c: Container, text: string, level: LogEvent['level'] = 'info') {
    this.stream.push({ source: 'engine', level, host: c.env.key, key: c.key, actor: c.name, text })
  }

  /** A request arrived: the target writes its access log, in the manner of its kind */
  private request(l: Link) {
    const c = l.to
    const client = l.from
      ? l.from.attachments[0]?.ip ?? l.from.name
      : `203.0.113.${1 + Math.floor(this.random() * 250)}`
    switch (c.kind) {
      case 'proxy':
        return this.container(
          c,
          this.random() < 0.5
            ? `${client} "${this.pick(METHODS)} ${this.pick(API_PATHS)} HTTP/2.0" 200 ${this.ms(900)}B ${this.ms(24)}ms`
            : `${client} "GET ${this.pick(ASSETS)} HTTP/2.0" 200 ${this.ms(4800)}B ${this.ms(6)}ms`,
        )
      case 'web':
        return this.container(c, `GET ${this.pick(ASSETS)} 200 ${this.ms(3)}ms`)
      case 'app':
        return this.container(
          c,
          `INFO  ${this.pick(METHODS)} ${this.pick(API_PATHS)} → 200 in ${this.ms(40)}ms`,
        )
      case 'worker':
        return this.container(
          c,
          `INFO  job ${10000 + Math.floor(this.random() * 90000)} (${this.pick(JOBS)}) done in ${this.ms(220)}ms`,
        )
      case 'database':
        return this.container(
          c,
          `LOG:  duration: ${(this.ms(30) / 10).toFixed(1)} ms  statement: SELECT * FROM ${this.pick(TABLES)} WHERE id = $1`,
        )
      case 'cache':
        return this.container(
          c,
          `"${this.pick(['GET', 'GET', 'SET', 'EXPIRE'])}" "session:${this.hex(8)}"`,
        )
      case 'queue':
        return this.container(
          c,
          `published ${1 + Math.floor(this.random() * 20)} messages to ${this.pick(TOPICS)}`,
        )
      case 'storage':
        return this.container(
          c,
          `${this.pick(['PUT', 'GET', 'GET'])} /uploads/${this.hex(12)}.jpg 200 ${this.ms(30)}ms`,
        )
      case 'monitor':
        return this.container(
          c,
          `scrape ok target=${l.from?.name ?? 'node'}:9100 series=${200 + Math.floor(this.random() * 900)}`,
        )
      default:
        return this.container(c, `ok ${this.ms(5)}ms`)
    }
  }

  /** A request failed: the caller (or the host's proxy) writes the error, once a second per target */
  private failed(l: Link) {
    const target = l.to
    const last = this.failedAt.get(target)
    if (last !== undefined && this.time - last < 1) return
    this.failedAt.set(target, this.time)
    const port = portOf(target)
    if (l.from)
      this.container(
        l.from,
        `ERROR upstream ${target.name}:${port}: connect: connection refused`,
        'error',
      )
    else
      this.stream.push({
        source: 'engine',
        level: 'error',
        host: target.env.key,
        key: target.key,
        actor: 'gate',
        text: `"GET / HTTP/1.1" 502 · ${target.name} is down`,
      })
  }

  private stopped(c: Container) {
    this.engine(c, 'container kill signal=SIGTERM')
    this.engine(c, 'container die exitCode=0', 'warn')
    for (const a of c.attachments) this.engine(c, `network disconnect ${a.network.name}`)
    this.engine(c, 'container stop')
  }

  private started(c: Container) {
    for (const a of c.attachments) this.engine(c, `network connect ${a.network.name}`)
    for (const m of c.mounts) if (m.volume) this.engine(c, `volume mount ${m.volume.name}`)
    this.engine(c, `container start image=${c.image}`)
  }

  private up(c: Container) {
    const ready: Partial<Record<Container['kind'], string>> = {
      database: 'LOG:  database system is ready to accept connections',
      cache: 'Ready to accept connections tcp',
      proxy: 'server started, serving on :443',
      web: 'start worker processes',
      app: `INFO  listening on :${portOf(c)}`,
      worker: 'INFO  connected to the queue, waiting for jobs',
      queue: 'started, accepting connections',
    }
    this.container(c, ready[c.kind] ?? 'started')
    if (c.healthcheck || c.health) this.engine(c, 'health_status: healthy')
  }

  /** Now and then: a health check runs, one fails, or a container in a crash loop dies again */
  private engineTick() {
    const containers = this.model.containers
    if (!containers.length) return
    const troubled = containers.filter((c) => {
      const mood = moodOf(c)
      return mood === 'unhealthy' || mood === 'crashloop'
    })
    if (troubled.length && this.random() < 0.45) {
      const c = this.pick(troubled)
      if (moodOf(c) === 'crashloop') {
        this.container(c, 'FATAL  cannot connect: authentication failed', 'error')
        this.engine(c, 'container die exitCode=1', 'error')
        this.engine(c, 'container restart', 'warn')
      } else this.engine(c, 'health_status: unhealthy', 'warn')
      return
    }
    const checked = containers.filter((c) => c.state === 'running' && (c.healthcheck || c.health))
    if (!checked.length) return
    const c = this.pick(checked)
    this.engine(c, `exec_start: ${HEALTH_COMMANDS[c.kind] ?? 'healthcheck'}`, 'debug')
  }
}
