/**
 * Turns real docker data into environment specs. Pure, no engine imports.
 *
 * Accepted input (the launcher's ?graph=<url>, comma separated for several hosts):
 * - a ContainersSpec ({ title, environments }) or one EnvironmentSpec ({ name, containers })
 * - the output of `docker inspect $(docker ps -aq)`: an array of containers; it may also hold the
 *   output of `docker network inspect` and `docker volume inspect` (they are told apart by their fields)
 * - the output of `docker compose config --format json`
 */
import type {
  ContainerKind,
  ContainerSpec,
  ContainersSpec,
  EnvironmentSpec,
  MountSpec,
  NetworkSpec,
  VolumeSpec,
} from './isocontainers.types.ts'

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

const KIND_RULES: Array<[ContainerKind, RegExp]> = [
  ['proxy', /traefik|nginx|caddy|haproxy|envoy|kong|apisix|ingress/],
  [
    'database',
    /postgres|postgis|mysql|mariadb|mongo|cockroach|clickhouse|cassandra|scylla|timescale|influx|elasticsearch|opensearch|couchdb|neo4j|mssql|surreal|questdb/,
  ],
  ['cache', /redis|memcache|valkey|keydb|dragonfly/],
  ['queue', /rabbitmq|kafka|nats|zookeeper|redpanda|activemq|mosquitto|emqx|pulsar/],
  ['storage', /minio|seaweed|garage|azurite|localstack|ceph/],
  [
    'monitor',
    /prometheus|grafana|loki|promtail|cadvisor|node-exporter|alertmanager|jaeger|tempo|otel|uptime-kuma|netdata|vector|fluent/,
  ],
  ['tool', /portainer|adminer|pgadmin|mailhog|mailpit|watchtower|registry|dozzle|whoami|busybox/],
]

/** A good guess of what a container does, from its image and its name */
export function guessKind(image: string, name = ''): ContainerKind {
  // the image name without the registry and the tag
  const repo = image
    .toLowerCase()
    .split('@')[0]
    .replace(/:[^/:]*$/, '')
  const base = repo.split('/').slice(-2).join('/')
  for (const [kind, re] of KIND_RULES) if (re.test(base)) return kind
  const n = `${name} ${base}`.toLowerCase()
  if (/worker|job|cron|consumer|scheduler|celery|sidekiq|queue/.test(n)) return 'worker'
  if (/\bweb\b|-web|web-|\bui\b|-ui|ui-|frontend|client|docs|site|next|nuxt|vite|static/.test(n))
    return 'web'
  return 'app'
}

const isRecord = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v)

/** True for a docker inspect array (containers, maybe networks and volumes) */
export const isInspectOutput = (data: unknown): data is Json[] =>
  Array.isArray(data) && data.some((d) => isRecord(d) && isRecord(d.Config) && isRecord(d.State))

/** True for the output of `docker compose config --format json` */
export const isComposeOutput = (data: unknown): data is Json =>
  isRecord(data) && isRecord(data.services) && !Array.isArray(data.environments)

/** The network address of an IP with a prefix: 172.23.0.5/16 → 172.23.0.0/16 */
export function subnetOf(ip: string, prefix: number): string | undefined {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((p) => !(p >= 0 && p <= 255)) || !(prefix > 0)) return
  const value = parts.reduce((v, p) => v * 256 + p, 0)
  const size = 2 ** (32 - prefix)
  const base = Math.floor(value / size) * size
  const octets = [24, 16, 8, 0].map((s) => Math.floor(base / 2 ** s) % 256)
  return `${octets.join('.')}/${prefix}`
}

const formatBytes = (bytes: number): string | undefined => {
  if (!(bytes > 0)) return
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
  let v = bytes
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`
}

/** `docker inspect` output → one environment */
export function fromInspect(data: Json[], name = 'docker host', caption?: string): EnvironmentSpec {
  const containers: ContainerSpec[] = []
  const networks = new Map<string, NetworkSpec>()
  const volumes = new Map<string, VolumeSpec>()

  for (const d of data) {
    if (!isRecord(d)) continue
    if (isRecord(d.IPAM) && d.Name) {
      // docker network inspect
      const ipam = Array.isArray(d.IPAM.Config) ? d.IPAM.Config[0] : undefined
      networks.set(d.Name, {
        name: d.Name,
        driver: d.Driver,
        internal: !!d.Internal,
        subnet: ipam?.Subnet,
        gateway: ipam?.Gateway,
      })
      continue
    }
    if (d.Mountpoint && d.Name && !d.Config) {
      // docker volume inspect
      volumes.set(d.Name, {
        name: d.Name,
        driver: d.Driver,
        mountpoint: d.Mountpoint,
        size: formatBytes(d.UsageData?.Size),
      })
      continue
    }
    if (!isRecord(d.Config) || !isRecord(d.State)) continue

    const labels: Record<string, string> = isRecord(d.Config.Labels) ? d.Config.Labels : {}
    const ports: string[] = []
    const portMap: Json = d.NetworkSettings?.Ports ?? d.HostConfig?.PortBindings ?? {}
    for (const [key, bindings] of Object.entries(portMap)) {
      const [port, proto = 'tcp'] = key.split('/')
      const suffix = proto === 'tcp' ? '' : `/${proto}`
      // one binding per host port (docker lists 0.0.0.0 and :: separately)
      const seen = new Set<string>()
      for (const b of Array.isArray(bindings) ? bindings : []) {
        if (!b?.HostPort || seen.has(b.HostPort)) continue
        seen.add(b.HostPort)
        const ip = b.HostIp && b.HostIp !== '0.0.0.0' && b.HostIp !== '::' ? `${b.HostIp}:` : ''
        ports.push(`${ip}${b.HostPort}:${port}${suffix}`)
      }
      if (!seen.size) ports.push(`${port}${suffix}`)
    }

    const nets: Record<string, { ip?: string; aliases?: string[] }> = {}
    for (const [net, info] of Object.entries<Json>(d.NetworkSettings?.Networks ?? {})) {
      nets[net] = {
        ip: info?.IPAddress || undefined,
        aliases: (info?.Aliases ?? []).filter((a: string) => typeof a === 'string'),
      }
      if (!networks.has(net)) {
        networks.set(net, {
          name: net,
          driver: net === 'host' ? 'host' : net === 'none' ? 'null' : 'bridge',
          subnet: info?.IPAddress ? subnetOf(info.IPAddress, info.IPPrefixLen) : undefined,
          gateway: info?.Gateway || undefined,
        })
      }
    }

    const mounts: MountSpec[] = (Array.isArray(d.Mounts) ? d.Mounts : []).map((m: Json) => ({
      type: m.Type === 'bind' || m.Type === 'tmpfs' ? m.Type : 'volume',
      source: m.Type === 'volume' ? m.Name : m.Source,
      target: m.Destination,
      readOnly: m.RW === false,
    }))

    const health = d.State.Health?.Status
    const dependsOn = String(labels['com.docker.compose.depends_on'] ?? '')
      .split(',')
      .map((s) => s.split(':')[0].trim())
      .filter(Boolean)
    const containerName = String(d.Name ?? d.Id ?? 'container').replace(/^\//, '')
    const image = String(d.Config.Image ?? d.Image ?? '')
    containers.push({
      name: containerName,
      image,
      kind: guessKind(image, labels['com.docker.compose.service'] ?? containerName),
      state: d.State.Status,
      exitCode: d.State.Status === 'exited' ? d.State.ExitCode : undefined,
      health:
        health === 'healthy' || health === 'unhealthy' || health === 'starting'
          ? health
          : undefined,
      project: labels['com.docker.compose.project'],
      service: labels['com.docker.compose.service'],
      ports,
      networks: nets,
      mounts,
      dependsOn,
      command: [d.Path, ...(Array.isArray(d.Args) ? d.Args : [])].filter(Boolean).join(' '),
      restart: d.HostConfig?.RestartPolicy?.Name || undefined,
      memory: formatBytes(d.HostConfig?.Memory),
      cpus: d.HostConfig?.NanoCpus ? d.HostConfig.NanoCpus / 1e9 : undefined,
      created: d.Created,
      labels,
      user: String(d.Config.User ?? '') || 'root',
      privileged: !!d.HostConfig?.Privileged,
      healthcheck: hasHealthcheck(d.Config.Healthcheck),
    })
  }
  return {
    name,
    caption: caption ?? `${containers.length} containers`,
    containers,
    networks: [...networks.values()],
    volumes: [...volumes.values()],
  }
}

/** A health check that is not switched off ({ Test: ['NONE'] }) */
const hasHealthcheck = (h: Json) =>
  isRecord(h) && !(Array.isArray(h.Test ?? h.test) && (h.Test ?? h.test)[0] === 'NONE')

/** `docker compose config --format json` → one environment */
export function fromCompose(data: Json, name?: string): EnvironmentSpec {
  const project = String(data.name ?? name ?? 'compose')
  const services: Json = data.services ?? {}
  const containers: ContainerSpec[] = []
  for (const [service, s] of Object.entries<Json>(services)) {
    if (!isRecord(s)) continue
    const ports: string[] = (Array.isArray(s.ports) ? s.ports : []).map((p: Json | string) => {
      if (typeof p === 'string') return p
      const proto = p.protocol && p.protocol !== 'tcp' ? `/${p.protocol}` : ''
      if (!p.published) return `${p.target}${proto}`
      const ip = p.host_ip && p.host_ip !== '0.0.0.0' ? `${p.host_ip}:` : ''
      return `${ip}${p.published}:${p.target}${proto}`
    })
    const nets: Record<string, { ip?: string; aliases?: string[] }> = {}
    const sn = s.networks ?? (s.network_mode ? {} : { default: null })
    if (Array.isArray(sn)) sn.forEach((n: string) => (nets[n] = {}))
    else
      for (const [n, info] of Object.entries<Json>(sn))
        nets[n] = { ip: info?.ipv4_address, aliases: info?.aliases }
    if (s.network_mode === 'host') nets.host = {}

    const mounts: MountSpec[] = (Array.isArray(s.volumes) ? s.volumes : []).map(
      (v: Json | string) =>
        typeof v === 'string'
          ? v
          : {
              type: v.type === 'bind' || v.type === 'tmpfs' ? v.type : 'volume',
              source: v.source,
              target: v.target,
              readOnly: !!v.read_only,
            },
    )
    const dependsOn = Array.isArray(s.depends_on)
      ? s.depends_on
      : Object.entries<Json>(s.depends_on ?? {})
          // one-off jobs (migrations) are dependencies, not services that get requests
          .filter(([, c]) => c?.condition !== 'service_completed_successfully')
          .map(([k]) => k)
    const image = String(s.image ?? `${project}-${service}`)
    containers.push({
      name: s.container_name ?? service,
      image,
      kind: guessKind(image, service),
      state: 'running',
      project,
      service,
      ports,
      networks: nets,
      mounts,
      dependsOn,
      replicas: s.deploy?.replicas ?? s.scale,
      command: Array.isArray(s.command) ? s.command.join(' ') : s.command,
      restart: s.restart,
      memory: s.deploy?.resources?.limits?.memory ?? s.mem_limit,
      cpus: Number(s.deploy?.resources?.limits?.cpus ?? s.cpus) || undefined,
      labels: isRecord(s.labels) ? s.labels : {},
      user: s.user,
      privileged: s.privileged,
      healthcheck: s.healthcheck
        ? !s.healthcheck.disable && hasHealthcheck(s.healthcheck)
        : undefined,
    })
  }
  const networks: NetworkSpec[] = Object.entries<Json>(data.networks ?? {}).map(([key, n]) => ({
    name: key,
    driver: n?.driver,
    internal: !!n?.internal,
    subnet: n?.ipam?.config?.[0]?.subnet,
    gateway: n?.ipam?.config?.[0]?.gateway,
    note: n?.name && n.name !== key ? `docker name: ${n.name}` : undefined,
  }))
  const volumes: VolumeSpec[] = Object.entries<Json>(data.volumes ?? {}).map(([key, v]) => ({
    name: key,
    driver: v?.driver,
    note: v?.name && v.name !== key ? `docker name: ${v.name}` : undefined,
  }))
  return {
    name: name ?? project,
    caption: `compose · ${containers.length} services`,
    containers,
    networks,
    volumes,
  }
}

/** Any accepted input → environments (a name for those that have none) */
export function toEnvironments(data: unknown, name: string): EnvironmentSpec[] {
  if (isInspectOutput(data)) return [fromInspect(data, name)]
  if (isRecord(data) && Array.isArray(data.environments))
    return (data as ContainersSpec).environments
  if (isComposeOutput(data)) return [fromCompose(data, data.name ? undefined : name)]
  if (isRecord(data) && Array.isArray(data.containers))
    return [{ ...(data as EnvironmentSpec), name: data.name ?? name }]
  throw new Error(`${name}: not a container environment, docker inspect or compose output`)
}
