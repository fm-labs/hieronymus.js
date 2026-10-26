/**
 * Turns a containers spec into a model with a sim-city layout. Pure, no engine imports.
 *
 * Each environment is a plate. Its networks are streets, running along the columns and stacked along
 * the rows; the containers are buildings on lots between the streets, with a driveway to each street
 * (network) they join. A container on two networks sits between both streets. Named volumes are
 * storage tanks on the lot of the first container that mounts them. An avenue along the left edge
 * links the streets to the host gate, where published ports come in. Internal networks don't touch it.
 *
 * Calls between containers are routed driveway → street → driveway; where there is no shared
 * street (or for a second mount of a volume) the link is an arc through the air.
 */
import { guessKind } from './isocontainers.import.ts'
import { resolveLook, type StyleRule } from './isocontainers.styles.ts'
import {
  type Attachment,
  type Container,
  type ContainerKind,
  type ContainerSpec,
  type ContainersModel,
  type ContainersSpec,
  type Environment,
  type EnvironmentSpec,
  type GridPoint,
  type Link,
  type Mount,
  type MountSpec,
  type Network,
  type Port,
  type Volume,
} from './isocontainers.types.ts'

/** Sizes in cells */
export const LOT = {
  w: 2.5,
  d: 2,
  tankR: 0.42,
  tankGap: 0.3,
  gap: 1.4,
  street: 1.1,
  drive: 0.95,
  empty: 0.9,
  avenue: 1.1,
  pad: 1.4,
  /** Room at the front of a plate for its name and the gate */
  front: 2.6,
  envGap: 5,
  districtGap: 2.2,
  margin: 4,
}

/** The accents of the streets, in order */
export const ACCENTS = [
  '#3ee07f',
  '#4cc9f0',
  '#a78bfa',
  '#ffc04d',
  '#ff7eb6',
  '#c3f73a',
  '#7aa2ff',
  '#ff9f5a',
]

const HEIGHTS: Record<ContainerKind, number> = {
  proxy: 30,
  web: 40,
  app: 48,
  worker: 36,
  database: 58,
  cache: 30,
  queue: 40,
  storage: 46,
  monitor: 36,
  tool: 24,
}

/** The order of the buildings along a street: the entrance first, the data at the end */
const KIND_ORDER: ContainerKind[] = [
  'proxy',
  'web',
  'app',
  'worker',
  'queue',
  'cache',
  'database',
  'storage',
  'monitor',
  'tool',
]

/** Requests per second of a call, by the kind of the target */
const CALL_RATE: Partial<Record<ContainerKind, number>> = {
  database: 0.6,
  cache: 0.8,
  queue: 0.45,
  storage: 0.35,
  web: 0.6,
  app: 0.55,
}

/** The height of a tank whose size is not known */
export const TANK_HEIGHT = 30

const UNITS: Record<string, number> = { B: 0, K: 1, M: 2, G: 3, T: 4, P: 5 }

/** '2.4 GB', '512MiB', '48 kB', '1.4T' → bytes; undefined when it is not a size */
export function parseSize(text: string | undefined): number | undefined {
  const m = /^\s*([\d.]+)\s*([KMGTP]?)(i?B?)\s*$/i.exec(text ?? '')
  if (!m || !Number.isFinite(Number(m[1]))) return undefined
  const unit = m[2].toUpperCase() || 'B'
  return Number(m[1]) * (m[3].toLowerCase().startsWith('i') ? 1024 : 1000) ** UNITS[unit]
}

/**
 * The height of a tank by the size of its volume, in pixels. Sizes span many orders of magnitude
 * (a 48 KB config next to a 1.4 TB blob store), so each ×10 adds the same height: 1 MB is 16 px,
 * 1 GB 43, 1 TB 70.
 */
export function tankHeight(bytes: number | undefined): number {
  if (bytes === undefined) return TANK_HEIGHT
  const decades = Math.log10(Math.max(1, bytes) / 1e6)
  return Math.round(Math.max(8, Math.min(76, 16 + decades * 9)))
}

/** '127.0.0.1:5432:5432', '8080:80', '80', '53:53/udp' */
export function parsePort(spec: string): Port | undefined {
  const [main, proto = 'tcp'] = String(spec).split('/')
  const parts = main.split(':')
  const port = Number(parts[parts.length - 1])
  if (!Number.isFinite(port)) return
  if (parts.length === 1) return { port, proto, local: false }
  const hostPort = Number(parts[parts.length - 2])
  const hostIp = parts.length > 2 ? parts.slice(0, -2).join(':') : undefined
  const local = !!hostIp && /^(127\.|::1|localhost|\[::1\])/.test(hostIp)
  return { port, proto, hostIp, hostPort: Number.isFinite(hostPort) ? hostPort : undefined, local }
}

export const isPublished = (p: Port) => p.hostPort !== undefined

const ANONYMOUS = /^[0-9a-f]{64}$/

/** Build the model of a spec: entities, layout and links */
export function buildContainersModel(
  spec: ContainersSpec,
  styleRules: StyleRule[] = spec.styles ?? [],
): ContainersModel {
  const byKey = new Map<string, Container | Network | Volume>()
  const environments = spec.environments.map((e, i) => buildEnvironment(e, i, byKey))
  const links = environments.flatMap((env, i) =>
    buildLinks(env, spec.environments[i], environments),
  )

  for (const env of environments) layoutEnvironment(env, 0, 0)
  placeEnvironments(environments)

  const containers = environments.flatMap((e) => e.containers)
  for (const c of containers) {
    c.look = resolveLook(c, styleRules)
    c.height = Math.round(c.baseHeight * c.look.scale)
  }
  for (const link of links) route(link)

  return {
    spec,
    title: spec.title,
    subtitle: spec.subtitle ?? '',
    description: spec.description ?? '',
    environments,
    containers,
    networks: environments.flatMap((e) => e.networks),
    volumes: environments.flatMap((e) => e.volumes),
    links,
    byKey,
    columns: Math.ceil(Math.max(10, ...environments.map((e) => e.col + e.cols)) + LOT.margin),
    rows: Math.ceil(Math.max(10, ...environments.map((e) => e.row + e.rows)) + LOT.margin),
  }
}

/**
 * The plates in lines on screen, left to right and top to bottom (up to three in a line, a square-ish
 * grid for more). Plates whose screen boxes don't overlap don't overlap on the grid either.
 */
function placeEnvironments(environments: Environment[]) {
  const n = environments.length
  const perLine = n <= 3 ? n : Math.ceil(Math.sqrt(n))
  // the screen box of a plate, in pixels: x = (col - row) * 32, y = (col + row) * 16
  const size = (e: Environment) => [(e.cols + e.rows) * 32, (e.cols + e.rows) * 16]
  const [gapX, gapY] = [LOT.envGap * 40, LOT.envGap * 24]
  let y = 0
  for (let i = 0; i < n; i += perLine) {
    const line = environments.slice(i, i + perLine)
    const height = Math.max(...line.map((e) => size(e)[1]))
    const total = line.reduce((w, e) => w + size(e)[0], 0) + gapX * (line.length - 1)
    let x = -total / 2
    for (const env of line) {
      const [w] = size(env)
      // the screen center of the box → the grid center of the plate
      const [sx, sy] = [x + w / 2, y + height / 2]
      const cc = (sx / 32 + sy / 16) / 2
      const rc = (sy / 16 - sx / 32) / 2
      shiftEnvironment(env, cc - env.cols / 2 - env.col, rc - env.rows / 2 - env.row)
      x += w + gapX
    }
    y += height + gapY
  }
  const left = Math.min(...environments.map((e) => e.col))
  const top = Math.min(...environments.map((e) => e.row))
  for (const env of environments) shiftEnvironment(env, LOT.margin - left, LOT.margin - top)
}

function buildEnvironment(
  spec: EnvironmentSpec,
  index: number,
  byKey: Map<string, Container | Network | Volume>,
): Environment {
  const env: Environment = {
    key: spec.name || `env${index + 1}`,
    name: spec.name || `Environment ${index + 1}`,
    caption: spec.caption,
    containers: [],
    networks: [],
    volumes: [],
    col: 0,
    row: 0,
    cols: 0,
    rows: 0,
    avenues: [],
    frontRow: 0,
    gate: [0, 0],
  }
  // two environments with the same name stay apart
  while ([...byKey.keys()].some((k) => k.startsWith(`${env.key}/`))) env.key += "'"

  const networks = new Map<string, Network>()
  const network = (name: string): Network => {
    let n = networks.get(name)
    if (!n) {
      n = {
        type: 'network',
        key: `${env.key}/network/${name}`,
        env,
        name,
        driver: name === 'host' ? 'host' : 'bridge',
        internal: false,
        members: [],
        accent: ACCENTS[0],
        row: 0,
        col0: 0,
        col1: 0,
        street: false,
        packets: 0,
      }
      networks.set(name, n)
    }
    return n
  }
  for (const s of spec.networks ?? []) {
    if (!s?.name) continue
    const n = network(s.name)
    n.driver = s.driver || n.driver
    n.subnet = s.subnet
    n.gateway = s.gateway
    n.internal = !!s.internal
    n.note = s.note
  }

  const volumes = new Map<string, Volume>()
  const volume = (name: string): Volume => {
    let v = volumes.get(name)
    if (!v) {
      v = {
        type: 'volume',
        key: `${env.key}/volume/${name}`,
        env,
        name,
        driver: 'local',
        anonymous: ANONYMOUS.test(name),
        mounts: [],
        col: 0,
        row: 0,
        r: LOT.tankR,
        height: TANK_HEIGHT,
        flash: 0,
        reads: 0,
        writes: 0,
      }
      volumes.set(name, v)
    }
    return v
  }
  for (const s of spec.volumes ?? []) {
    if (!s?.name) continue
    const v = volume(s.name)
    v.driver = s.driver || v.driver
    v.size = s.size
    v.height = tankHeight(parseSize(s.size))
    v.mountpoint = s.mountpoint
    v.note = s.note
  }

  const names = new Set<string>()
  for (const s of spec.containers ?? []) {
    if (!s?.name || names.has(s.name)) continue
    names.add(s.name)
    const c = buildContainer(s, env)
    // networks: 'none' is no network at all
    const nets = Array.isArray(s.networks)
      ? Object.fromEntries(s.networks.map((n) => [n, null]))
      : s.networks ?? { default: null }
    for (const [name, info] of Object.entries(nets)) {
      if (name === 'none') continue
      const n = network(name)
      const a: Attachment = { network: n, ip: info?.ip, aliases: info?.aliases ?? [] }
      c.attachments.push(a)
      n.members.push(c)
    }
    ;(s.mounts ?? []).forEach((m, i) => {
      const mount = parseMount(m, c, i)
      if (!mount) return
      if (mount.type === 'volume') {
        mount.volume = volume(mount.source)
        mount.volume.mounts.push(mount)
      }
      c.mounts.push(mount)
    })
    env.containers.push(c)
    byKey.set(c.key, c)
  }

  // the streets in an order that keeps the networks of a container next to each other
  env.networks = orderNetworks([...networks.values()])
  env.networks.forEach((n, i) => {
    n.accent = n.driver === 'host' ? '#e9efec' : ACCENTS[i % ACCENTS.length]
    byKey.set(n.key, n)
  })
  env.volumes = [...volumes.values()]
  env.volumes.forEach((v) => byKey.set(v.key, v))
  return env
}

function buildContainer(s: ContainerSpec, env: Environment): Container {
  const kind = s.kind ?? guessKind(s.image ?? '', s.service ?? s.name)
  return {
    type: 'container',
    key: `${env.key}/${s.name}`,
    env,
    name: s.name,
    image: s.image ?? '',
    kind,
    state: s.state ?? 'running',
    health: s.health,
    exitCode: s.exitCode,
    project: s.project,
    service: s.service,
    ports: (s.ports ?? []).map(parsePort).filter((p): p is Port => !!p),
    attachments: [],
    mounts: [],
    out: [],
    in: [],
    replicas: Math.max(1, Math.min(6, Math.round(s.replicas ?? 1))),
    command: s.command,
    restart: s.restart,
    memory: s.memory,
    cpus: s.cpus,
    created: s.created,
    labels: s.labels ?? {},
    user: s.user,
    privileged: s.privileged,
    healthcheck: s.healthcheck ?? (s.health ? true : undefined),
    note: s.note,
    look: { style: 'tower', roof: 'none', scale: 1, source: 'default' },
    inferred: false,
    col: 0,
    row: 0,
    w: LOT.w,
    d: LOT.d,
    height: HEIGHTS[kind],
    baseHeight: HEIGHTS[kind],
    driveways: [],
    flyovers: [],
    flash: 0,
    cpu: 0,
    mem: 0,
    requests: 0,
    errors: 0,
    transition: 0,
    sparks: [],
  }
}

function parseMount(m: MountSpec, c: Container, i: number): Mount | undefined {
  if (typeof m === 'string') {
    const parts = m.split(':')
    const readOnly = parts.length > 2 && /\bro\b/.test(parts[parts.length - 1])
    if (parts.length === 1) {
      // an anonymous volume
      return {
        container: c,
        type: 'volume',
        source: `${c.name}-anon-${i + 1}`,
        target: parts[0],
        readOnly,
      }
    }
    const source = parts[0]
    const bind = /^[./~]/.test(source)
    return { container: c, type: bind ? 'bind' : 'volume', source, target: parts[1], readOnly }
  }
  if (!m?.target) return
  const type = m.type ?? (m.source && /^[./~]/.test(m.source) ? 'bind' : 'volume')
  const source = m.source || (type === 'volume' ? `${c.name}-anon-${i + 1}` : '')
  return { container: c, type, source, target: m.target, readOnly: !!m.readOnly }
}

/**
 * A greedy linear order: start with the biggest network, then keep adding the network that shares
 * the most containers with one of the two ends. Networks without members come last.
 */
export function orderNetworks(networks: Network[]): Network[] {
  const shared = (a: Network, b: Network) => a.members.filter((c) => b.members.includes(c)).length
  const rest = networks.filter((n) => n.members.length)
  rest.sort((a, b) => b.members.length - a.members.length)
  const order: Network[] = []
  while (rest.length) {
    if (!order.length) {
      order.push(rest.shift()!)
      continue
    }
    const first = order[0]
    const last = order[order.length - 1]
    let best = 0
    let bestScore = -1
    let atStart = false
    rest.forEach((n, i) => {
      const s = Math.max(shared(n, last), shared(n, first))
      const score = s * 1000 + n.members.length
      if (score > bestScore) {
        bestScore = score
        best = i
        atStart = shared(n, first) > shared(n, last)
      }
    })
    const [n] = rest.splice(best, 1)
    if (atStart) order.unshift(n)
    else order.push(n)
  }
  return [...order, ...networks.filter((n) => !n.members.length)]
}

/** The calls of an environment: given, or (when there are none) guessed from the kinds */
function buildLinks(env: Environment, spec: EnvironmentSpec, all: Environment[]): Link[] {
  const links: Link[] = []
  const find = (name: string, caller: Container): Container | undefined => {
    // 'environment/container' calls a container on another host
    const slash = name.indexOf('/')
    const other = slash > 0 && all.find((e) => e.name === name.slice(0, slash))
    if (other) return other.containers.find((c) => c.name === name.slice(slash + 1))
    return (
      env.containers.find((c) => c.name === name) ??
      // a compose service: the one of the caller's project
      env.containers.find((c) => c.service === name && c.project === caller.project) ??
      env.containers.find((c) => c.service === name)
    )
  }
  const add = (
    from: Container | undefined,
    to: Container,
    kind: Link['kind'],
    inferred: boolean,
  ) => {
    const id = `${from?.key ?? `${env.key}/gate`}->${to.key}:${kind}`
    if (links.some((l) => l.id === id)) return
    const link: Link = {
      id,
      kind,
      env,
      from,
      to,
      inferred,
      path: [],
      lengths: [],
      rate: kind === 'ingress' ? 0.5 : CALL_RATE[to.kind] ?? 0.4,
      pulses: [],
      timer: 0,
    }
    links.push(link)
    from?.out.push(link)
    to.in.push(link)
  }
  const shares = (a: Container, b: Container) =>
    a.attachments.some((x) => b.attachments.some((y) => y.network === x.network))

  const specs = spec.containers ?? []
  let explicit = false
  for (const c of env.containers) {
    const s = specs.find((x) => x.name === c.name)
    for (const name of [...(s?.calls ?? []), ...(s?.dependsOn ?? [])]) {
      const target = find(name, c)
      if (target && target !== c) {
        add(c, target, 'call', false)
        explicit = true
      }
    }
  }

  const data = new Set<ContainerKind>(['database', 'cache', 'queue', 'storage'])
  for (const c of env.containers) {
    // a proxy that calls nobody routes to the web and app containers on its networks
    if (c.kind === 'proxy' && !c.out.length) {
      for (const t of env.containers) {
        const routed = t.labels['traefik.enable'] === 'true' || t.kind === 'web' || t.kind === 'app'
        if (t !== c && routed && shares(c, t)) {
          add(c, t, 'call', true)
          c.inferred = true
        }
      }
    }
    // without any given calls: the applications use the data stores of their project
    if (!explicit && (c.kind === 'app' || c.kind === 'web' || c.kind === 'worker')) {
      for (const t of env.containers) {
        if (t === c || !data.has(t.kind) || !shares(c, t)) continue
        if (c.project && t.project && c.project !== t.project) continue
        add(c, t, 'call', true)
        c.inferred = true
      }
    }
  }

  // traffic from the outside: published ports on all interfaces
  for (const c of env.containers) {
    if (c.ports.some((p) => isPublished(p) && !p.local)) add(undefined, c, 'ingress', false)
  }
  // volume I/O
  for (const c of env.containers) {
    for (const m of c.mounts) {
      if (!m.volume) continue
      const id = `${c.key}->${m.volume.key}:mount`
      if (links.some((l) => l.id === id)) continue
      const link: Link = {
        id,
        kind: 'mount',
        env,
        to: c,
        volume: m.volume,
        inferred: false,
        path: [],
        lengths: [],
        rate: c.kind === 'database' ? 0.5 : c.kind === 'cache' ? 0.4 : 0.2,
        pulses: [],
        timer: 0,
      }
      links.push(link)
    }
  }
  return links
}

type Lot = { container?: Container; tanks: Volume[]; width: number }

const lotWidth = (tanks: number, building = true) =>
  (building ? LOT.w : -LOT.tankGap) + tanks * (LOT.tankR * 2 + LOT.tankGap) + (tanks ? 0.1 : 0)

/**
 * An environment: its networks grouped into districts (networks connected by shared containers),
 * side by side along the columns, their fronts on one road that leads to the host gate.
 */
function layoutEnvironment(env: Environment, col0: number, row0: number) {
  const streets = env.networks.filter((n) => n.members.length && n.driver !== 'null')
  streets.forEach((n) => (n.street = true))

  const districts: Network[][] = []
  const seen = new Set<Network>()
  for (const start of streets) {
    if (seen.has(start)) continue
    seen.add(start)
    const found = new Set<Network>([start])
    const stack = [start]
    while (stack.length) {
      for (const c of stack.pop()!.members) {
        for (const a of c.attachments) {
          if (a.network.street && !seen.has(a.network)) {
            seen.add(a.network)
            found.add(a.network)
            stack.push(a.network)
          }
        }
      }
    }
    // in the street order
    districts.push(streets.filter((s) => found.has(s)))
  }
  const loose = env.containers.filter((c) => !c.attachments.some((a) => a.network.street))
  const yard = env.volumes.filter((v) => !v.mounts.length)
  if (loose.length || yard.length || !districts.length) districts.push([])

  const blocks: Block[] = []
  let x = col0 + LOT.pad
  for (const nets of districts) {
    const containers = nets.length
      ? env.containers.filter((c) => c.attachments.some((a) => nets.includes(a.network)))
      : loose
    const block = layoutBlock(nets, containers, nets.length ? [] : yard, x)
    blocks.push(block)
    x = block.right + LOT.districtGap
  }
  // the fronts of the districts in line
  const height = Math.max(...blocks.map((b) => b.bottom))
  for (const b of blocks) {
    shiftItems(b.containers, b.networks, b.volumes, 0, row0 + LOT.pad + height - b.bottom)
    b.avenueRow0 += row0 + LOT.pad + height - b.bottom
  }
  const front = row0 + LOT.pad + height + 0.4 + LOT.street / 2
  const open = blocks.filter((b) => b.open)

  env.col = col0
  env.row = row0
  env.cols = x - LOT.districtGap + LOT.pad - col0
  env.frontRow = front
  env.avenues = open.map((b) => ({ col: b.avenueCol, row0: b.avenueRow0 }))
  const gateCol = blocks[0].avenueCol
  env.gate = [gateCol, front + 1.3]
  env.rows = front + 0.7 + LOT.front - row0
}

type Block = {
  containers: Container[]
  networks: Network[]
  volumes: Volume[]
  avenueCol: number
  /** The first street the avenue reaches */
  avenueRow0: number
  /** It has a street to the outside */
  open: boolean
  right: number
  bottom: number
}

/** A district: its streets stacked along the rows, the lots between them, an avenue on its left */
function layoutBlock(
  streets: Network[],
  containers: Container[],
  yard: Volume[],
  col0: number,
): Block {
  const n = streets.length
  const index = new Map(streets.map((s, i) => [s, i]))
  const slots: Lot[][] = Array.from({ length: n + 1 }, () => [])

  const kindIndex = (c: Container) => KIND_ORDER.indexOf(c.kind)
  const sorted = [...containers].sort(
    (a, b) =>
      (a.project ?? '').localeCompare(b.project ?? '') ||
      kindIndex(a) - kindIndex(b) ||
      a.name.localeCompare(b.name),
  )
  const slotOf = new Map<Container, number>()
  const width = (k: number) => slots[k].reduce((w, l) => w + l.width + LOT.gap, 0)
  const lots = sorted.map((c) => {
    // the volumes it mounts first are on its lot
    const tanks: Volume[] = []
    for (const m of c.mounts) {
      if (m.volume && !m.volume.owner) {
        m.volume.owner = c
        tanks.push(m.volume)
      }
    }
    const idx = c.attachments
      .map((a) => index.get(a.network))
      .filter((i): i is number => i !== undefined)
      .sort((a, b) => a - b)
    return { lot: { container: c, tanks, width: lotWidth(tanks.length) } as Lot, idx }
  })
  // the containers between two streets first, then the others where there is room;
  // a tie goes to an outer row, the middle rows are for the containers on two networks
  const multi = lots.filter((l) => l.idx.length > 1)
  const single = lots.filter((l) => l.idx.length <= 1)
  for (const { lot, idx } of [...multi, ...single]) {
    let slot: number
    if (!idx.length) slot = n
    else if (idx.length === 1) {
      const [above, below] = [idx[0], idx[0] + 1]
      const outer = below === n ? below : above
      const [wa, wb] = [width(above), width(below)]
      slot = Math.abs(wa - wb) < 1e-6 ? outer : wa < wb ? above : below
    } else {
      const pair = idx.find((i) => idx.includes(i + 1))
      slot = (pair ?? idx[0]) + 1
    }
    slotOf.set(lot.container!, slot)
    slots[slot].push(lot)
  }
  // along a street: the entrance first, the data at the end
  const rank = new Map(sorted.map((c, i) => [c, i]))
  for (const row of slots) row.sort((a, b) => rank.get(a.container!)! - rank.get(b.container!)!)
  // volumes nobody mounts: a yard at the front
  for (let i = 0; i < yard.length; i += 3) {
    const tanks = yard.slice(i, i + 3)
    slots[n].push({ tanks, width: lotWidth(tanks.length, false) })
  }

  // rows, from the back: slot 0, street 0, slot 1, ..., street n-1, slot n
  const avenueCol = col0 + LOT.avenue / 2
  const x0 = n ? col0 + LOT.avenue + 1.1 : col0
  let y = 0
  const buildingRow: number[] = []
  for (let k = 0; k <= n; k++) {
    const has = slots[k].length > 0
    const before = k > 0 && has ? LOT.drive : 0
    const after = k < n && has ? LOT.drive : 0
    buildingRow.push(y + before)
    y += has ? before + LOT.d + after : k === 0 || k === n ? 0.3 : LOT.empty
    if (k < n) {
      streets[k].row = y + LOT.street / 2
      y += LOT.street
    }
  }

  let right = x0 + 4
  slots.forEach((row, k) => {
    let x = x0
    for (const lot of row) {
      const rowc = buildingRow[k] + LOT.d / 2
      let tx = x + (lot.container ? LOT.w + LOT.tankGap + 0.1 : 0) + LOT.tankR
      if (lot.container) {
        lot.container.col = x
        lot.container.row = buildingRow[k]
      }
      for (const v of lot.tanks) {
        v.col = tx
        v.row = lot.container ? rowc - 0.2 : rowc
        tx += LOT.tankR * 2 + LOT.tankGap
      }
      x += lot.width + LOT.gap
    }
    right = Math.max(right, x - LOT.gap)
  })

  for (const s of streets) s.col0 = s.internal ? x0 - 0.7 : avenueCol - LOT.avenue / 2

  // driveways to the streets next to the lot, arcs to the others
  for (const c of containers) {
    const k = slotOf.get(c)!
    const cx = c.col + c.w / 2
    for (const a of c.attachments) {
      const i = index.get(a.network)
      if (i === undefined) continue
      if (i === k - 1)
        c.driveways.push({ network: a.network, col: cx, from: c.row, to: a.network.row })
      else if (i === k)
        c.driveways.push({ network: a.network, col: cx, from: c.row + c.d, to: a.network.row })
      else c.flyovers.push(a.network)
    }
  }
  // a street ends a little after its last driveway
  for (const s of streets) {
    const cols = containers.flatMap((c) =>
      c.driveways.filter((d) => d.network === s).map((d) => d.col),
    )
    s.col1 = Math.max(s.col0 + 6, ...cols.map((c) => c + 1.6))
    right = Math.max(right, s.col1 - 0.8)
  }

  const open = streets.filter((s) => !s.internal)
  const volumes = [
    ...new Set([...containers.flatMap((c) => c.mounts.map((m) => m.volume)), ...yard]),
  ].filter((v): v is Volume => !!v && (v.owner ? containers.includes(v.owner) : true))
  return {
    containers,
    networks: streets,
    volumes,
    avenueCol,
    avenueRow0: open.length ? Math.min(...open.map((s) => s.row)) : y,
    open: open.length > 0,
    right: right + 0.8,
    bottom: y,
  }
}

function shiftItems(
  containers: Container[],
  networks: Network[],
  volumes: Volume[],
  dc: number,
  dr: number,
) {
  for (const c of containers) {
    c.col += dc
    c.row += dr
    for (const d of c.driveways) {
      d.col += dc
      d.from += dr
      d.to += dr
    }
  }
  for (const n of networks) {
    n.row += dr
    n.col0 += dc
    n.col1 += dc
  }
  for (const v of volumes) {
    v.col += dc
    v.row += dr
  }
}

function shiftEnvironment(env: Environment, dc: number, dr: number) {
  env.col += dc
  env.row += dr
  env.frontRow += dr
  env.avenues = env.avenues.map((a) => ({ col: a.col + dc, row0: a.row0 + dr }))
  env.gate = [env.gate[0] + dc, env.gate[1] + dr]
  shiftItems(
    env.containers,
    env.networks.filter((n) => n.street),
    env.volumes,
    dc,
    dr,
  )
}

/** The ground route of a link, or its arc */
function route(link: Link) {
  const { from, to, env } = link
  const center = (c: Container): [number, number, number] => [
    c.col + c.w / 2,
    c.row + c.d / 2,
    c.height,
  ]
  let path: GridPoint[] | undefined
  if (link.kind === 'mount') {
    const v = link.volume!
    if (v.owner === to) {
      const i = to.mounts.filter((m) => m.volume?.owner === to).findIndex((m) => m.volume === v)
      const pipe = to.row + to.d / 2 + 0.5 + Math.min(i, 3) * 0.12
      path = [
        [to.col + to.w, pipe],
        [v.col, pipe],
        [v.col, v.row + v.r],
      ]
    } else link.arc = { a: center(to), b: [v.col, v.row, v.height] }
  } else if (link.kind === 'ingress') {
    const d = to.driveways.find((x) => !x.network.internal)
    if (d) {
      link.network = d.network
      // the gate, the front road, the district's avenue, the street, the driveway
      const avenue = d.network.col0 + LOT.avenue / 2
      path = [
        env.gate,
        [env.gate[0], env.frontRow],
        [avenue, env.frontRow],
        [avenue, d.to],
        [d.col, d.to],
        [d.col, d.from],
      ]
    } else link.arc = { a: [env.gate[0], env.gate[1], 30], b: center(to) }
  } else if (from) {
    const d = from.driveways.find((x) => to.driveways.some((y) => y.network === x.network))
    const e = d && to.driveways.find((y) => y.network === d.network)
    if (d && e) {
      link.network = d.network
      path = [
        [d.col, d.from],
        [d.col, d.to],
        [e.col, e.to],
        [e.col, e.from],
      ]
    } else link.arc = { a: center(from), b: center(to) }
  }
  link.path = path ? simplify(path) : []
  link.lengths = [0]
  for (let i = 1; i < link.path.length; i++) {
    const [c0, r0] = link.path[i - 1]
    const [c1, r1] = link.path[i]
    link.lengths.push(link.lengths[i - 1] + Math.abs(c1 - c0) + Math.abs(r1 - r0))
  }
}

/** Drop repeated points and the points in the middle of straight runs */
function simplify(points: GridPoint[]): GridPoint[] {
  const out: GridPoint[] = []
  const same = (a: number, b: number) => Math.abs(a - b) < 1e-6
  for (const p of points) {
    const last = out[out.length - 1]
    if (last && same(last[0], p[0]) && same(last[1], p[1])) continue
    const prev = out[out.length - 2]
    if (
      prev &&
      last &&
      ((same(prev[0], last[0]) && same(last[0], p[0])) ||
        (same(prev[1], last[1]) && same(last[1], p[1])))
    ) {
      out[out.length - 1] = p
      continue
    }
    out.push(p)
  }
  return out
}

/** Resolve the looks again (the rules changed), and the heights that come with them */
export function applyLooks(model: ContainersModel, styleRules: StyleRule[]) {
  for (const c of model.containers) c.look = resolveLook(c, styleRules)
  updateHeights(model)
}

/**
 * Set each building's height from its look (its kind's height times the style's scale), and move the
 * ends of the arcs that start or end on a roof with it.
 */
export function updateHeights(model: ContainersModel) {
  for (const c of model.containers) c.height = Math.round(c.baseHeight * c.look.scale)
  for (const l of model.links) {
    if (!l.arc) continue
    if (l.kind === 'mount') l.arc.a[2] = l.to.height
    else {
      if (l.from) l.arc.a[2] = l.from.height
      l.arc.b[2] = l.to.height
    }
  }
}

/** The total length of a link, in cells; arcs count their ground distance */
export function linkLength(link: Link): number {
  if (link.arc) {
    const { a, b } = link.arc
    return Math.max(2, Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]))
  }
  return link.lengths[link.lengths.length - 1] || 1
}

/**
 * The grid point at a distance (in cells) along a ground link, moved sideways by an offset
 * (to the right of the direction of travel), so requests and replies use their own lanes.
 */
export function pointAlong(link: Link, distance: number, offset = 0): GridPoint {
  const { path, lengths } = link
  if (!path.length) return [0, 0]
  let i = 1
  while (i < path.length - 1 && distance > lengths[i]) i++
  const [c0, r0] = path[i - 1]
  const [c1, r1] = path[Math.min(i, path.length - 1)]
  const len = lengths[i] - lengths[i - 1] || 1
  const t = Math.max(0, Math.min(1, (distance - lengths[i - 1]) / len))
  const dc = (c1 - c0) / len
  const dr = (r1 - r0) / len
  // right of the direction of travel, on the grid (iso: +col is down-right, +row is down-left)
  return [c0 + (c1 - c0) * t - dr * offset, r0 + (r1 - r0) * t + dc * offset]
}

/** The ground path between two distances, with the same sideways offset */
export function subPath(link: Link, d0: number, d1: number, offset = 0): GridPoint[] {
  const points: GridPoint[] = [pointAlong(link, d0, offset)]
  for (let i = 1; i < link.path.length - 1; i++) {
    if (link.lengths[i] > d0 && link.lengths[i] < d1) {
      // a corner: the offset of the segment before it and the one after it, combined
      const [a, b] = [
        pointAlong(link, link.lengths[i] - 1e-3, offset),
        pointAlong(link, link.lengths[i] + 1e-3, offset),
      ]
      const [c, r] = link.path[i]
      points.push([c + (a[0] - c) + (b[0] - c), r + (a[1] - r) + (b[1] - r)])
    }
  }
  points.push(pointAlong(link, d1, offset))
  return points
}

/** Everything directly connected to an entity, and the links between them */
export function neighborhood(
  entity: Container | Network | Volume,
  model: ContainersModel,
): Set<unknown> {
  const result = new Set<unknown>([entity])
  if (entity.type === 'container') {
    for (const l of [...entity.out, ...entity.in]) {
      result.add(l)
      if (l.from) result.add(l.from)
      result.add(l.to)
      if (l.network) result.add(l.network)
    }
    for (const a of entity.attachments) result.add(a.network)
    for (const m of entity.mounts) if (m.volume) result.add(m.volume)
    for (const l of model.links) if (l.kind === 'mount' && l.to === entity) result.add(l)
  } else if (entity.type === 'network') {
    for (const c of entity.members) result.add(c)
    for (const l of model.links) if (l.network === entity) result.add(l)
  } else {
    for (const m of entity.mounts) result.add(m.container)
    for (const l of model.links) if (l.volume === entity) result.add(l)
  }
  return result
}
