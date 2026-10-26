import { describe, expect, it } from 'vitest'
import {
  ApiError,
  apiGet,
  hostCaption,
  loadFromApi,
  loadHost,
  type ApiGet,
} from '../src/worlds/isocontainers/isocontainers.api'
import { buildContainersModel } from '../src/worlds/isocontainers/isocontainers.layout'

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
  it('loads the connected hosts as environments', async () => {
    const { spec, failed } = await loadFromApi(fake(API))
    expect(failed).toEqual([])
    expect(spec.id).toBe('api')
    expect(spec.environments.map((e) => e.name)).toEqual(['local'])
    const env = spec.environments[0]
    expect(env.caption).toBe('box · docker 29.9.2 · 16 CPUs · 16 GiB')
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
    const { spec } = await loadFromApi(fake(api))
    expect(spec.environments[0].caption).toBe('2 containers')
    expect(spec.environments[0].volumes!.every((v) => !v.size)).toBe(true)
  })

  it('leaves out a host that fails, and fails when none loads', async () => {
    const two = {
      ...API,
      '/containers/hosts': [{ id: 'local' }, { id: 'broken' }],
    }
    const { spec, failed } = await loadFromApi(fake(two))
    expect(spec.environments).toHaveLength(1)
    expect(failed).toHaveLength(1)
    expect(failed[0]).toMatch(/^broken: /)
    await expect(
      loadFromApi(fake({ ...API, '/containers/hosts': [{ id: 'broken' }] })),
    ).rejects.toThrow('404')
    await expect(loadFromApi(fake({ '/containers/hosts': [] }))).rejects.toThrow('no connected')
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

  it('writes a caption from what docker info has', () => {
    expect(hostCaption({ ServerVersion: '27.1' }, 3)).toBe('docker 27.1')
    expect(hostCaption(undefined, 3)).toBe('3 containers')
  })
})
