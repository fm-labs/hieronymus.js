/**
 * The data model of the 'isocontainers' world: one or more docker environments (hosts), each with
 * containers, networks and volumes. Specs are what a sample or a JSON file describes (see
 * isocontainers.import.ts for docker inspect and docker compose input), the model adds the layout
 * and the live state.
 */

export type ContainerState = 'running' | 'exited' | 'paused' | 'restarting' | 'created' | 'dead'
export type ContainerHealth = 'healthy' | 'unhealthy' | 'starting'

export type ContainerKind =
  | 'proxy'
  | 'web'
  | 'app'
  | 'worker'
  | 'database'
  | 'cache'
  | 'queue'
  | 'storage'
  | 'monitor'
  | 'tool'

/** A port: '8080:80', '127.0.0.1:5432:5432', '53:53/udp', or '80' (exposed, not published) */
export type PortSpec = string

/** A mount: '<volume>:<target>[:ro]', '/host/path:/target[:ro]', or an object */
export type MountSpec =
  | string
  | { type?: 'volume' | 'bind' | 'tmpfs'; source?: string; target: string; readOnly?: boolean }

export type ContainerSpec = {
  name: string
  image: string
  kind?: ContainerKind
  state?: ContainerState
  health?: ContainerHealth
  /** The exit code of an exited container: 0 is a clean exit, 137 killed (e.g. out of memory) */
  exitCode?: number
  /** The compose project and service */
  project?: string
  service?: string
  ports?: PortSpec[]
  /** Network names, or name → address and aliases */
  networks?: string[] | Record<string, { ip?: string; aliases?: string[] } | null>
  mounts?: MountSpec[]
  /** Containers (names or services) this one sends requests to */
  calls?: string[]
  /** Like docker compose: also a call, unless the dependency is a one-off job */
  dependsOn?: string[]
  replicas?: number
  command?: string
  restart?: string
  /** e.g. '512 MiB' */
  memory?: string
  cpus?: number
  created?: string
  labels?: Record<string, string>
  note?: string
}

export type NetworkSpec = {
  name: string
  driver?: string
  subnet?: string
  gateway?: string
  /** No route to the outside world */
  internal?: boolean
  note?: string
}

export type VolumeSpec = {
  name: string
  driver?: string
  /** e.g. '2.4 GB' */
  size?: string
  mountpoint?: string
  note?: string
}

export type EnvironmentSpec = {
  name: string
  /** The small caption next to the name, e.g. the docker version or the host's address */
  caption?: string
  containers?: ContainerSpec[]
  networks?: NetworkSpec[]
  volumes?: VolumeSpec[]
}

export type ContainersSpec = {
  id?: string
  title: string
  subtitle?: string
  description?: string
  environments: EnvironmentSpec[]
}

/** A grid point: [col, row] */
export type GridPoint = [number, number]

export type Port = {
  /** The container port */
  port: number
  proto: string
  /** The host side, when published */
  hostIp?: string
  hostPort?: number
  /** Published on the loopback interface only */
  local: boolean
}

export type Attachment = {
  network: Network
  ip?: string
  aliases: string[]
}

export type Mount = {
  container: Container
  type: 'volume' | 'bind' | 'tmpfs'
  /** The volume, for named volumes */
  volume?: Volume
  source: string
  target: string
  readOnly: boolean
}

/** A vertical driveway from a building to a street, along the rows at a column */
export type Driveway = {
  network: Network
  col: number
  /** The edge of the building, and the center line of the street */
  from: number
  to: number
}

export type Container = {
  type: 'container'
  /** Unique in the model: environment/name */
  key: string
  env: Environment
  name: string
  image: string
  kind: ContainerKind
  state: ContainerState
  health?: ContainerHealth
  exitCode?: number
  project?: string
  service?: string
  ports: Port[]
  attachments: Attachment[]
  mounts: Mount[]
  /** Links this container starts (calls), and links that end at it (calls and ingress) */
  out: Link[]
  in: Link[]
  replicas: number
  command?: string
  restart?: string
  memory?: string
  cpus?: number
  created?: string
  labels: Record<string, string>
  note?: string
  /** The calls were guessed (no depends_on or calls in the input) */
  inferred: boolean
  // layout: the building's footprint, its height in pixels, the driveways to its streets
  col: number
  row: number
  w: number
  d: number
  height: number
  driveways: Driveway[]
  /** Networks it joins that are not next to its lot: drawn as arcs */
  flyovers: Network[]
  // live state
  /** 0..1, flashes when a request arrives */
  flash: number
  cpu: number
  mem: number
  requests: number
  errors: number
  /** Seconds left while starting or stopping */
  transition: number
  /** Ages (seconds) of the recent arrivals: a ripple on the roof for each, sparks for the failed ones */
  pings: number[]
  sparks: number[]
}

export type Network = {
  type: 'network'
  key: string
  env: Environment
  name: string
  driver: string
  subnet?: string
  gateway?: string
  internal: boolean
  note?: string
  members: Container[]
  /** The accent color of the street */
  accent: string
  // layout: the street's center row, and the columns it spans
  row: number
  col0: number
  col1: number
  /** Has a street (networks without members, 'host' and 'none' don't) */
  street: boolean
  // live state
  packets: number
}

export type Volume = {
  type: 'volume'
  key: string
  env: Environment
  name: string
  driver: string
  size?: string
  mountpoint?: string
  note?: string
  /** A docker generated name (64 hex digits) */
  anonymous: boolean
  mounts: Mount[]
  /** The container whose lot holds the tank */
  owner?: Container
  // layout: the center of the tank and its radius, in cells
  col: number
  row: number
  r: number
  // live state
  flash: number
  reads: number
  writes: number
}

export type Environment = {
  key: string
  name: string
  caption?: string
  containers: Container[]
  networks: Network[]
  volumes: Volume[]
  // layout: the plate; the front road to the gate, with an avenue up into each district; the gate
  col: number
  row: number
  cols: number
  rows: number
  frontRow: number
  avenues: Array<{ col: number; row0: number }>
  gate: GridPoint
}

export type LinkKind = 'call' | 'ingress' | 'mount'

export type Pulse = {
  /** 0..1 along the link */
  t: number
  /** A read: it flows back from the volume to the container */
  back: boolean
  /** A request to a container that is down: drawn red */
  failed: boolean
  /** The head has reached the target; the tail is draining in */
  arrived: boolean
}

export type Link = {
  id: string
  kind: LinkKind
  env: Environment
  /** The caller; undefined for ingress (it comes from the host gate) */
  from?: Container
  /** The callee, or the container of a mount */
  to: Container
  volume?: Volume
  /** The street it travels on */
  network?: Network
  label?: string
  /** Guessed from the images, not given */
  inferred: boolean
  /** A route on the ground, in grid coordinates */
  path: GridPoint[]
  lengths: number[]
  /** Or an arc through the air, between two points at heights (in pixels) */
  arc?: { a: [number, number, number]; b: [number, number, number] }
  /** Requests (or I/O operations) per second */
  rate: number
  pulses: Pulse[]
  /** Seconds to the next request */
  timer: number
}

export type ContainersModel = {
  spec: ContainersSpec
  title: string
  subtitle: string
  description: string
  environments: Environment[]
  containers: Container[]
  networks: Network[]
  volumes: Volume[]
  links: Link[]
  byKey: Map<string, Container | Network | Volume>
  columns: number
  rows: number
}

export type Entity = Container | Network | Volume

export const KIND_LABELS: Record<ContainerKind, string> = {
  proxy: 'Reverse proxy',
  web: 'Web frontend',
  app: 'Application',
  worker: 'Worker',
  database: 'Database',
  cache: 'Cache',
  queue: 'Message queue',
  storage: 'Object storage',
  monitor: 'Monitoring',
  tool: 'Tool',
}
