/**
 * A huge sample for the 'isocontainers' world: a fleet of dozens of hosts in three regions, generated
 * from a few host templates (edge, apps, data, search, storage, ops, ci). Everything is derived from
 * the host's index, so the fleet is the same on every load: the same incidents in the same places.
 */
import type { ContainerSpec, ContainersSpec, EnvironmentSpec } from './isocontainers.types.ts'

const REGIONS = ['eu-west', 'us-east', 'ap-south', 'us-west', 'sa-east']

/** How many hosts of each role a region has */
const ROLES: Array<[Role, number]> = [
  ['edge', 2],
  ['apps', 5],
  ['data', 2],
  ['search', 1],
  ['storage', 1],
  ['ops', 1],
]

type Role = 'edge' | 'apps' | 'data' | 'search' | 'storage' | 'ops' | 'ci'

const PRODUCTION: Partial<ContainerSpec> = {
  restart: 'unless-stopped',
  memory: '1 GiB',
  health: 'healthy',
}

/** Something off here and there, by a container's place in the fleet */
const INCIDENTS: Record<string, Partial<ContainerSpec>> = {
  'us-east-apps-3/api-2': {
    health: 'unhealthy',
    note: 'p99 latency over 2 s since the last deploy; the health check times out.',
  },
  'eu-west-apps-4/worker': {
    state: 'restarting',
    health: undefined,
    note: 'Crash loop: the queue credentials were rotated, the worker still has the old ones.',
  },
  'ap-south-data-2/valkey': {
    state: 'exited',
    exitCode: 137,
    health: undefined,
    memory: '256 MiB',
    note: 'Killed by the kernel (OOMKilled) at its 256 MiB limit.',
  },
  'us-east-search-1/opensearch-2': {
    state: 'paused',
    health: undefined,
    note: 'Paused for a snapshot that never finished.',
  },
  'eu-west-apps-2/api-1': { health: 'starting', note: 'Rolling deploy: the new version warms up.' },
  'ap-south-apps-5/web': {
    state: 'dead',
    health: undefined,
    note: 'Removal failed: device or resource busy.',
  },
  'ci/runner-3': {
    state: 'created',
    health: undefined,
    note: 'Created by the autoscaler, waiting.',
  },
}

function host(region: string, role: Role, n: number): EnvironmentSpec {
  const name = `${region}-${role}-${n}`
  const ip = `10.${REGIONS.indexOf(region) + 1}.${ROLES.findIndex(([r]) => r === role) + 1}.${10 + n}`
  // the data host an app host talks to, and the app hosts an edge host sends traffic to
  const data = (k: number) => `${region}-data-${(k % 2) + 1}`
  const apps = (k: number) =>
    [1, 2, 3, 4, 5].filter((a) => a % 2 === k % 2).map((a) => `${region}-apps-${a}`)
  let containers: ContainerSpec[] = []
  let networks: EnvironmentSpec['networks'] = []
  let volumes: EnvironmentSpec['volumes'] = []
  switch (role) {
    case 'edge':
      networks = [{ name: 'public' }]
      volumes = [{ name: 'acme', size: '96 KB' }]
      containers = [
        {
          name: 'traefik',
          image: 'traefik:v3.1',
          ports: ['80:80', '443:443'],
          networks: ['public'],
          mounts: ['acme:/letsencrypt'],
          calls: ['varnish', ...apps(n).map((a) => `${a}/web`)],
        },
        {
          name: 'varnish',
          image: 'varnish:7.5',
          kind: 'cache',
          networks: ['public'],
        },
      ]
      break
    case 'apps':
      networks = [{ name: 'app' }]
      containers = [
        {
          name: 'web',
          image: 'company/web:12.4.1',
          kind: 'web',
          networks: ['app'],
          calls: ['api-1'],
        },
        {
          name: 'api-1',
          image: 'company/api:12.4.1',
          kind: 'app',
          networks: ['app'],
          calls: ['redis', `${data(n)}/pgbouncer`],
        },
        {
          name: 'api-2',
          image: 'company/api:12.4.1',
          kind: 'app',
          networks: ['app'],
          calls: ['redis'],
        },
        {
          name: 'worker',
          image: 'company/worker:12.4.1',
          kind: 'worker',
          networks: ['app'],
          replicas: 2,
          calls: ['redis'],
        },
        { name: 'redis', image: 'redis:7-alpine', networks: ['app'] },
      ]
      break
    case 'data':
      networks = [{ name: 'db', internal: true }]
      volumes = [
        { name: 'pg-primary', size: `${120 + n * 40} GB` },
        { name: 'pg-replica', size: `${120 + n * 40} GB` },
        { name: 'kafka-logs', size: '640 GB' },
      ]
      containers = [
        {
          name: 'pgbouncer',
          image: 'edoburu/pgbouncer:1.23',
          kind: 'proxy',
          ports: ['127.0.0.1:6432:6432'],
          networks: ['db'],
          calls: ['postgres'],
        },
        {
          name: 'postgres',
          image: 'postgres:16',
          networks: ['db'],
          mounts: ['pg-primary:/var/lib/postgresql/data'],
        },
        {
          name: 'replica',
          image: 'postgres:16',
          networks: ['db'],
          mounts: ['pg-replica:/var/lib/postgresql/data'],
        },
        {
          name: 'kafka',
          image: 'bitnami/kafka:3.7',
          networks: ['db'],
          mounts: ['kafka-logs:/bitnami/kafka'],
        },
        { name: 'valkey', image: 'valkey/valkey:8', networks: ['db'] },
      ]
      break
    case 'search':
      networks = [{ name: 'search', internal: true }]
      volumes = [
        { name: 'os-data-1', size: '1.1 TB' },
        { name: 'os-data-2', size: '1.1 TB' },
      ]
      containers = [
        {
          name: 'opensearch-1',
          image: 'opensearchproject/opensearch:2.15',
          networks: ['search'],
          mounts: ['os-data-1:/usr/share/opensearch/data'],
        },
        {
          name: 'opensearch-2',
          image: 'opensearchproject/opensearch:2.15',
          networks: ['search'],
          mounts: ['os-data-2:/usr/share/opensearch/data'],
        },
        {
          name: 'indexer',
          image: 'company/indexer:3.1.0',
          kind: 'worker',
          networks: ['search'],
          calls: ['opensearch-1', 'opensearch-2'],
        },
        {
          name: 'dashboards',
          image: 'opensearchproject/opensearch-dashboards:2.15',
          kind: 'web',
          networks: ['search'],
          calls: ['opensearch-1'],
        },
      ]
      break
    case 'storage':
      networks = [{ name: 'objects', internal: true }]
      volumes = [
        { name: 'disk-1', size: '3.6 TB' },
        { name: 'disk-2', size: '3.6 TB' },
      ]
      containers = [
        {
          name: 'minio-1',
          image: 'minio/minio:RELEASE.2024-08-03',
          networks: ['objects'],
          mounts: ['disk-1:/data'],
        },
        {
          name: 'minio-2',
          image: 'minio/minio:RELEASE.2024-08-03',
          networks: ['objects'],
          mounts: ['disk-2:/data'],
        },
        {
          name: 'backup',
          image: 'company/pg-backup:2.0',
          kind: 'worker',
          networks: ['objects'],
          calls: ['minio-1', `${region}-data-1/replica`],
        },
      ]
      break
    case 'ops':
      networks = [{ name: 'monitoring' }]
      volumes = [
        { name: 'tsdb', size: '210 GB' },
        { name: 'loki', size: '480 GB' },
      ]
      containers = [
        {
          name: 'prometheus',
          image: 'prom/prometheus:v2.54',
          kind: 'monitor',
          networks: ['monitoring'],
          mounts: ['tsdb:/prometheus'],
          calls: ['node-exporter', 'loki'],
        },
        {
          name: 'grafana',
          image: 'grafana/grafana:11.2.0',
          networks: ['monitoring'],
          calls: ['prometheus', 'loki'],
        },
        {
          name: 'loki',
          image: 'grafana/loki:3.1',
          kind: 'monitor',
          networks: ['monitoring'],
          mounts: ['loki:/loki'],
        },
        {
          name: 'alertmanager',
          image: 'prom/alertmanager:v0.27',
          kind: 'monitor',
          networks: ['monitoring'],
          calls: ['prometheus'],
        },
        {
          name: 'node-exporter',
          image: 'prom/node-exporter:v1.8.2',
          kind: 'tool',
          networks: ['monitoring'],
        },
      ]
      break
    case 'ci':
      break
  }
  return {
    name,
    caption: `${region} · ${ip}`,
    networks,
    volumes,
    containers: containers.map((c) => ({ ...PRODUCTION, ...c, ...INCIDENTS[`${name}/${c.name}`] })),
  }
}

/** The build hosts, one for the whole fleet */
function ci(): EnvironmentSpec {
  const runners: ContainerSpec[] = [1, 2, 3, 4].map((i) => ({
    name: `runner-${i}`,
    image: 'gitlab/gitlab-runner:v17.3.0',
    networks: ['build'],
    calls: ['registry'],
  }))
  return {
    name: 'ci',
    caption: 'global · 10.9.0.10',
    networks: [{ name: 'build' }],
    volumes: [{ name: 'images', size: '2.2 TB' }],
    containers: (
      [
        {
          name: 'gitlab',
          image: 'gitlab/gitlab-ce:17.3.0-ce.0',
          kind: 'app',
          networks: ['build'],
          calls: ['registry'],
        },
        {
          name: 'registry',
          image: 'registry:2',
          networks: ['build'],
          mounts: ['images:/var/lib/registry'],
        },
        ...runners,
      ] as ContainerSpec[]
    ).map((c) => ({ ...PRODUCTION, ...c, ...INCIDENTS[`ci/${c.name}`] })),
  }
}

export function massiveFleet(): ContainersSpec {
  const environments: EnvironmentSpec[] = []
  for (const region of REGIONS)
    for (const [role, count] of ROLES)
      for (let n = 1; n <= count; n++) environments.push(host(region, role, n))
  environments.push(ci())
  const containers = environments.reduce((sum, e) => sum + (e.containers?.length ?? 0), 0)
  return {
    id: 'massive',
    title: 'Planet scale.',
    subtitle: `${environments.length} hosts in ${REGIONS.length} regions, ${containers} containers.`,
    description:
      'A generated fleet: in each region two edge hosts, five app hosts, two data hosts, search, ' +
      'storage and monitoring, plus one CI host for all. A handful of incidents are spread across it: ' +
      'find them with the health bar and the explorer.',
    styles: [{ image: 'company/*', accent: '#4cc9f0' }],
    environments,
  }
}
