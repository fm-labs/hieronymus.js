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
import type { ContainersSpec, EnvironmentSpec } from './isocontainers.types.ts'

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

/** An ApiGet on fetch, with errors that say what to do */
export function apiGet(base = API_BASE, fetchFn: typeof fetch = fetch): ApiGet {
  return async (path) => {
    const url = `${base}${path}`
    let response: Response
    try {
      response = await fetchFn(url, { headers: { accept: 'application/json' } })
    } catch (e) {
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
    return response.json()
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
  // shared), so the lists are asked for one after another, and a server error is tried again once
  const required = (path: string) =>
    get(`${alias}${path}`).catch(async (e) => {
      if (!(e instanceof ApiError) || !e.status || e.status < 500) throw e
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
  return fromInspect([...all, ...list(networks), ...sized], name, hostCaption(info, all.length))
}

/**
 * All connected hosts of the API, as a spec. A host that fails to load is left out (and reported);
 * when none loads, the first error is thrown.
 */
export async function loadFromApi(
  get: ApiGet,
  base = API_BASE,
): Promise<{ spec: ContainersSpec; failed: string[] }> {
  const hosts = list(await get('/containers/hosts')).filter(
    (h): h is ApiHost & Json => typeof h.id === 'string' && h.connected !== false,
  )
  if (!hosts.length) throw new ApiError(`${base}: no connected container hosts`)
  const results = await Promise.allSettled(hosts.map((h) => loadHost(get, h)))
  const environments = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
  const failed = results.flatMap((r, i) =>
    r.status === 'rejected' ? [`${hosts[i].id}: ${(r.reason as Error).message}`] : [],
  )
  if (!environments.length)
    throw results.find((r): r is PromiseRejectedResult => r.status === 'rejected')!.reason
  const containers = environments.reduce((n, e) => n + (e.containers?.length ?? 0), 0)
  const running = environments.reduce(
    (n, e) => n + (e.containers?.filter((c) => c.state === 'running').length ?? 0),
    0,
  )
  return {
    spec: {
      id: 'api',
      title: environments.length > 1 ? `${environments.length} hosts.` : `${environments[0].name}.`,
      subtitle: `Live: ${containers} containers, ${running} running`,
      description:
        'Loaded from the mission-control API. The containers, networks, volumes and their states are ' +
        'real; the traffic, cpu and memory are simulated. Reload the page to load the latest state.',
      environments,
    },
    failed,
  }
}
