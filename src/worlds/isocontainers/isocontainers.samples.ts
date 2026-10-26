import devServerInspect from '../container/container.json'
import { fromInspect } from './isocontainers.import.ts'
import type { ContainersSpec } from './isocontainers.types.ts'

/** One compose stack: a shop behind a proxy, its data on an internal network */
const shop: ContainersSpec = {
  id: 'shop',
  title: 'One stack.',
  subtitle: 'A shop behind a proxy, its data on an internal network.',
  description:
    'A docker compose project: the proxy routes the web traffic to the storefront and the API, ' +
    'which use the database, the cache, the queue and the object storage on an internal network.',
  environments: [
    {
      name: 'shop',
      caption: 'docker compose · 9 services',
      networks: [
        { name: 'edge', driver: 'bridge', subnet: '172.20.0.0/24', gateway: '172.20.0.1' },
        {
          name: 'backend',
          driver: 'bridge',
          subnet: '172.21.0.0/24',
          internal: true,
          note: 'No route to the outside world: only the API and the worker reach the data.',
        },
      ],
      volumes: [
        { name: 'pgdata', size: '3.8 GB' },
        { name: 'redisdata', size: '120 MB' },
        { name: 'rabbitdata', size: '210 MB' },
        { name: 'objects', size: '14.2 GB' },
        { name: 'certs', size: '48 KB' },
      ],
      containers: [
        {
          name: 'traefik',
          image: 'traefik:v3.1',
          ports: ['80:80', '443:443'],
          networks: { edge: { ip: '172.20.0.2' } },
          mounts: ['/var/run/docker.sock:/var/run/docker.sock:ro', 'certs:/letsencrypt'],
          calls: ['storefront', 'api'],
          restart: 'unless-stopped',
          memory: '128 MiB',
        },
        {
          name: 'storefront',
          image: 'shop/storefront:2.3.1',
          kind: 'web',
          ports: ['3000'],
          networks: { edge: { ip: '172.20.0.3' } },
          calls: ['api'],
          replicas: 2,
          command: 'node server.js',
          memory: '512 MiB',
        },
        {
          name: 'api',
          image: 'shop/api:2.3.1',
          ports: ['8080'],
          networks: { edge: { ip: '172.20.0.4' }, backend: { ip: '172.21.0.4' } },
          dependsOn: ['postgres', 'redis', 'rabbitmq', 'minio'],
          health: 'healthy',
          command: 'node dist/main.js',
          memory: '1 GiB',
          cpus: 1,
        },
        {
          name: 'worker',
          image: 'shop/api:2.3.1',
          kind: 'worker',
          networks: { backend: { ip: '172.21.0.5' } },
          dependsOn: ['postgres', 'rabbitmq', 'minio'],
          replicas: 3,
          command: 'node dist/worker.js',
          memory: '512 MiB',
        },
        {
          name: 'postgres',
          image: 'postgres:16-alpine',
          ports: ['5432'],
          networks: { backend: { ip: '172.21.0.10', aliases: ['db'] } },
          mounts: ['pgdata:/var/lib/postgresql/data'],
          health: 'healthy',
          memory: '2 GiB',
        },
        {
          name: 'redis',
          image: 'redis:7-alpine',
          ports: ['6379'],
          networks: { backend: { ip: '172.21.0.11' } },
          mounts: ['redisdata:/data'],
          command: 'redis-server --appendonly yes',
        },
        {
          name: 'rabbitmq',
          image: 'rabbitmq:3.13-management',
          ports: ['5672', '127.0.0.1:15672:15672'],
          networks: { backend: { ip: '172.21.0.12' } },
          mounts: ['rabbitdata:/var/lib/rabbitmq'],
        },
        {
          name: 'minio',
          image: 'minio/minio:RELEASE.2024-08-03',
          ports: ['9000', '127.0.0.1:9001:9001'],
          networks: { backend: { ip: '172.21.0.13' } },
          mounts: ['objects:/data'],
          command: 'server /data --console-address :9001',
        },
        {
          name: 'adminer',
          image: 'adminer:4',
          state: 'exited',
          ports: ['127.0.0.1:8081:8080'],
          networks: { backend: {} },
          note: 'Started by hand when someone needs to look at the database.',
        },
      ],
    },
  ],
}

/** Several hosts: an edge, an application and a data host, and the monitoring next to them */
const fleet: ContainersSpec = {
  id: 'fleet',
  title: 'Four hosts.',
  subtitle: 'Edge, apps, data and ops, talking across the wire.',
  description:
    'A small production fleet. Calls between hosts are drawn as arcs. ' +
    'One worker keeps restarting and one API replica is unhealthy: stop the database and watch the requests fail.',
  environments: [
    {
      name: 'edge-1',
      caption: 'docker 27.3 · 10.0.1.10',
      networks: [{ name: 'public', subnet: '172.18.0.0/16' }],
      volumes: [{ name: 'acme', size: '64 KB' }],
      containers: [
        {
          name: 'caddy',
          image: 'caddy:2.8',
          ports: ['80:80', '443:443', '443:443/udp'],
          networks: ['public'],
          mounts: ['acme:/data', './Caddyfile:/etc/caddy/Caddyfile:ro'],
          calls: ['www', 'auth', 'apps-1/api-1', 'apps-1/api-2'],
        },
        {
          name: 'www',
          image: 'company/www:latest',
          kind: 'web',
          networks: ['public'],
          replicas: 2,
        },
        {
          name: 'auth',
          image: 'quay.io/keycloak/keycloak:25.0',
          kind: 'app',
          networks: ['public'],
          calls: ['data-1/pgbouncer'],
          memory: '1 GiB',
        },
      ],
    },
    {
      name: 'apps-1',
      caption: 'docker 27.3 · 10.0.2.10',
      networks: [
        { name: 'api', subnet: '172.19.0.0/16' },
        { name: 'jobs', subnet: '172.22.0.0/16', internal: true },
      ],
      containers: [
        {
          name: 'api-1',
          image: 'company/api:5.12.0',
          ports: ['8080:8080'],
          networks: ['api'],
          calls: ['redis', 'data-1/pgbouncer'],
          health: 'healthy',
        },
        {
          name: 'api-2',
          image: 'company/api:5.12.0',
          ports: ['8081:8080'],
          networks: ['api', 'jobs'],
          calls: ['redis', 'nats', 'data-1/pgbouncer'],
          health: 'unhealthy',
          note: 'The health check times out every few minutes since 5.12.0.',
        },
        {
          name: 'redis',
          image: 'valkey/valkey:8',
          networks: ['api'],
          mounts: ['/data'],
        },
        {
          name: 'nats',
          image: 'nats:2.10',
          networks: ['jobs'],
          mounts: ['jetstream:/data'],
        },
        {
          name: 'mailer',
          image: 'company/mailer:1.4.2',
          kind: 'worker',
          networks: ['jobs'],
          calls: ['nats'],
          state: 'restarting',
          restart: 'always',
          note: 'Crash loop: SMTP credentials expired.',
        },
        {
          name: 'thumbnails',
          image: 'company/thumbs:0.9.1',
          kind: 'worker',
          networks: ['jobs'],
          calls: ['nats', 'data-1/minio'],
          replicas: 4,
        },
      ],
    },
    {
      name: 'data-1',
      caption: 'docker 27.3 · 10.0.3.10',
      networks: [{ name: 'db', subnet: '172.24.0.0/16' }],
      volumes: [
        { name: 'pg-primary', size: '182 GB' },
        { name: 'pg-replica', size: '182 GB' },
        { name: 'blobs', size: '1.4 TB' },
        { name: 'backups', size: '640 GB' },
      ],
      containers: [
        {
          name: 'pgbouncer',
          image: 'edoburu/pgbouncer:1.23',
          kind: 'proxy',
          ports: ['6432:6432'],
          networks: ['db'],
          calls: ['postgres', 'replica'],
        },
        {
          name: 'postgres',
          image: 'postgres:16',
          networks: ['db'],
          mounts: ['pg-primary:/var/lib/postgresql/data'],
          health: 'healthy',
          memory: '16 GiB',
        },
        {
          name: 'replica',
          image: 'postgres:16',
          networks: ['db'],
          mounts: ['pg-replica:/var/lib/postgresql/data'],
          calls: ['postgres'],
          note: 'Streaming replication from the primary.',
        },
        {
          name: 'minio',
          image: 'minio/minio:RELEASE.2024-08-03',
          ports: ['9000:9000'],
          networks: ['db'],
          mounts: ['blobs:/data'],
        },
        {
          name: 'backup',
          image: 'company/pg-backup:2.0',
          kind: 'tool',
          state: 'exited',
          networks: ['db'],
          mounts: ['backups:/backups', 'pg-replica:/source:ro'],
          note: 'Runs nightly at 03:00 from cron.',
        },
      ],
    },
    {
      name: 'ops-1',
      caption: 'docker 27.3 · 10.0.9.10',
      networks: [{ name: 'monitoring' }],
      volumes: [
        { name: 'prometheus', size: '48 GB' },
        { name: 'grafana', size: '220 MB' },
        { name: 'loki', size: '96 GB' },
      ],
      containers: [
        {
          name: 'grafana',
          image: 'grafana/grafana:11.2.0',
          ports: ['3000:3000'],
          networks: ['monitoring'],
          mounts: ['grafana:/var/lib/grafana'],
          calls: ['prometheus', 'loki'],
        },
        {
          name: 'prometheus',
          image: 'prom/prometheus:v2.54',
          networks: ['monitoring'],
          mounts: ['prometheus:/prometheus'],
          calls: ['cadvisor', 'node-exporter', 'apps-1/api-1', 'data-1/postgres'],
        },
        {
          name: 'loki',
          image: 'grafana/loki:3.1',
          networks: ['monitoring'],
          mounts: ['loki:/loki'],
        },
        {
          name: 'cadvisor',
          image: 'gcr.io/cadvisor/cadvisor:v0.49.1',
          networks: ['monitoring'],
          mounts: ['/var/run:/var/run:ro', '/sys:/sys:ro'],
        },
        {
          name: 'node-exporter',
          image: 'prom/node-exporter:v1.8.2',
          networks: ['host'],
        },
      ],
    },
  ],
}

/** Every state a container can be in, each with a reason */
const states: ContainersSpec = {
  id: 'states',
  title: 'Monday morning.',
  subtitle: 'Every container state, and why.',
  description:
    'One project where something is off in every corner: a crash loop, an out-of-memory kill, a ' +
    'failing health check, a paused scheduler. Click a building to read why; press S to fix it.',
  environments: [
    {
      name: 'staging',
      caption: 'docker 27.3 · 10.0.4.20',
      networks: [
        { name: 'frontend', subnet: '172.30.0.0/24' },
        { name: 'backend', subnet: '172.31.0.0/24', internal: true },
      ],
      volumes: [
        { name: 'pgdata', size: '6.1 GB' },
        { name: 'search-index', size: '22 GB' },
        { name: 'backups', size: '48 GB' },
      ],
      containers: [
        {
          name: 'proxy',
          image: 'traefik:v3.1',
          ports: ['80:80', '443:443'],
          networks: ['frontend'],
          calls: ['web', 'api-1', 'api-2', 'api-3'],
          health: 'healthy',
          note: 'Running, health check passing.',
        },
        {
          name: 'web',
          image: 'company/web:7.2.0',
          kind: 'web',
          networks: ['frontend'],
          note: 'Running, no health check defined.',
        },
        {
          name: 'api-1',
          image: 'company/api:9.0.1',
          networks: ['frontend', 'backend'],
          calls: ['postgres', 'redis', 'search'],
          health: 'healthy',
          note: 'Running and healthy. Its calls to redis fail: redis was killed.',
        },
        {
          name: 'api-2',
          image: 'company/api:9.0.1',
          networks: ['frontend', 'backend'],
          calls: ['postgres', 'redis'],
          health: 'unhealthy',
          note: 'Running, but the health check fails: GET /health times out after 5 s (3 retries).',
        },
        {
          name: 'api-3',
          image: 'company/api:9.1.0-rc1',
          networks: ['frontend', 'backend'],
          calls: ['postgres'],
          health: 'starting',
          note: 'Running, health check not decided yet: still inside its 60 s start period.',
        },
        {
          name: 'worker',
          image: 'company/worker:9.0.1',
          kind: 'worker',
          state: 'restarting',
          restart: 'always',
          networks: ['backend'],
          calls: ['postgres', 'redis'],
          note: 'Crash loop: exits with code 1 a second after start (missing env var QUEUE_URL), and docker restarts it.',
        },
        {
          name: 'scheduler',
          image: 'company/worker:9.0.1',
          kind: 'worker',
          state: 'paused',
          networks: ['backend'],
          calls: ['postgres'],
          command: 'node dist/scheduler.js',
          note: 'Paused with docker pause during the migration: its processes are frozen, nothing gets scheduled.',
        },
        {
          name: 'postgres',
          image: 'postgres:16',
          networks: ['backend'],
          mounts: ['pgdata:/var/lib/postgresql/data'],
          health: 'healthy',
        },
        {
          name: 'redis',
          image: 'redis:7-alpine',
          state: 'exited',
          exitCode: 137,
          restart: 'no',
          memory: '64 MiB',
          networks: ['backend'],
          note: 'Killed by the kernel (OOMKilled): the 64 MiB limit is too small. Exit code 137, and no restart policy.',
        },
        {
          name: 'search',
          image: 'opensearchproject/opensearch:2.15',
          kind: 'database',
          state: 'dead',
          networks: ['backend'],
          mounts: ['search-index:/usr/share/opensearch/data'],
          note: 'Dead: docker could not remove it (device busy on its volume). It needs a hand.',
        },
        {
          name: 'migrate',
          image: 'company/api:9.0.1',
          kind: 'tool',
          state: 'exited',
          exitCode: 0,
          networks: ['backend'],
          command: 'node dist/migrate.js',
          note: 'A one-off job: ran the database migrations and exited cleanly (code 0).',
        },
        {
          name: 'backup',
          image: 'company/pg-backup:2.0',
          kind: 'tool',
          state: 'created',
          networks: ['backend'],
          mounts: ['backups:/backups'],
          note: 'Created, never started: docker create ran, but the nightly job has not started it yet.',
        },
      ],
    },
  ],
}

/** A real dev server, straight from `docker inspect` */
const devServer: ContainersSpec = {
  id: 'devbox',
  title: 'A real dev server.',
  subtitle: 'Twelve containers, as docker inspect sees them.',
  description:
    'Read from the output of `docker inspect $(docker ps -aq)`. The calls come from the compose ' +
    'depends_on labels; the proxy routes are guessed from the images.',
  environments: [
    fromInspect(
      devServerInspect as unknown as Record<string, unknown>[],
      'dev server',
      'docker inspect · 12 containers',
    ),
  ],
}

export const SAMPLES: ContainersSpec[] = [shop, fleet, states, devServer]
