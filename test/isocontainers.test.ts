import { describe, expect, it } from 'vitest'
import {
  buildContainersModel,
  parsePort,
  pointAlong,
} from '../src/worlds/isocontainers/isocontainers.layout'
import {
  fromCompose,
  guessKind,
  subnetOf,
  toEnvironments,
} from '../src/worlds/isocontainers/isocontainers.import'
import { ContainersSimulation } from '../src/worlds/isocontainers/isocontainers.sim'
import { SAMPLES } from '../src/worlds/isocontainers/isocontainers.samples'
import { stateColor, stateText } from '../src/worlds/isocontainers/isocontainers.draw'
import type {
  ContainerSpec,
  ContainersModel,
  ContainersSpec,
} from '../src/worlds/isocontainers/isocontainers.types'

/** mulberry32 */
const createRandom = (seed: number) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

type Box = { name: string; c0: number; r0: number; c1: number; r1: number }

const footprints = (model: ContainersModel): Box[] => [
  ...model.containers.map((c) => ({
    name: c.key,
    c0: c.col,
    r0: c.row,
    c1: c.col + c.w,
    r1: c.row + c.d,
  })),
  ...model.volumes.map((v) => ({
    name: v.key,
    c0: v.col - v.r,
    r0: v.row - v.r,
    c1: v.col + v.r,
    r1: v.row + v.r,
  })),
]

describe('isocontainers import', () => {
  it('parses ports', () => {
    expect(parsePort('8080:80')).toMatchObject({ port: 80, hostPort: 8080, local: false })
    expect(parsePort('127.0.0.1:5432:5432')).toMatchObject({
      port: 5432,
      hostPort: 5432,
      local: true,
    })
    expect(parsePort('53:53/udp')).toMatchObject({ port: 53, proto: 'udp' })
    expect(parsePort('80')!.hostPort).toBeUndefined()
  })

  it('computes subnets', () => {
    expect(subnetOf('172.23.0.5', 16)).toBe('172.23.0.0/16')
    expect(subnetOf('10.1.2.200', 24)).toBe('10.1.2.0/24')
  })

  it('guesses kinds from images', () => {
    expect(guessKind('postgres:17')).toBe('database')
    expect(guessKind('docker.io/library/redis:latest')).toBe('cache')
    expect(guessKind('traefik:v3.5.3')).toBe('proxy')
    expect(guessKind('192.168.0.55:5000/backoffice-client:latest', 'ui')).toBe('web')
    expect(guessKind('company/api:1.0')).toBe('app')
  })

  it('reads docker inspect output', () => {
    const devbox = SAMPLES.find((s) => s.id === 'devbox')!
    const env = devbox.environments[0]
    expect(env.containers).toHaveLength(12)
    const model = buildContainersModel(devbox)
    const server = model.containers.find((c) => c.name === 'gameserver-dev-gameserver-1')!
    // compose depends_on labels become calls
    expect(server.out.map((l) => l.to.name).sort()).toEqual([
      'gameserver-dev-postgresdb-1',
      'gameserver-dev-redis-1',
    ])
    // published ports, one per host port (not one per address family)
    expect(
      server.ports
        .filter((p) => p.hostPort)
        .map((p) => p.hostPort)
        .sort(),
    ).toEqual([19010, 2001, 2002, 2345])
    expect(server.ports.find((p) => p.hostPort === 19010)!.local).toBe(true)
    // the proxy routes to the containers on its network
    const traefik = model.containers.find((c) => c.kind === 'proxy')!
    expect(traefik.out.length).toBeGreaterThan(0)
  })

  it('reads docker compose config output', () => {
    const env = fromCompose({
      name: 'demo',
      services: {
        web: {
          image: 'nginx',
          ports: [{ target: 80, published: '8080' }],
          depends_on: { api: {} },
        },
        api: { image: 'demo/api', networks: { default: null, data: null } },
        db: {
          image: 'postgres:16',
          networks: { data: null },
          volumes: [{ type: 'volume', source: 'pg', target: '/var/lib/postgresql/data' }],
        },
        migrate: { image: 'demo/api', networks: { data: null } },
      },
      networks: { default: {}, data: { internal: true } },
      volumes: { pg: {} },
    })
    expect(env.containers!.map((c) => c.name)).toEqual(['web', 'api', 'db', 'migrate'])
    expect(env.containers![0].ports).toEqual(['8080:80'])
    expect(env.containers![0].dependsOn).toEqual(['api'])
    const model = buildContainersModel({ title: 't', environments: [env] })
    expect(model.networks.find((n) => n.name === 'data')!.internal).toBe(true)
    expect(model.volumes.map((v) => v.name)).toEqual(['pg'])
    expect(toEnvironments({ services: {} }, 'x')[0].name).toBe('x')
  })
})

/** A dev machine: many small compose projects, and volumes left behind by old ones */
const PROJECTS: ContainersSpec = {
  id: 'projects',
  title: 'Many projects.',
  environments: [
    {
      name: 'laptop',
      containers: Array.from({ length: 11 }, (_, p) =>
        Array.from({ length: 1 + (p % 3) }, (_, i): ContainerSpec => {
          const project = `project${p + 1}`
          const name = i === 0 ? 'app' : i === 1 ? 'db' : 'cache'
          return {
            name: `${project}-${name}-1`,
            image: i === 0 ? `${project}-app` : i === 1 ? 'postgres:16' : 'redis:7',
            project,
            service: name,
            state: p % 4 ? 'exited' : 'running',
            ports: i === 0 && p % 2 ? [`${8000 + p}:8000`] : [],
            networks: [`${project}_default`],
            mounts: i === 1 ? [`${project}_data:/var/lib/postgresql/data`] : [],
            dependsOn: i === 0 && p % 3 ? ['db'] : [],
          }
        }),
      ).flat(),
      volumes: [
        ...Array.from({ length: 12 }, (_, i) => ({ name: `old${i + 1}_data`, size: '120 MB' })),
        ...Array.from({ length: 9 }, (_, i) => ({ name: `${i}`.padStart(64, 'a') })),
      ],
    },
  ],
}

describe.each([...SAMPLES, PROJECTS].map((s) => [s.id!, s] as const))(
  'isocontainers sample %s',
  (_, spec) => {
    const model = buildContainersModel(spec)

    it('has no overlapping lots or tanks', () => {
      for (const env of model.environments) {
        const boxes = footprints(model).filter((b) => b.name.startsWith(`${env.key}/`))
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            const [a, b] = [boxes[i], boxes[j]]
            const overlap =
              a.c0 < b.c1 - 1e-6 && b.c0 < a.c1 - 1e-6 && a.r0 < b.r1 - 1e-6 && b.r0 < a.r1 - 1e-6
            expect(overlap, `${a.name} overlaps ${b.name}`).toBe(false)
          }
        }
      }
    })

    it('keeps everything on its plate, and the plates apart', () => {
      for (const b of footprints(model)) {
        const env = model.environments.find((e) => b.name.startsWith(`${e.key}/`))!
        expect(b.c0).toBeGreaterThanOrEqual(env.col)
        expect(b.c1).toBeLessThanOrEqual(env.col + env.cols)
        expect(b.r0).toBeGreaterThanOrEqual(env.row)
        expect(b.r1).toBeLessThanOrEqual(env.row + env.rows)
      }
      const envs = model.environments
      for (let i = 0; i < envs.length; i++) {
        for (let j = i + 1; j < envs.length; j++) {
          const [a, b] = [envs[i], envs[j]]
          const overlap =
            a.col < b.col + b.cols &&
            b.col < a.col + a.cols &&
            a.row < b.row + b.rows &&
            b.row < a.row + a.rows
          expect(overlap, `${a.name} overlaps ${b.name}`).toBe(false)
        }
      }
      for (const env of envs) {
        expect(env.col).toBeGreaterThan(0)
        expect(env.row).toBeGreaterThan(0)
        expect(env.col + env.cols).toBeLessThan(model.columns)
        expect(env.row + env.rows).toBeLessThan(model.rows)
      }
    })

    it('does not put a building on a street, an avenue or the front road', () => {
      for (const c of model.containers) {
        const env = c.env
        const roads: Box[] = [
          ...env.networks
            .filter((n) => n.street)
            .map((n) => ({
              name: n.name,
              c0: n.col0,
              c1: n.col1,
              r0: n.row - 0.5,
              r1: n.row + 0.5,
            })),
          ...env.avenues.map((a) => ({
            name: 'avenue',
            c0: a.col - 0.5,
            c1: a.col + 0.5,
            r0: a.row0,
            r1: a.row1,
          })),
          ...env.roads.map((r) => ({
            name: 'road',
            c0: r.col0 - 0.5,
            c1: r.col1 + 0.5,
            r0: r.row - 0.5,
            r1: r.row + 0.5,
          })),
          {
            name: 'front road',
            c0: env.gate[0],
            c1: env.col + env.cols,
            r0: env.frontRow - 0.5,
            r1: env.frontRow + 0.5,
          },
        ]
        for (const r of roads) {
          const hit = c.col < r.c1 && c.col + c.w > r.c0 && c.row < r.r1 && c.row + c.d > r.r0
          expect(hit, `${c.name} on ${r.name}`).toBe(false)
        }
      }
    })

    it('routes every link on the ground in straight segments, or as an arc', () => {
      for (const l of model.links) {
        if (l.arc) continue
        expect(l.path.length, l.id).toBeGreaterThanOrEqual(2)
        for (let i = 1; i < l.path.length; i++) {
          const [a, b] = [l.path[i - 1], l.path[i]]
          const straight = Math.abs(a[0] - b[0]) < 1e-6 || Math.abs(a[1] - b[1]) < 1e-6
          expect(straight, l.id).toBe(true)
        }
        const end = pointAlong(l, l.lengths[l.lengths.length - 1])
        expect(end[0]).toBeCloseTo(l.path[l.path.length - 1][0])
      }
    })

    it('connects each container to its streets', () => {
      for (const c of model.containers) {
        const streets = c.attachments.filter((a) => a.network.street)
        expect(c.driveways.length + c.flyovers.length).toBe(streets.length)
      }
    })

    it('runs: requests arrive, pulses stay bounded', () => {
      const fresh = buildContainersModel(spec)
      const sim = new ContainersSimulation(fresh, createRandom(7))
      for (let i = 0; i < 3000; i++) sim.step(1 / 30)
      expect(sim.totalRequests).toBeGreaterThan(20)
      for (const l of fresh.links) expect(l.pulses.length).toBeLessThanOrEqual(14)
    })
  },
)

describe('isocontainers plates', () => {
  const model = buildContainersModel(PROJECTS)
  const env = model.environments[0]

  it('wraps many small districts into lines, so the plate is about square', () => {
    expect(env.roads.length).toBeGreaterThan(1)
    expect(env.cols / env.rows).toBeLessThan(1.8)
    expect(env.cols / env.rows).toBeGreaterThan(0.55)
    // the spine joins the roads of the lines to the gate
    const spine = env.avenues.find((a) => a.col === env.gate[0])!
    expect(spine.row0).toBe(env.roads[0].row)
    expect(spine.row1).toBe(env.frontRow)
  })

  it('routes ingress up the spine to the road of its line', () => {
    const back = model.links.filter(
      (l) => l.kind === 'ingress' && l.path[1][1] < env.frontRow - 1e-6,
    )
    expect(back.length).toBeGreaterThan(0)
    for (const l of back) {
      expect(l.path[0]).toEqual(env.gate)
      expect(env.roads.some((r) => Math.abs(r.row - l.path[1][1]) < 1e-6)).toBe(true)
    }
  })

  it('keeps the volumes nobody mounts in a compact yard', () => {
    const yard = model.volumes.filter((v) => !v.mounts.length)
    expect(yard).toHaveLength(21)
    const cols = new Set(yard.map((v) => v.col.toFixed(2))).size
    const rows = new Set(yard.map((v) => v.row.toFixed(2))).size
    expect(cols).toBeLessThanOrEqual(7)
    expect(rows).toBeLessThanOrEqual(5)
    // named before anonymous
    const order = [...yard].sort((a, b) => a.row - b.row || a.col - b.col)
    expect(order[0].anonymous).toBe(false)
    expect(order[order.length - 1].anonymous).toBe(true)
  })

  it('keeps a plate of a few districts in one line', () => {
    for (const s of SAMPLES)
      for (const e of buildContainersModel(s).environments)
        expect(e.roads.length, `${s.id} ${e.name}`).toBeLessThanOrEqual(1)
  })
})

describe('isocontainers failures', () => {
  it('fails the requests to a stopped container', () => {
    const model = buildContainersModel(SAMPLES[0])
    const sim = new ContainersSimulation(model, createRandom(3))
    const db = model.containers.find((c) => c.name === 'postgres')!
    sim.stop(db)
    for (let i = 0; i < 1500; i++) sim.step(1 / 30)
    expect(db.errors).toBeGreaterThan(0)
    expect(db.requests).toBe(0)
    sim.start(db)
    for (let i = 0; i < 1500; i++) sim.step(1 / 30)
    expect(db.state).toBe('running')
    expect(db.requests).toBeGreaterThan(0)
  })
})

describe('isocontainers states', () => {
  it('shows every state, and what breaks', () => {
    const model = buildContainersModel(SAMPLES.find((s) => s.id === 'states')!)
    const c = (name: string) => model.containers.find((x) => x.name === name)!
    expect(new Set(model.containers.map((x) => x.state))).toEqual(
      new Set(['running', 'restarting', 'paused', 'exited', 'dead', 'created']),
    )
    expect(stateText(c('redis'))).toBe('EXITED (137)')
    expect(stateText(c('api-3'))).toBe('STARTING')
    // a clean exit is not an error
    expect(stateColor(c('migrate'))).not.toBe(stateColor(c('redis')))

    const sim = new ContainersSimulation(model, createRandom(5))
    for (let i = 0; i < 1500; i++) sim.step(1 / 30)
    expect(c('redis').errors).toBeGreaterThan(0)
    expect(c('postgres').requests).toBeGreaterThan(0)
    // frozen and crash looping containers send nothing
    for (const name of ['scheduler', 'worker'])
      expect(c(name).out.every((l) => l.pulses.length === 0)).toBe(true)
  })
})
