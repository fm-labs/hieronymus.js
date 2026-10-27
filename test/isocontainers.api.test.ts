import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  apiGet,
  engineInfo,
  hostCaption,
  loadHost,
  loadSnapshot,
  openLive,
  saveSnapshot,
  type ApiGet,
  type LiveSnapshot,
} from '../examples/src/worlds/isocontainers/isocontainers.api'
import { buildContainersModel } from '../examples/src/worlds/isocontainers/isocontainers.layout'

/** A container as docker inspect (and the API) returns it, with what the importer reads */
const container = (name: string, image: string, extra: Record<string, unknown> = {}) => ({
  Id: `${name}-id`,
  Name: `/${name}`,
  Image: 'sha256:abc',
  Config: {
    Image: image,
    User: '',
    Labels: {
      'com.docker.compose.project': 'shop',
      'com.docker.compose.service': name,
      ...(name === 'api' ? { 'com.docker.compose.depends_on': 'db:service_healthy:false' } : {}),
    },
  },
  State: { Status: 'running', ExitCode: 0, Health: { Status: 'healthy' } },
  HostConfig: { RestartPolicy: { Name: 'unless-stopped' }, Memory: 0 },
  NetworkSettings: {
    Ports: name === 'api' ? { '8080/tcp': [{ HostIp: '0.0.0.0', HostPort: '8080' }] } : {},
    Networks: { shop_default: { IPAddress: '172.20.0.2', IPPrefixLen: 16, Aliases: [name] } },
  },
  Mounts:
    name === 'db'
      ? [{ Type: 'volume', Name: 'pgdata', Destination: '/var/lib/postgresql/data', RW: true }]
      : [],
  ...extra,
})

const API: Record<string, unknown> = {
  '/containers/hosts': [
    { id: 'local', name: 'local', connected: true },
    { id: 'away', name: 'away', connected: false },
  ],
  '/containers/local/containers': [
    container('api', 'shop/api:1.2'),
    container('db', 'postgres:16'),
  ],
  '/containers/local/networks': [
    {
      Name: 'shop_default',
      Driver: 'bridge',
      Internal: false,
      IPAM: { Config: [{ Subnet: '172.20.0.0/16' }] },
    },
    { Name: 'bridge', Driver: 'bridge', IPAM: { Config: [] } },
  ],
  '/containers/local/volumes': [
    { Name: 'pgdata', Driver: 'local', Mountpoint: '/var/lib/docker/volumes/pgdata/_data' },
    { Name: 'cache', Driver: 'local', Mountpoint: '/var/lib/docker/volumes/cache/_data' },
  ],
  '/containers/local/df': {
    Volumes: [
      { Name: 'pgdata', UsageData: { Size: 2.5 * 1024 ** 3, RefCount: 1 } },
      { Name: 'cache', UsageData: { Size: -1, RefCount: 0 } },
    ],
  },
  '/containers/local/info': {
    Name: 'box',
    ServerVersion: '29.9.2',
    NCPU: 16,
    MemTotal: 16 * 1024 ** 3,
  },
}

const fake =
  (api: Record<string, unknown>): ApiGet =>
  async (path) => {
    if (!(path in api)) throw new ApiError(`${path}: 404`, 404)
    return structuredClone(api[path])
  }

describe('isocontainers api', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('loads the connected hosts as environments', async () => {
    const { spec, loading } = await openLive(fake(API))
    expect(loading.size).toBe(0)
    expect(spec.id).toBe('api')
    expect(spec.environments.map((e) => e.name)).toEqual(['local'])
    const env = spec.environments[0]
    expect(env.caption).toBe('box · docker 29.9.2 · 16 CPUs · 16 GiB')
    expect(env.engine).toEqual({
      engine: 'docker',
      version: '29.9.2',
      hostname: 'box',
      cpus: 16,
      memory: '16 GiB',
    })
    // the network's details reach the model
    expect(env.networks!.find((n) => n.name === 'shop_default')!.subnet).toBe('172.20.0.0/16')
    expect(env.containers!.map((c) => c.name)).toEqual(['api', 'db'])
    // the sizes come from df; an unknown size (-1) stays unknown
    expect(env.volumes!.find((v) => v.name === 'pgdata')!.size).toBe('2.5 GiB')
    expect(env.volumes!.find((v) => v.name === 'cache')!.size).toBeUndefined()
    // and the model gets its calls, ingress and mounts from it
    const model = buildContainersModel(spec)
    expect(model.links.map((l) => l.id).sort()).toEqual([
      'local/api->local/db:call',
      'local/db->local/volume/pgdata:mount',
      'local/gate->local/api:ingress',
    ])
  })

  it('does without df and info', async () => {
    const api = { ...API }
    delete api['/containers/local/df']
    delete api['/containers/local/info']
    const { spec } = await openLive(fake(api))
    expect(spec.environments[0].caption).toBe('2 containers')
    expect(spec.environments[0].volumes!.every((v) => !v.size)).toBe(true)
  })

  it('opens with the first host that loads; the others follow, and fails when none loads', async () => {
    let release!: () => void
    const held = new Promise<void>((resolve) => (release = resolve))
    const three = {
      ...API,
      '/containers/hosts': [{ id: 'slow' }, { id: 'local' }, { id: 'broken' }],
      '/containers/slow/containers': [],
      '/containers/slow/networks': [],
      '/containers/slow/volumes': [],
    }
    // the slow host answers only once released: the stack doesn't wait for it
    const get: ApiGet = async (path) => {
      if (path.startsWith('/containers/slow/')) await held
      return fake(three)(path)
    }
    const { spec, hosts, loading, snapshot } = await openLive(get)
    expect(spec.environments.map((e) => e.name)).toEqual(['local'])
    expect(hosts).toEqual([{ alias: 'local', name: 'local' }])
    expect(snapshot).toBeUndefined()
    expect([...loading.keys()]).toEqual(['slow', 'broken'])
    await expect(loading.get('broken')).rejects.toThrow('404')
    release()
    expect((await loading.get('slow'))!.name).toBe('slow')

    await expect(
      openLive(fake({ ...API, '/containers/hosts': [{ id: 'broken' }] })),
    ).rejects.toThrow('404')
    await expect(openLive(fake({ '/containers/hosts': [] }))).rejects.toThrow('no connected')
  })

  it('skips the hosts switched off, but always loads one', async () => {
    const two = {
      ...API,
      '/containers/hosts': [{ id: 'local' }, { id: 'other', name: 'Other' }],
    }
    const asked: string[] = []
    const get: ApiGet = (path) => (asked.push(path), fake(two)(path))
    const { spec, hosts, available, loading } = await openLive(get, '/mc-api', new Set(['other']))
    expect(loading.size).toBe(0)
    expect(spec.environments.map((e) => e.name)).toEqual(['local'])
    expect(hosts).toEqual([{ alias: 'local', name: 'local' }])
    expect(available.map((h) => h.id)).toEqual(['local', 'other'])
    expect(asked.some((p) => p.startsWith('/containers/other/'))).toBe(false)
    // all switched off: the first is loaded anyway
    const all = await openLive(fake(two), '/mc-api', new Set(['local', 'other']))
    expect(all.hosts.map((h) => h.alias)).toEqual(['local'])
  })

  it('opens from a snapshot at once, and loads the hosts again behind it', async () => {
    const before = await loadHost(fake(API), { id: 'local' })
    const snapshot: LiveSnapshot = {
      available: [{ id: 'local' }, { id: 'gone' }],
      environments: {
        local: { time: Date.UTC(2026, 9, 27, 9, 30), env: { ...before, containers: [] } },
        gone: { time: Date.UTC(2026, 9, 27, 9, 0), env: { ...before, name: 'gone' } },
      },
    }
    const asked: string[] = []
    const get: ApiGet = (path) => (asked.push(path), fake(API)(path))
    const start = await openLive(get, '/mc-api', new Set(), snapshot)
    // nothing of a host was asked for yet: the map shows the snapshot
    expect(asked).toEqual(['/containers/hosts'])
    expect(start.spec.environments.map((e) => e.name)).toEqual(['local', 'gone'])
    expect(start.spec.environments[0].containers).toEqual([])
    expect(start.spec.subtitle).toMatch(/snapshot of .*, refreshing$/)
    expect(start.snapshot).toBe(Date.UTC(2026, 9, 27, 9, 0))
    // loaded again: the host with its containers; the host the API no longer lists fails
    expect((await start.loading.get('local'))!.containers).toHaveLength(2)
    await expect(start.loading.get('gone')).rejects.toThrow('no longer a connected host')
    expect((await start.listing)!.map((h) => h.id)).toEqual(['local'])
    // the hosts switched off are left out of it; a snapshot without the hosts to show is not used
    const other = await openLive(fake(API), '/mc-api', new Set(['local']), snapshot)
    expect(other.hosts.map((h) => h.alias)).toEqual(['gone'])
    const none = await openLive(fake(API), '/mc-api', new Set(), {
      available: [{ id: 'local' }],
      environments: {},
    })
    expect(none.snapshot).toBeUndefined()
  })

  it('keeps a snapshot of each host, by the API', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
    })
    expect(loadSnapshot('/mc-api')).toBeUndefined()
    const env = { name: 'local', containers: [] }
    saveSnapshot('/mc-api', [{ id: 'local' }, { id: 'b' }], 'local', env)
    saveSnapshot('/mc-api', [{ id: 'local' }, { id: 'b' }], 'b', { name: 'b' })
    expect(Object.keys(loadSnapshot('/mc-api')!.environments)).toEqual(['local', 'b'])
    expect(loadSnapshot('/other')).toBeUndefined()
    // a host the API no longer lists is dropped
    saveSnapshot('/mc-api', [{ id: 'local' }])
    const snapshot = loadSnapshot('/mc-api')!
    expect(Object.keys(snapshot.environments)).toEqual(['local'])
    expect(snapshot.environments.local.env).toEqual(env)
    // a full storage only means no snapshot
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    })
    expect(() => saveSnapshot('/mc-api', [{ id: 'local' }], 'local', env)).not.toThrow()
  })

  it('tries a request again after a server error', async () => {
    let calls = 0
    const flaky: ApiGet = async (path) => {
      if (path === '/containers/local/volumes' && calls++ === 0)
        throw new ApiError(`${path}: 500 Internal Server Error`, 500)
      return fake(API)(path)
    }
    const env = await loadHost(flaky, { id: 'local' }, 0)
    expect(env.volumes).toHaveLength(2)
    expect(calls).toBe(2)
    // but not after a client error
    const missing: ApiGet = async (path) => {
      if (path === '/containers/local/networks') throw new ApiError(`${path}: 404`, 404)
      return fake(API)(path)
    }
    await expect(loadHost(missing, { id: 'local' }, 0)).rejects.toThrow('404')
    // nor after an unreachable node (502), which would only take as long again
    let tries = 0
    const unreachable: ApiGet = async (path) => {
      if (path === '/containers/local/containers') {
        tries++
        throw new ApiError(`${path}: 502 Node is unreachable`, 502)
      }
      return fake(API)(path)
    }
    await expect(loadHost(unreachable, { id: 'local' }, 0)).rejects.toThrow('502')
    expect(tries).toBe(1)
  })

  it('gives up a request that takes too long', async () => {
    const hanging = ((_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) =>
        init?.signal?.addEventListener('abort', () => reject(init.signal!.reason)),
      )) as typeof fetch
    await expect(apiGet('/x', hanging, 20)('/a')).rejects.toThrow('/x/a: no answer in 0.02 s')
  })

  it('says what is wrong with a response', async () => {
    const respond = (body: string, status: number, type = 'application/json') =>
      (async () =>
        new Response(body, { status, headers: { 'content-type': type } })) as typeof fetch
    await expect(apiGet('/x', respond('{}', 401))('/a')).rejects.toThrow('MC_API_KEY')
    await expect(
      apiGet('/x', respond('{"error":"Not Found","detail":"No host"}', 404))('/a'),
    ).rejects.toThrow('404 No host')
    await expect(apiGet('/x', respond('<html>', 200, 'text/html'))('/a')).rejects.toThrow(
      'dev proxy',
    )
    const down = (async () => {
      throw new TypeError('Failed to fetch')
    }) as typeof fetch
    await expect(apiGet('/x', down)('/a')).rejects.toThrow('not reachable')
    expect(await apiGet('/x', respond('[1]', 200))('/a')).toEqual([1])
  })

  it('reads the engine from docker info and the host entry', () => {
    const host = {
      id: 'local',
      properties: { engine: 'docker', url: 'unix:///var/run/docker.sock' },
    }
    expect(
      engineInfo(
        {
          ServerVersion: '29.9.2',
          OperatingSystem: 'Docker Desktop',
          Driver: 'overlayfs',
          CgroupDriver: 'cgroupfs',
          CgroupVersion: '2',
          Images: 46,
          Swarm: { LocalNodeState: 'inactive' },
          FirewallBackend: { Driver: 'iptables' },
          IPv4Forwarding: true,
          HttpProxy: 'http.docker.internal:3128',
          NoProxy: '',
          Warnings: null,
        },
        host,
      ),
    ).toEqual({
      engine: 'docker',
      address: 'unix:///var/run/docker.sock',
      version: '29.9.2',
      os: 'Docker Desktop',
      storageDriver: 'overlayfs',
      cgroup: 'cgroupfs · v2',
      images: 46,
      swarm: 'inactive',
      firewall: 'iptables',
      ipForwarding: true,
      httpProxy: 'http.docker.internal:3128',
    })
    // without info, only what the host entry says
    expect(engineInfo(undefined, host)).toEqual({
      engine: 'docker',
      address: 'unix:///var/run/docker.sock',
    })
  })

  it('writes a caption from what docker info has', () => {
    expect(hostCaption({ ServerVersion: '27.1' }, 3)).toBe('docker 27.1')
    expect(hostCaption(undefined, 3)).toBe('3 containers')
  })
})
