/**
 * Loads the environments from the mission-control (mc) API. Pure apart from the fetch it is given,
 * so tests can pass a fake API.
 *
 * The API serves the docker data of each container host as the Docker Engine returns it: the
 * containers fully inspected, networks and volumes as listed, and the disk usage (`df`), which has
 * the volume sizes. That is what `fromInspect()` reads, so a host becomes an EnvironmentSpec here and
 * the rest of the world doesn't know where the data came from.
 *
 * In development the Vite dev server proxies /mc-api to the API and adds its key (see vite.config.ts
 * and .env.example), so the browser never sees the key.
 */
import { formatBytes, fromInspect } from './isocontainers.import.ts'
import type { ContainersSpec, EngineSpec, EnvironmentSpec } from './isocontainers.types.ts'

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

/** The API through the Vite dev proxy */
export const API_BASE = '/mc-api'

/** GET a path of the API (e.g. '/containers/hosts') and return its JSON */
export type ApiGet = (path: string) => Promise<unknown>

/** A container host, as GET /containers/hosts lists it */
export type ApiHost = {
  id: string
  name?: string
  connected?: boolean
  properties?: { engine?: string; url?: string; autoconnect?: boolean }
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** How long a request may take before it is given up (an unreachable node takes ~15 s to fail) */
export const API_TIMEOUT_MS = 10_000

/** An ApiGet on fetch, with errors that say what to do; a request is given up after `timeoutMs` */
export function apiGet(
  base = API_BASE,
  fetchFn: typeof fetch = fetch,
  timeoutMs = API_TIMEOUT_MS,
): ApiGet {
  return async (path) => {
    const url = `${base}${path}`
    const signal = AbortSignal.timeout(timeoutMs)
    const timedOut = () => new ApiError(`${url}: no answer in ${timeoutMs / 1000} s`, 504)
    let response: Response
    try {
      response = await fetchFn(url, { headers: { accept: 'application/json' }, signal })
    } catch (e) {
      if (signal.aborted) throw timedOut()
      throw new ApiError(`${url}: the API is not reachable (${(e as Error).message})`)
    }
    if (response.status === 401 || response.status === 403)
      throw new ApiError(
        `${url}: the API refused the key (${response.status}); set MC_API_KEY in .env.local`,
        response.status,
      )
    if (!response.ok) {
      // the API answers with a problem: { error, status, detail }
      const problem = (await response.json().catch(() => undefined)) as Json | undefined
      throw new ApiError(
        `${url}: ${response.status} ${problem?.detail ?? problem?.error ?? response.statusText}`,
        response.status,
      )
    }
    // without the dev proxy, the dev server answers with the app's index.html
    if (!response.headers.get('content-type')?.includes('json'))
      throw new ApiError(`${url}: no API here (is the Vite dev proxy for ${base} running?)`)
    try {
      return await response.json()
    } catch (e) {
      if (signal.aborted) throw timedOut()
      throw e
    }
  }
}

const isRecord = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v)
const list = (v: unknown): Json[] => (Array.isArray(v) ? v.filter(isRecord) : [])

/** The small caption of a host's plate, from `docker info`: 'docker-desktop · docker 29.9.2 · 16 CPUs · 18 GiB' */
export function hostCaption(info: unknown, containers: number): string {
  if (!isRecord(info)) return `${containers} containers`
  const parts = [
    info.Name,
    info.ServerVersion && `docker ${info.ServerVersion}`,
    info.NCPU && `${info.NCPU} CPUs`,
    info.MemTotal && formatBytes(info.MemTotal),
  ]
  return parts.filter(Boolean).join(' · ') || `${containers} containers`
}

const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

/**
 * The host's side pane facts, from `docker info` and the API's host entry. What docker doesn't say
 * is left out; without info, only the engine and its address are known.
 */
export function engineInfo(info: unknown, host?: ApiHost): EngineSpec {
  const engine: EngineSpec = {
    engine: text(host?.properties?.engine) ?? 'docker',
    address: text(host?.properties?.url),
  }
  if (isRecord(info)) {
    const swarm = isRecord(info.Swarm) ? text(info.Swarm.LocalNodeState) : undefined
    Object.assign(engine, {
      version: text(info.ServerVersion),
      hostname: text(info.Name),
      os: text(info.OperatingSystem),
      kernel: text(info.KernelVersion),
      arch: text(info.Architecture),
      cpus: typeof info.NCPU === 'number' ? info.NCPU : undefined,
      memory: formatBytes(info.MemTotal),
      storageDriver: text(info.Driver),
      loggingDriver: text(info.LoggingDriver),
      cgroup:
        [text(info.CgroupDriver), info.CgroupVersion && `v${info.CgroupVersion}`]
          .filter(Boolean)
          .join(' · ') || undefined,
      runtime: text(info.DefaultRuntime),
      rootDir: text(info.DockerRootDir),
      images: typeof info.Images === 'number' ? info.Images : undefined,
      swarm: swarm && (info.Swarm.ControlAvailable ? `${swarm} · manager` : swarm),
      firewall: isRecord(info.FirewallBackend) ? text(info.FirewallBackend.Driver) : undefined,
      ipForwarding: typeof info.IPv4Forwarding === 'boolean' ? info.IPv4Forwarding : undefined,
      httpProxy: text(info.HttpProxy),
      httpsProxy: text(info.HttpsProxy),
      noProxy: text(info.NoProxy),
      warnings: Array.isArray(info.Warnings)
        ? info.Warnings.filter((w): w is string => typeof w === 'string')
        : undefined,
    } satisfies EngineSpec)
  }
  // no undefined keys: the spec stays small and compares cleanly
  for (const key of Object.keys(engine) as Array<keyof EngineSpec>) {
    const value = engine[key]
    if (value === undefined || (Array.isArray(value) && !value.length)) delete engine[key]
  }
  return engine
}

/**
 * One host: its containers, networks and volumes, the volume sizes from `df` and the caption from
 * `info`. The sizes and the caption are nice to have: the host loads without them.
 */
export async function loadHost(
  get: ApiGet,
  host: ApiHost,
  retryDelay = 800,
): Promise<EnvironmentSpec> {
  const alias = `/containers/${encodeURIComponent(host.id)}`
  const optional = (path: string) => get(`${alias}${path}`).catch(() => undefined)
  // on a cold cache the API answers parallel requests to one host with 500s (its docker client is
  // shared), so the lists are asked for one after another, and a 500 is tried again once; a 502,
  // 503 or 504 (the node is unreachable, or too slow) is not: it would only take as long again
  const required = (path: string) =>
    get(`${alias}${path}`).catch(async (e) => {
      if (!(e instanceof ApiError) || e.status !== 500) throw e
      await new Promise((resolve) => setTimeout(resolve, retryDelay))
      return get(`${alias}${path}`)
    })
  const containers = await required('/containers')
  const networks = await required('/networks')
  const volumes = await required('/volumes')
  const [df, info] = await Promise.all([optional('/df'), optional('/info')])
  // the listed volumes have no sizes; df has them (UsageData.Size, -1 when docker doesn't know)
  const usage = new Map(
    list(isRecord(df) ? df.Volumes : undefined).map((v) => [v.Name, v.UsageData] as const),
  )
  const sized = list(volumes).map((v) =>
    usage.get(v.Name) ? { ...v, UsageData: usage.get(v.Name) } : v,
  )
  const name = host.name || host.id
  const all = list(containers)
  return {
    ...fromInspect([...all, ...list(networks), ...sized], name, hostCaption(info, all.length)),
    engine: engineInfo(info, host),
  }
}

/** The title and subtitle of the live stack, from its hosts */
export function liveHeadline(
  environments: EnvironmentSpec[],
  note?: string,
): { title: string; subtitle: string } {
  const containers = environments.reduce((n, e) => n + (e.containers?.length ?? 0), 0)
  const running = environments.reduce(
    (n, e) => n + (e.containers?.filter((c) => c.state === 'running').length ?? 0),
    0,
  )
  return {
    title: environments.length > 1 ? `${environments.length} hosts.` : `${environments[0]?.name}.`,
    subtitle: `Live: ${containers} containers, ${running} running${note ? ` · ${note}` : ''}`,
  }
}

/** A loaded host: its alias in the API, and the name of its environment */
export type LiveHost = { alias: string; name: string }

/** The hosts switched off in the live stack, by their alias (they are not loaded) */
const HOSTS_STORAGE = 'isocontainers.hosts.v1'

export function loadHiddenHosts(): Set<string> {
  try {
    const list = JSON.parse(localStorage.getItem(HOSTS_STORAGE) ?? '[]')
    return new Set(Array.isArray(list) ? list.filter((a) => typeof a === 'string') : [])
  } catch {
    return new Set()
  }
}

export function saveHiddenHosts(aliases: Set<string>) {
  try {
    localStorage.setItem(HOSTS_STORAGE, JSON.stringify([...aliases]))
  } catch {
    // no storage: the choice lasts until the page is reloaded
  }
}

/**
 * The last load of each host, by the API's base: shown at once on the next load, while the hosts
 * load again. The environments are kept by alias, with the time each was loaded.
 */
export type LiveSnapshot = {
  available: ApiHost[]
  environments: Record<string, { time: number; env: EnvironmentSpec }>
}

const SNAPSHOT_STORAGE = 'isocontainers.snapshot.v1'
const snapshotKey = (base: string) => `${SNAPSHOT_STORAGE}:${base}`

export function loadSnapshot(base: string): LiveSnapshot | undefined {
  try {
    const value = JSON.parse(localStorage.getItem(snapshotKey(base)) ?? 'null')
    return isRecord(value) && Array.isArray(value.available) && isRecord(value.environments)
      ? (value as LiveSnapshot)
      : undefined
  } catch {
    return undefined
  }
}

/** Keep a host's environment (and the list of hosts) for the next load */
export function saveSnapshot(
  base: string,
  available: ApiHost[],
  alias?: string,
  env?: EnvironmentSpec,
) {
  try {
    const snapshot = loadSnapshot(base) ?? { available, environments: {} }
    snapshot.available = available
    if (alias && env) snapshot.environments[alias] = { time: Date.now(), env }
    // hosts the API no longer lists are dropped
    const listed = new Set(available.map((h) => h.id))
    for (const a of Object.keys(snapshot.environments))
      if (!listed.has(a)) delete snapshot.environments[a]
    localStorage.setItem(snapshotKey(base), JSON.stringify(snapshot))
  } catch {
    // no storage, or full: the next load waits for the API
  }
}

/** The connected hosts of the API */
export async function listHosts(get: ApiGet, base = API_BASE): Promise<ApiHost[]> {
  const available = list(await get('/containers/hosts')).filter(
    (h): h is ApiHost & Json => typeof h.id === 'string' && h.connected !== false,
  )
  if (!available.length) throw new ApiError(`${base}: no connected container hosts`)
  return available
}

/** The hosts to show: all but those switched off; when that is all of them, the first */
export function shownHosts(available: ApiHost[], hidden: Set<string>): ApiHost[] {
  const shown = available.filter((h) => !hidden.has(h.id))
  return shown.length ? shown : available.slice(0, 1)
}

/** The live stack of these environments */
export function liveSpec(environments: EnvironmentSpec[], note?: string): ContainersSpec {
  return {
    id: 'api',
    ...liveHeadline(environments, note),
    description:
      'Loaded from the mission-control API. The containers, networks, volumes and their states are ' +
      'real, and the log shows the live engine events; the traffic, cpu and memory are simulated. ' +
      'Reload the page to load the latest state.',
    environments,
  }
}

const clock = (time: number) =>
  new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

/** The note of a stack shown from a snapshot */
export const snapshotNote = (time: number) => `snapshot of ${clock(time)}, refreshing`

/**
 * How the live stack opens, without waiting for the slowest host:
 * - `hosts` are on the map at once, `loading` are the loads still running (by alias), to be added
 *   (or, for a host on the map, to replace it) as they come in;
 * - `snapshot` is the time of the oldest snapshot shown, when the map opened from one;
 * - `listing` is the list of hosts being asked for again, when the map opened from a snapshot.
 */
export type LiveStart = {
  spec: ContainersSpec
  available: ApiHost[]
  hosts: LiveHost[]
  loading: Map<string, Promise<EnvironmentSpec>>
  snapshot?: number
  listing?: Promise<ApiHost[]>
}

/** The first of the loads to succeed, with its index; when all fail, the first error */
function firstLoaded<T>(loads: Promise<T>[]): Promise<{ index: number; env: T }> {
  return new Promise((resolve, reject) => {
    const errors: unknown[] = []
    let failed = 0
    loads.forEach((p, index) =>
      p.then(
        (env) => resolve({ index, env }),
        (e) => {
          errors[index] = e
          if (++failed === loads.length) reject(errors.find((x) => x !== undefined) ?? e)
        },
      ),
    )
  })
}

const liveHost = (h: ApiHost): LiveHost => ({ alias: h.id, name: h.name || h.id })

/**
 * Open the live stack. With a snapshot of the hosts to show, it opens from that at once, and every
 * host loads again behind it. Without one, it lists the hosts, loads those to show (all but
 * `hidden`) side by side, and opens with the first that loads; the others follow. When none loads,
 * the first error is thrown.
 */
export async function openLive(
  get: ApiGet,
  base = API_BASE,
  hidden: Set<string> = new Set(),
  snapshot?: LiveSnapshot,
): Promise<LiveStart> {
  if (snapshot) {
    const shown = shownHosts(snapshot.available, hidden).filter((h) => snapshot.environments[h.id])
    if (shown.length) {
      const listing = listHosts(get, base)
      // each host loads again once the API has listed it (a host no longer listed is not loaded)
      const loading = new Map(
        shown.map((h) => [
          h.id,
          listing.then((available) => {
            const host = available.find((a) => a.id === h.id)
            if (!host) throw new ApiError(`${h.id}: no longer a connected host of ${base}`, 404)
            return loadHost(get, host)
          }),
        ]),
      )
      for (const p of loading.values()) p.catch(() => undefined)
      listing.catch(() => undefined)
      const time = Math.min(...shown.map((h) => snapshot.environments[h.id].time))
      return {
        spec: liveSpec(
          shown.map((h) => snapshot.environments[h.id].env),
          snapshotNote(time),
        ),
        available: snapshot.available,
        hosts: shown.map(liveHost),
        loading,
        snapshot: time,
        listing,
      }
    }
  }
  const available = await listHosts(get, base)
  const shown = shownHosts(available, hidden)
  const loads = shown.map((h) => loadHost(get, h))
  for (const p of loads) p.catch(() => undefined)
  // the first to load opens the map
  const first = await firstLoaded(loads)
  return {
    spec: liveSpec([first.env]),
    available,
    hosts: [liveHost(shown[first.index])],
    loading: new Map(
      shown.flatMap((h, i) => (i === first.index ? [] : [[h.id, loads[i]] as const])),
    ),
  }
}
