/**
 * The advisor of the 'isocontainers' world: checks of what docker knows about each container (its
 * image, ports, mounts, restart policy, limits, user) against good practice, as quests. Each piece of
 * advice says what is wrong, why it matters, and how to fix it in a compose file; some can be tried
 * out in the view. The advice adds up to a rating of each host, from none to five stars.
 *
 * A container can opt out of checks with a label: `isocontainers.advisor.ignore: latest-tag,root-user`.
 */
import { imageRepository, normalizeImage } from './isocontainers.styles.ts'
import { isPublished } from './isocontainers.layout.ts'
import type {
  Container,
  ContainerKind,
  ContainersModel,
  Environment,
  Volume,
} from './isocontainers.types.ts'

export type Severity = 'risk' | 'warn' | 'tip'

export type CheckId =
  | 'data-without-volume'
  | 'anonymous-data'
  | 'public-datastore'
  | 'docker-socket'
  | 'privileged'
  | 'oom-killed'
  | 'latest-tag'
  | 'no-restart'
  | 'no-healthcheck'
  | 'no-memory-limit'
  | 'root-user'
  | 'unused-volume'

export type Advice = {
  /** Unique: the target's key and the check */
  id: string
  check: CheckId
  severity: Severity
  target: Container | Volume
  title: string
  /** Why it matters */
  detail: string
  /** What to change in the compose file */
  fix: string
  /** It can be tried out in the view (see applyFix) */
  fixable: boolean
}

/** What a piece of advice costs the rating */
export const POINTS: Record<Severity, number> = { risk: 8, warn: 4, tip: 1 }

export const SEVERITY_LABELS: Record<Severity, string> = {
  risk: 'Risk',
  warn: 'Warning',
  tip: 'Tip',
}

export const IGNORE_LABEL = 'isocontainers.advisor.ignore'

/** Kinds that keep data that must survive the container */
const STATEFUL: ContainerKind[] = ['database', 'queue', 'storage']
/** Kinds that should never be reachable from everywhere */
const DATASTORES: ContainerKind[] = ['database', 'cache', 'queue', 'storage']

/** Where well known images keep their data */
const DATA_PATHS: Array<[RegExp, string]> = [
  [/postgres|postgis|timescale/, '/var/lib/postgresql/data'],
  [/mysql|mariadb/, '/var/lib/mysql'],
  [/mongo/, '/data/db'],
  [/rabbitmq/, '/var/lib/rabbitmq'],
  [/elasticsearch/, '/usr/share/elasticsearch/data'],
  [/opensearch/, '/usr/share/opensearch/data'],
  [/redis|valkey|minio/, '/data'],
]

const HEALTH_TESTS: Array<[RegExp, string]> = [
  [/postgres|postgis|timescale|pgbouncer/, '["CMD-SHELL", "pg_isready -U postgres"]'],
  [/mysql|mariadb/, '["CMD", "mysqladmin", "ping", "-h", "localhost"]'],
  [/redis|valkey/, '["CMD", "redis-cli", "ping"]'],
  [/mongo/, '["CMD", "mongosh", "--quiet", "--eval", "db.adminCommand(\'ping\')"]'],
  [/rabbitmq/, '["CMD", "rabbitmq-diagnostics", "-q", "ping"]'],
]

const MEMORY: Partial<Record<ContainerKind, string>> = {
  database: '1g',
  storage: '1g',
  queue: '512m',
  cache: '256m',
  proxy: '128m',
  web: '256m',
  tool: '128m',
}

const find = (table: Array<[RegExp, string]>, image: string) =>
  table.find(([re]) => re.test(imageRepository(image)))?.[1]

/** It is meant to keep running: not a tool, not a one-off job that is done */
const isService = (c: Container) => c.kind !== 'tool' && !(c.state === 'exited' && c.exitCode === 0)

/** The image tag: undefined when there is none (docker takes 'latest') */
export function imageTag(image: string): string | undefined {
  const name = normalizeImage(image)
  const slash = name.lastIndexOf('/')
  const colon = name.lastIndexOf(':')
  return colon > slash ? name.slice(colon + 1) : undefined
}

/** Built from the compose file (no registry, named project-service): there is no tag to pin */
const isLocalBuild = (c: Container) =>
  !!c.project && !!c.service && imageRepository(c.image) === `${c.project}-${c.service}`

const isSocket = (source: string) => /(^|\/)docker\.sock$/.test(source)

const ignored = (c: Container) =>
  new Set(
    (c.labels[IGNORE_LABEL] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  )

/** The advice for a container */
export function adviseContainer(c: Container): Advice[] {
  const out: Advice[] = []
  const skip = ignored(c)
  const add = (
    check: CheckId,
    severity: Severity,
    title: string,
    detail: string,
    fix: string,
    fixable = false,
  ) => {
    if (!skip.has(check))
      out.push({ id: `${c.key}:${check}`, check, severity, target: c, title, detail, fix, fixable })
  }
  const service = c.service ?? c.name
  const dataPath = find(DATA_PATHS, c.image) ?? '/data'

  if (STATEFUL.includes(c.kind)) {
    const data = c.mounts.filter((m) => m.type !== 'tmpfs')
    if (!data.length)
      add(
        'data-without-volume',
        'risk',
        'Its data lives in the container',
        `${c.name} keeps its data in the container's own layer: a docker rm, or an update to a new image, deletes it.`,
        `services:\n  ${service}:\n    volumes:\n      - ${service}-data:${dataPath}\nvolumes:\n  ${service}-data:`,
      )
    else if (data.every((m) => m.volume?.anonymous))
      add(
        'anonymous-data',
        'warn',
        'Its data is in an anonymous volume',
        'An anonymous volume has only a random name: easy to lose with docker compose down -v or a volume prune, and hard to find for a backup.',
        `services:\n  ${service}:\n    volumes:\n      - ${service}-data:${data[0].target}\nvolumes:\n  ${service}-data:`,
      )
  }

  if (DATASTORES.includes(c.kind)) {
    const open = c.ports.filter((p) => isPublished(p) && !p.local)
    if (open.length)
      add(
        'public-datastore',
        'risk',
        `Port ${open.map((p) => p.hostPort).join(', ')} is open to everyone`,
        `The ${c.kind} is published on all interfaces of the host: anyone who can reach the host can try to log in. Containers on its network reach it without a published port.`,
        `services:\n  ${service}:\n    ports:\n${open.map((p) => `      - "127.0.0.1:${p.hostPort}:${p.port}"`).join('\n')}`,
        true,
      )
  }

  const socket = c.mounts.find((m) => m.type === 'bind' && isSocket(m.source))
  if (socket)
    add(
      'docker-socket',
      socket.readOnly ? 'warn' : 'risk',
      socket.readOnly ? 'The docker socket is mounted (read-only)' : 'The docker socket is mounted',
      'Whoever takes over this container controls docker, and so the host. Read-only still lets it read every secret in the environment of every container.',
      'Put a socket proxy in between that allows only what it needs, e.g. tecnativa/docker-socket-proxy with CONTAINERS=1, and point the container at it instead of the socket.',
      !socket.readOnly,
    )

  if (c.privileged)
    add(
      'privileged',
      'risk',
      'It runs privileged',
      'A privileged container has every capability and every device of the host: it is root on the host.',
      `services:\n  ${service}:\n    privileged: false\n    cap_add: [] # only the capabilities it needs`,
      true,
    )

  if (c.state === 'exited' && c.exitCode === 137)
    add(
      'oom-killed',
      'risk',
      'It was killed (exit code 137)',
      c.memory
        ? `Exit code 137 is a SIGKILL, usually the kernel's out-of-memory killer: ${c.memory} is not enough.`
        : 'Exit code 137 is a SIGKILL, usually the out-of-memory killer, or a docker kill.',
      `services:\n  ${service}:\n    deploy:\n      resources:\n        limits:\n          memory: ${c.memory ? 'twice as much' : '512m'}\n    restart: unless-stopped`,
    )

  const tag = imageTag(c.image)
  if (!c.image.includes('@') && (!tag || tag === 'latest') && !isLocalBuild(c))
    add(
      'latest-tag',
      'warn',
      tag ? 'It runs the latest tag' : 'Its image has no tag',
      "'latest' is whatever was pushed last: a pull can bring a new major version, and two hosts can run different code under one name.",
      `services:\n  ${service}:\n    image: ${imageRepository(c.image)}:<version>`,
    )

  if (isService(c) && (!c.restart || c.restart === 'no'))
    add(
      'no-restart',
      'warn',
      'No restart policy',
      'When it crashes, or the host reboots, it stays down until someone starts it.',
      `services:\n  ${service}:\n    restart: unless-stopped`,
      true,
    )

  if (isService(c) && !c.health && c.healthcheck !== true)
    add(
      'no-healthcheck',
      'tip',
      'No health check',
      'Docker only knows that the process runs, not that it answers. Nothing can wait for it to be ready (depends_on: condition: service_healthy).',
      `services:\n  ${service}:\n    healthcheck:\n      test: ${find(HEALTH_TESTS, c.image) ?? '["CMD", "wget", "-q", "--spider", "http://localhost/health"]'}\n      interval: 10s\n      retries: 3`,
      true,
    )

  if (isService(c) && !c.memory)
    add(
      'no-memory-limit',
      'tip',
      'No memory limit',
      'A leak in one container can take the memory of every other container on the host.',
      `services:\n  ${service}:\n    deploy:\n      resources:\n        limits:\n          memory: ${MEMORY[c.kind] ?? '512m'}`,
      true,
    )

  if (c.user === 'root' || c.user === '0' || c.user?.startsWith('0:'))
    add(
      'root-user',
      'tip',
      'It runs as root',
      'Root in the container is root on the host when something breaks out; most images work as a plain user.',
      `services:\n  ${service}:\n    user: "1000:1000"`,
      true,
    )
  return out
}

export function adviseVolume(v: Volume): Advice[] {
  if (v.mounts.length) return []
  return [
    {
      id: `${v.key}:unused-volume`,
      check: 'unused-volume',
      severity: 'tip',
      target: v,
      title: 'Nothing uses it',
      detail:
        'No container mounts this volume. If its data is not needed any more, it only takes space.',
      fix: `docker volume rm ${v.name}`,
      fixable: false,
    },
  ]
}

const ORDER: Record<Severity, number> = { risk: 0, warn: 1, tip: 2 }

/** All advice, the worst first */
export function advise(model: ContainersModel): Advice[] {
  return [
    ...model.containers.flatMap(adviseContainer),
    ...model.volumes.flatMap(adviseVolume),
  ].sort((a, b) => ORDER[a.severity] - ORDER[b.severity])
}

export type Rating = {
  /** 0..100 */
  score: number
  /** 0..5, in halves */
  stars: number
  open: number
}

/**
 * The rating of a host (or of everything): what the open advice costs, against what all containers
 * could lose (each container counts sixteen points). Accepted advice costs half.
 */
export function rate(
  advice: Advice[],
  containers: number,
  accepted: ReadonlySet<string> = new Set(),
): Rating {
  const penalty = advice.reduce(
    (sum, a) => sum + POINTS[a.severity] * (accepted.has(a.id) ? 0.5 : 1),
    0,
  )
  const basis = Math.max(1, containers) * 16
  const score = Math.round(100 * Math.max(0, 1 - penalty / basis))
  return {
    score,
    stars: Math.round(score / 10) / 2,
    open: advice.filter((a) => !accepted.has(a.id)).length,
  }
}

export const envOf = (a: Advice): Environment => a.target.env

/**
 * Try a fix in the view (nothing changes on the host): returns whether it applied. Fixes that need a
 * decision (a version, a volume, a proxy) are only described.
 */
export function applyFix(a: Advice, model: ContainersModel): boolean {
  if (!a.fixable || a.target.type !== 'container') return false
  const c = a.target
  switch (a.check) {
    case 'public-datastore': {
      for (const p of c.ports)
        if (isPublished(p) && !p.local) {
          p.hostIp = '127.0.0.1'
          p.local = true
        }
      // nothing comes in through the gate any more
      const ingress = new Set(c.in.filter((l) => l.kind === 'ingress'))
      c.in = c.in.filter((l) => !ingress.has(l))
      model.links = model.links.filter((l) => !ingress.has(l))
      return true
    }
    case 'docker-socket':
      for (const m of c.mounts) if (m.type === 'bind' && isSocket(m.source)) m.readOnly = true
      return true
    case 'privileged':
      c.privileged = false
      return true
    case 'no-restart':
      c.restart = 'unless-stopped'
      return true
    case 'no-healthcheck':
      c.healthcheck = true
      if (c.state === 'running') c.health = 'healthy'
      return true
    case 'no-memory-limit':
      c.memory = (MEMORY[c.kind] ?? '512m').replace(/m$/, ' MiB').replace(/g$/, ' GiB')
      return true
    case 'root-user':
      c.user = '1000:1000'
      return true
    default:
      return false
  }
}
