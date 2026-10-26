import { describe, expect, it, vi } from 'vitest'
import {
  EngineEvents,
  LiveChanges,
  applyEngineState,
  engineLine,
  readNdjson,
  type DockerEvent,
} from '../src/worlds/isocontainers/isocontainers.events'
import { buildContainersModel } from '../src/worlds/isocontainers/isocontainers.layout'
import { ContainersSimulation, START_SECONDS } from '../src/worlds/isocontainers/isocontainers.sim'
import isoContainersWorldBuilder, {
  LAYER_STRUCTURES,
  rebuildWorld,
} from '../src/worlds/isocontainers/isocontainers.world'
import type { ContainersSpec } from '../src/worlds/isocontainers/isocontainers.types'

const ID = 'a'.repeat(64)
const NET = 'b'.repeat(64)

const host = () => {
  const model = buildContainersModel({
    title: 'live',
    environments: [
      {
        name: 'localdocker',
        containers: [
          { name: 'redis', id: ID, image: 'redis:7', networks: ['backend'] },
          { name: 'web', image: 'nginx:1.27' },
        ],
      },
    ],
  })
  return model.environments[0]
}

const container = (Action: string, Attributes: Record<string, string> = {}): DockerEvent => ({
  Type: 'container',
  Action,
  Actor: { ID, Attributes: { name: 'redis', image: 'redis:7', ...Attributes } },
  time: 1793026144,
  timeNano: 1793026144646 * 1e6, // in nanoseconds (more digits than a double keeps)
})

const body = (chunks: string[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(new TextEncoder().encode(c))
      controller.close()
    },
  })

describe('isocontainers engine events', () => {
  it('writes the container events as lines of their container', () => {
    const env = host()
    const start = engineLine(container('start'), env)!
    expect(start).toMatchObject({
      source: 'engine',
      level: 'info',
      host: 'localdocker',
      key: 'localdocker/redis',
      actor: 'redis',
      text: 'container start image=redis:7',
      time: 1793026144646,
    })
    expect(engineLine(container('die', { exitCode: '0' }), env)).toMatchObject({
      level: 'warn',
      text: 'container die exitCode=0',
    })
    expect(engineLine(container('die', { exitCode: '137' }), env)?.level).toBe('error')
    expect(engineLine(container('kill', { signal: '15' }), env)?.text).toBe(
      'container kill signal=15',
    )
    expect(engineLine(container('health_status: unhealthy'), env)).toMatchObject({
      level: 'warn',
      text: 'health_status: unhealthy',
    })
    expect(engineLine(container('exec_start: redis-cli ping'), env)).toMatchObject({
      level: 'debug',
      text: 'exec_start: redis-cli ping',
    })
    // a container that came after the load: named, but not on the map
    const late = engineLine(
      { ...container('create'), Actor: { ID: 'c'.repeat(64), Attributes: { name: 'probe' } } },
      env,
    )!
    expect(late).toMatchObject({ actor: 'probe', key: undefined, text: 'container create' })
  })

  it('leaves out the noise: exec_create, attach, an exec that worked', () => {
    const env = host()
    expect(engineLine(container('exec_create: redis-cli ping'), env)).toBeUndefined()
    expect(engineLine(container('attach'), env)).toBeUndefined()
    expect(engineLine(container('exec_die', { exitCode: '0' }), env)).toBeUndefined()
    expect(engineLine(container('exec_die', { exitCode: '1' }), env)?.level).toBe('warn')
  })

  it('names the container of network and volume events by its id', () => {
    const env = host()
    const connect = engineLine(
      {
        Type: 'network',
        Action: 'connect',
        Actor: { ID: NET, Attributes: { container: ID, name: 'backend', type: 'bridge' } },
      },
      env,
    )!
    expect(connect).toMatchObject({
      key: 'localdocker/redis',
      actor: 'redis',
      text: 'network connect backend',
    })
    const mount = engineLine(
      {
        Type: 'volume',
        Action: 'mount',
        Actor: { ID: 'redis-data', Attributes: { container: ID, destination: '/data' } },
      },
      env,
    )!
    expect(mount).toMatchObject({ actor: 'redis', text: 'volume mount redis-data → /data' })
    // an unknown container: its short id
    const other = engineLine(
      {
        Type: 'network',
        Action: 'disconnect',
        Actor: { ID: NET, Attributes: { container: 'd'.repeat(64), name: 'bridge' } },
      },
      env,
    )!
    expect(other.actor).toBe('dddddddddddd')
    // … named, once a container event said its name
    const names = new Map<string, string>()
    engineLine(
      {
        Type: 'container',
        Action: 'create',
        Actor: { ID: 'd'.repeat(64), Attributes: { name: 'probe' } },
      },
      env,
      names,
    )
    expect(
      engineLine(
        {
          Type: 'network',
          Action: 'connect',
          Actor: { ID: NET, Attributes: { container: 'd'.repeat(64), name: 'bridge' } },
        },
        env,
        names,
      )?.actor,
    ).toBe('probe')
    expect(
      engineLine(
        { Type: 'image', Action: 'pull', Actor: { ID: 'x', Attributes: { name: 'redis:7' } } },
        env,
      ),
    ).toMatchObject({ actor: 'images', text: 'image pull redis:7' })
  })

  it('reads one JSON value a line, across chunks', async () => {
    const values: unknown[] = []
    await readNdjson(body(['{"a":1}\n{"b"', ':2}\n\nnot json\n{"c":3}']), (v) => values.push(v))
    expect(values).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }])
  })

  it('streams a host, and connects again when the stream ends', async () => {
    vi.useFakeTimers()
    try {
      const fetchFn = vi.fn(
        async () => new Response(body([JSON.stringify(container('start')) + '\n'])),
      ) as unknown as typeof fetch
      const events: DockerEvent[] = []
      const statuses: unknown[] = []
      const source = new EngineEvents({
        base: '/mc-api',
        alias: 'localdocker',
        onEvent: (e) => events.push(e),
        onStatus: (s) => statuses.push(s),
        fetchFn,
      })
      await vi.advanceTimersByTimeAsync(10)
      expect(fetchFn).toHaveBeenCalledWith(
        '/mc-api/containers/localdocker/events/stream',
        expect.anything(),
      )
      expect(events.map((e) => e.Action)).toEqual(['start'])
      expect(statuses).toEqual([
        { connected: true },
        { connected: false, error: 'the stream ended', retryIn: 2 },
      ])
      await vi.advanceTimersByTimeAsync(2000)
      expect(fetchFn).toHaveBeenCalledTimes(2)
      source.close()
      await vi.advanceTimersByTimeAsync(60000)
      expect(fetchFn).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })
})

/** docker inspect of a container, as the API returns it */
const inspect = (id: string, name: string, status = 'created') => ({
  Id: id,
  Name: `/${name}`,
  Image: 'sha256:abc',
  Config: { Image: 'alpine:3', User: '', Labels: {} },
  State: { Status: status, ExitCode: 0 },
  HostConfig: {},
  NetworkSettings: { Ports: {}, Networks: { backend: { IPAddress: '172.20.0.9' } } },
  Mounts: [],
})

const liveSpec = (): ContainersSpec => ({
  title: 'live',
  environments: [
    {
      name: 'localdocker',
      containers: [
        { name: 'redis', id: ID, image: 'redis:7', networks: ['backend'] },
        { name: 'web', id: 'w'.repeat(64), image: 'nginx:1.27', networks: ['backend'] },
      ],
    },
  ],
})

describe('isocontainers live changes', () => {
  it('sets the state of a container from its events', () => {
    const model = buildContainersModel(liveSpec())
    const sim = new ContainersSimulation(model)
    const c = model.containers[0]
    expect(applyEngineState(c, container('die', { exitCode: '137' }), sim)).toBe(true)
    expect(c).toMatchObject({ state: 'exited', exitCode: 137 })
    // the stop after the die changes nothing
    expect(applyEngineState(c, container('stop'), sim)).toBe(false)
    expect(applyEngineState(c, container('start'), sim)).toBe(true)
    expect(c.state).toBe('restarting')
    sim.step(START_SECONDS + 0.1)
    expect(c.state).toBe('running')
    expect(applyEngineState(c, container('pause'), sim)).toBe(true)
    expect(c.state).toBe('paused')
    expect(applyEngineState(c, container('unpause'), sim)).toBe(true)
    expect(c.state).toBe('running')
    expect(applyEngineState(c, container('health_status: unhealthy'), sim)).toBe(true)
    expect(c.health).toBe('unhealthy')
    expect(applyEngineState(c, container('exec_start: redis-cli ping'), sim)).toBe(false)
  })

  it('adds a created container and takes a destroyed one out, in one rebuild', async () => {
    vi.useFakeTimers()
    try {
      const spec = liveSpec()
      let model = buildContainersModel(spec)
      const rebuilds: string[][] = []
      const changes = new LiveChanges({
        spec,
        inspect: async (alias, id) => (id === 'n'.repeat(64) ? inspect(id, 'probe') : undefined),
        rebuild: (s) => {
          model = buildContainersModel(s)
          rebuilds.push(model.containers.map((c) => c.name))
        },
        environment: (name) => model.environments.find((e) => e.key === name),
        sim: () => new ContainersSimulation(model),
        delay: 500,
      })
      const event = (Action: string, id: string, name: string): DockerEvent => ({
        Type: 'container',
        Action,
        Actor: { ID: id, Attributes: { name } },
      })
      changes.event('localdocker', 'localdocker', event('create', 'n'.repeat(64), 'probe'))
      changes.event('localdocker', 'localdocker', event('destroy', 'w'.repeat(64), 'web'))
      await vi.advanceTimersByTimeAsync(400)
      expect(rebuilds).toEqual([])
      // the start comes while the new container is fetched: it is replayed on the new map
      changes.event('localdocker', 'localdocker', event('start', 'n'.repeat(64), 'probe'))
      await vi.advanceTimersByTimeAsync(1000)
      expect(rebuilds).toEqual([['redis', 'probe']])
      const probe = model.containers.find((c) => c.name === 'probe')!
      expect(probe.id).toBe('n'.repeat(64))
      expect(probe.key).toBe('localdocker/probe')
      expect(probe.attachments.map((a) => a.network.name)).toEqual(['backend'])
      expect(probe.state).toBe('restarting')
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not add a container that was gone before it was fetched', async () => {
    vi.useFakeTimers()
    try {
      const spec = liveSpec()
      const model = buildContainersModel(spec)
      const rebuild = vi.fn()
      const changes = new LiveChanges({
        spec,
        // docker run --rm: by the time it is fetched, it is gone (404)
        inspect: async () => undefined,
        rebuild,
        environment: (name) => model.environments.find((e) => e.key === name),
        sim: () => new ContainersSimulation(model),
      })
      const id = 'p'.repeat(64)
      for (const Action of ['create', 'start', 'die', 'destroy'])
        changes.event('localdocker', 'localdocker', {
          Type: 'container',
          Action,
          Actor: { ID: id, Attributes: { name: 'probe' } },
        })
      await vi.advanceTimersByTimeAsync(2000)
      expect(rebuild).not.toHaveBeenCalled()
      expect(spec.environments[0].containers).toHaveLength(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('rebuilds the world into the same tile map', () => {
    const spec = liveSpec()
    const world = isoContainersWorldBuilder(spec)
    const count = () => world.tileMap.layers[LAYER_STRUCTURES].data.length
    // 2 buildings and a gate
    expect(count()).toBe(3)
    spec.environments[0].containers!.push({
      name: 'probe',
      image: 'alpine:3',
      networks: ['backend'],
    })
    const old = rebuildWorld(world, spec)
    expect(old.containers).toHaveLength(2)
    expect(world.model.containers).toHaveLength(3)
    expect(count()).toBe(4)
    expect(world.structures).toHaveLength(4)
    expect(world.parts.ground.properties.model).toBe(world.model)
    expect(world.parts.overlay.properties.model).toBe(world.model)
  })
})
