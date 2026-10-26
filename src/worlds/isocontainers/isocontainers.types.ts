/**
 * The data model of the 'isocontainers' world: one or more docker environments (hosts), each with
 * containers, networks and volumes. Specs are what a sample or a JSON file describes (see
 * isocontainers.import.ts for docker inspect and docker compose input), the model adds the layout
 * and the live state.
 */

import type { StyleRule } from './isocontainers.styles.ts'

export type ContainerState = 'running' | 'exited' | 'paused' | 'restarting' | 'created' | 'dead'
export type ContainerHealth = 'healthy' | 'unhealthy' | 'starting'

/** The architecture of a building */
export type BuildingStyle =
  | 'tower'
  | 'glass'
  | 'vault'
  | 'silo'
  | 'factory'
  | 'gatehouse'
  | 'lighthouse'
  | 'shed'
  | 'datacenter'
  | 'library'
  | 'hive'
  | 'reactor'
  | 'exchange'
  | 'warehouse'
  | 'keep'
  | 'observatory'
  | 'workshop'
  | 'kiosk'

/** What stands on a roof; its top carries the status light */
export type RoofProp =
  | 'none'
  | 'antenna'
  | 'tank'
  | 'dome'
  | 'chimney'
  | 'beacon'
  | 'vents'
  | 'fans'
  | 'crane'
  | 'observatory'

/** The resolved look of a building: its style, options, and where they came from */
export type BuildingLook = {
  style: BuildingStyle
  roof: RoofProp
  /** Times the height of its kind */
  scale: number
  accent?: string
  /** A short sign on the front, e.g. 'PG' */
  badge?: string
  /** Where the style came from, e.g. 'kind', 'rule postgres', 'label' */
  source: string
}

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
  /** The user it runs as ('root' when the image sets none); undefined when unknown */
  user?: string
  privileged?: boolean
  /** A health check is defined (undefined: unknown) */
  healthcheck?: boolean
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
  /** How buildings look, by image, kind or name (see isocontainers.styles.ts) */
  styles?: StyleRule[]
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
  user?: string
  privileged?: boolean
  healthcheck?: boolean
  note?: string
  /** What the building looks like (see isocontainers.styles.ts) */
  look: BuildingLook
  /** The calls were guessed (no depends_on or calls in the input) */
  inferred: boolean
  // layout: the building's footprint, its height in pixels, the driveways to its streets
  col: number
  row: number
  w: number
  d: number
  height: number
  /** The height by kind, before the style scales it */
  baseHeight: number
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
  /** Ages (seconds) of the recent failed requests: sparks fly off the roof for each */
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

/** The order of magnitude of a volume's size: tanks of each class have their own radius and color */
export type SizeClass = 'kb' | 'mb' | 'gb' | 'tb' | 'unknown'

export type Volume = {
  type: 'volume'
  key: string
  env: Environment
  name: string
  driver: string
  size?: string
  /** The size in bytes, when it is known */
  bytes?: number
  sizeClass: SizeClass
  mountpoint?: string
  note?: string
  /** A docker generated name (64 hex digits) */
  anonymous: boolean
  mounts: Mount[]
  /** The container whose lot holds the tank */
  owner?: Container
  // layout: the center of the tank and its radius (by size class), in cells; its height in pixels, by its size
  col: number
  row: number
  r: number
  height: number
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
  // layout: the plate; its districts in lines, a road in front of each line (the last one is the
  // front road), an avenue up into each district, a spine joining the roads (when there are several
  // lines), and the gate in front of it all
  col: number
  row: number
  cols: number
  rows: number
  /** The row of the front road */
  frontRow: number
  /** The roads along the columns, in front of each line of districts; the last is the front road */
  roads: Array<{ row: number; col0: number; col1: number }>
  /** The roads along the rows: from a district (row0) to its line's road (row1), and the spine */
  avenues: Array<{ col: number; row0: number; row1: number }>
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
