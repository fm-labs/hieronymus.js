# IsoContainers

The `isocontainers` world (`?world=isocontainers`) draws docker hosts as a small isometric city:

| On the map        | In docker                                     |
| ----------------- | --------------------------------------------- |
| a plate           | an environment (one docker host)              |
| a building        | a container                                   |
| a street          | a network                                     |
| a storage tank    | a named volume                                |
| the gate          | the host's published ports (traffic from outside) |
| a flow on a street or an arc | a request between containers (a call), outside traffic (ingress), or volume I/O (a mount) |

On top of the map there is an explorer and info pane, a health/status bar, an advisor that rates
the hosts and gives quests (fix this, accept that), and building styles that can be picked per
image, kind or container name.

This page describes **the data**: what goes in, what the world makes of it, and which parts are
real and which are simulated today. It is the starting point for feeding the world from an API.
For how worlds are built in general, see [Building Worlds](building-worlds.md).

## Where the data flows

```
 input JSON ──► ContainersSpec ──► ContainersModel ──► ContainersSimulation ──► components
 (sample, API,  (plain data,       (entities with       (live state: flows,     (draw the model
  ?graph= file,  the contract)      references, layout,  cpu, memory, counters)  every frame)
  docker inspect,                   links, looks)
  compose)
```

| Step | Code | Pure? | What it does |
| ---- | ---- | ----- | ------------ |
| Load | `isocontainersGameLauncher.ts` | no | Reads `?api` / `?graph=` / `?stack=` / `?styles=`, fetches the JSON. |
| API | `isocontainers.api.ts` → `loadFromApi(get)` | yes (takes the fetch) | Loads every host of the mission-control API and turns it into an `EnvironmentSpec` (see [The mission-control API](#the-mission-control-api)). |
| Events | `isocontainers.events.ts` → `engineLine(event, env)`, `EngineEvents` | `engineLine` yes | Streams each live host's docker events into the log (see [Live engine events](#live-engine-events)). |
| Import | `isocontainers.import.ts` | yes | Turns docker inspect or compose output into `EnvironmentSpec`s. |
| Build | `isocontainers.layout.ts` → `buildContainersModel(spec, styleRules)` | yes | Creates the entities, guesses what is missing, lays out the plates, makes and routes the links, resolves the looks. |
| Simulate | `isocontainers.sim.ts` → `ContainersSimulation` | yes (takes `random`) | Moves flows along links, counts requests and errors, eases cpu and memory. |
| Advise | `isocontainers.advisor.ts` → `advise(model)`, `rate(...)` | yes | Finds risks and warnings, rates each host. |
| Draw | `*Component.ts`, `isocontainers.world.ts` | no | One component per building, tank and gate; one for the ground; one overlay for arcs and labels. |
| UI | `IsoContainersSystem.ts` | no | Steps the simulation, HUD, pane, explorer, advisor, settings, input. |

Everything marked pure has no engine imports and is unit tested (`test/isocontainers*.test.ts`).

## The input: `ContainersSpec`

The spec is **the contract** between a data source and the world. It is plain JSON (no references,
no layout) and is defined in `isocontainers.types.ts`. Everything other than names is optional; the
model builder fills in sensible defaults.

```json
{
  "id": "shop",
  "title": "Web shop.",
  "subtitle": "One host, compose project 'shop'.",
  "description": "Optional longer text for the info pane.",
  "styles": [{ "image": "company/*", "accent": "#4cc9f0" }],
  "environments": [
    {
      "name": "prod-1",
      "caption": "docker 27.1 · 10.0.0.12",
      "networks": [{ "name": "front" }, { "name": "db", "internal": true }],
      "volumes": [{ "name": "pgdata", "size": "2.4 GB" }],
      "containers": [
        {
          "name": "proxy",
          "image": "traefik:v3.1",
          "ports": ["80:80", "443:443"],
          "networks": ["front"],
          "calls": ["web"]
        },
        {
          "name": "web",
          "image": "company/web:5.1",
          "networks": ["front", "db"],
          "calls": ["db", "prod-2/search"],
          "restart": "unless-stopped",
          "memory": "512 MiB",
          "health": "healthy"
        },
        {
          "name": "db",
          "image": "postgres:16",
          "networks": ["db"],
          "mounts": ["pgdata:/var/lib/postgresql/data"]
        }
      ]
    }
  ]
}
```

### `ContainersSpec`

| Field          | Type                | Notes |
| -------------- | ------------------- | ----- |
| `id`           | string              | The stack id; samples use it for `?stack=`. |
| `title`        | string, required    | Shown in the pane. |
| `subtitle`     | string              | |
| `description`  | string              | |
| `environments` | `EnvironmentSpec[]`, required | One plate each. |
| `styles`       | `StyleRule[]`       | Building looks that come with the data (see [Building looks](#building-looks)). |

### `EnvironmentSpec` (a docker host)

| Field        | Type              | Notes |
| ------------ | ----------------- | ----- |
| `name`       | string, required  | Unique among the environments; it is the prefix of every key on this host. Two hosts with the same name get a `'` added to the key. |
| `caption`    | string            | The small text on the plate, e.g. the docker version or the address. |
| `region`     | string            | Optional: the region, site or cluster of the host. Hosts of a region are grouped on the map, outlined in the region's color, and can be shown or hidden together. |
| `engine`     | `EngineSpec`      | Optional: what the engine says about itself (`docker info`), for the host pane. All fields optional: `engine`, `version`, `address`, `hostname`, `os`, `kernel`, `arch`, `cpus`, `memory`, `storageDriver`, `loggingDriver`, `cgroup`, `runtime`, `rootDir`, `images`, `swarm`, `firewall`, `ipForwarding`, `httpProxy`, `httpsProxy`, `noProxy`, `warnings`. |
| `containers` | `ContainerSpec[]` | |
| `networks`   | `NetworkSpec[]`   | Optional: a network a container names is created on the fly. List it here to give it a driver, subnet or `internal`. |
| `volumes`    | `VolumeSpec[]`    | Optional the same way; list it to give it a size (the tank's height) or driver. |

### `ContainerSpec`

| Field         | Type | Default | Notes |
| ------------- | ---- | ------- | ----- |
| `name`        | string, required | | Unique on its host (a repeated name is dropped). |
| `image`       | string, required | | `registry:port/repo/name:tag`; drives the kind and the building. |
| `kind`        | `ContainerKind` | guessed | `proxy`, `web`, `app`, `worker`, `database`, `cache`, `queue`, `storage`, `monitor`, `tool`. Guessed from the image and name by `guessKind()`. Sets the building's base height and default style. |
| `state`       | `ContainerState` | `running` | `running`, `exited`, `paused`, `restarting`, `created`, `dead`. Only `running` takes requests. |
| `health`      | `ContainerHealth` | none | `healthy`, `unhealthy`, `starting`. |
| `exitCode`    | number | | For exited containers. 137 is read as "killed" (the advisor's OOM check). |
| `project`, `service` | string | | The compose project and service; `calls` can name a service. |
| `ports`       | `PortSpec[]` | `[]` | Strings like docker: `'8080:80'`, `'127.0.0.1:5432:5432'`, `'53:53/udp'`, `'80'` (exposed, not published). A port published on all interfaces makes an ingress link from the gate. |
| `networks`    | `string[]` or `{ [name]: { ip?, aliases? } \| null }` | `['default']` | `'none'` means no network. `'host'` gets no street. |
| `mounts`      | `MountSpec[]` | `[]` | `'<volume>:<target>[:ro]'`, `'/host/path:/target[:ro]'` (a bind: the source starts with `/`, `.` or `~`), `'/target'` (anonymous volume), or `{ type, source, target, readOnly }`. Named volumes become tanks. |
| `calls`       | string[] | | Who this container sends requests to: a container name, a compose service, or `'<environment>/<container>'` on another host. |
| `dependsOn`   | string[] | | Like compose `depends_on`; also counts as a call. |
| `replicas`    | number | 1 | Clamped to 1–6 for drawing. |
| `command`     | string | | Info only. |
| `restart`     | string | | `no`, `always`, `unless-stopped`, `on-failure`; the advisor checks it. |
| `memory`      | string | | The limit, e.g. `'512 MiB'`; the advisor checks it. |
| `cpus`        | number | | The limit. |
| `created`     | string | | ISO time, info only. |
| `labels`      | `Record<string,string>` | `{}` | Docker labels. `isocontainers.*` labels set the look; `isocontainers.advisor.ignore` silences checks; `traefik.enable=true` makes a proxy route to it. |
| `user`        | string | unknown | `'root'` when the image sets none. |
| `privileged`  | boolean | unknown | |
| `healthcheck` | boolean | unknown (true if `health` is set) | A health check is defined. |
| `note`        | string | | Free text for the info pane, e.g. an incident. |

!!! note "Unknown is not false"
    `user`, `privileged` and `healthcheck` are `undefined` when the source doesn't say. The advisor
    only complains about what it knows, so a source that can't tell should leave them out.

### `NetworkSpec`

| Field      | Type    | Notes |
| ---------- | ------- | ----- |
| `name`     | string, required | Matched against the containers' `networks`. |
| `driver`   | string  | Default `bridge` (`host` for the network named host). |
| `subnet`, `gateway` | string | Info only. |
| `internal` | boolean | No route outside: the street doesn't connect to the gate's avenue. |
| `scope`, `ipv6`, `attachable`, `created` | | Info only, shown in the host pane. |
| `note`     | string  | |

### `VolumeSpec`

| Field        | Type   | Notes |
| ------------ | ------ | ----- |
| `name`       | string, required | Matched against the containers' mounts. A 64 hex digit name is an anonymous volume. |
| `driver`     | string | Default `local`. |
| `size`       | string | `'2.4 GB'`, `'512MiB'`, `'1.4T'`. Its order of magnitude (KB, MB, GB, TB) sets the tank's radius and color, and the height grows by the same step for each ×10 (`tankHeight()`). Unknown size → a grey tank with a dashed rim and a `?`, of standard radius and height. |
| `mountpoint` | string | Info only. |
| `note`       | string | |

### Other input formats

`toEnvironments(data, name)` in `isocontainers.import.ts` accepts, per file:

- a whole `ContainersSpec`, or a single `EnvironmentSpec`;
- the output of `docker inspect $(docker ps -aq)`, optionally with `docker network inspect` and
  `docker volume inspect` entries in the same array (they are told apart by their fields);
- the output of `docker compose config --format json`.

For docker inspect, `fromInspect()` maps `State.Status`, `State.Health.Status`, `State.ExitCode`,
`NetworkSettings.Ports`, `NetworkSettings.Networks`, `Mounts`, `HostConfig.RestartPolicy/Memory/NanoCpus/Privileged`,
`Config.User/Healthcheck/Labels` and the compose labels (`com.docker.compose.project/service/depends_on`).
Volume sizes come from `UsageData.Size` (only filled by `docker system df -v`).

## The model: `ContainersModel`

`buildContainersModel(spec, styleRules)` turns the spec into objects that point at each other.
Every entity has a `key` that is unique in the model and stable across builds of the same data:

| Entity    | Key                               |
| --------- | --------------------------------- |
| Container | `<env>/<name>`                    |
| Network   | `<env>/network/<name>`            |
| Volume    | `<env>/volume/<name>`             |
| Link      | `<from key or env/gate>-><to key>:<kind>`, mounts `<container key>-><volume key>:mount` |

`model.byKey` finds containers, networks and volumes by key; `?select=<key>` and the explorer use it.

```
ContainersModel
 ├─ environments: Environment[]          (plates)
 │    ├─ containers: Container[]  ◄──┐
 │    ├─ networks:   Network[]   ─ members ─┘
 │    └─ volumes:    Volume[]    ─ mounts → Mount → container
 ├─ containers, networks, volumes        (all hosts, flat)
 ├─ links: Link[]                        (call | ingress | mount; from? → to, volume?, network?)
 ├─ byKey: Map<key, Container | Network | Volume>
 ├─ regions: Region[]                    (name, color, environments, outline; none without `region`)
 └─ spec                                 (the input, kept as is)
```

Each runtime type has three groups of fields: **data** (copied or derived from the spec),
**layout** (grid positions, set once by the builder) and **live** (changed every frame by the
simulation).

### `Container`

| Group  | Fields |
| ------ | ------ |
| data   | `key`, `env`, `name`, `image`, `kind`, `state`, `health`, `exitCode`, `project`, `service`, `ports: Port[]`, `attachments: Attachment[]` (network + ip + aliases), `mounts: Mount[]`, `replicas`, `command`, `restart`, `memory`, `cpus`, `created`, `labels`, `user`, `privileged`, `healthcheck`, `note` |
| graph  | `out: Link[]` (calls it makes), `in: Link[]` (calls and ingress it gets), `inferred` (its calls were guessed) |
| look   | `look: BuildingLook` (`style`, `roof`, `scale`, `accent`, `badge`, `source`), `baseHeight` (by kind), `height` (base × scale) |
| layout | `col`, `row`, `w`, `d` (the footprint in cells), `driveways` (to each street it joins), `flyovers` (networks it joins that aren't next to its lot, drawn as arcs) |
| live   | `flash` (0..1 glow when a request arrives), `cpu` (%), `mem` (MiB), `requests`, `errors` (counters), `transition` (seconds left while starting or stopping), `sparks` (ages of recent failed requests) |

### `Network`

| Group  | Fields |
| ------ | ------ |
| data   | `key`, `env`, `name`, `driver`, `subnet`, `gateway`, `internal`, `note`, `members: Container[]` |
| layout | `accent` (street color), `row` (center row), `col0`, `col1` (span), `street` (false for networks without members, `host` and `none`) |
| live   | `packets` (requests that travelled on it) |

### `Volume`

| Group  | Fields |
| ------ | ------ |
| data   | `key`, `env`, `name`, `driver`, `size`, `bytes` (parsed, when known), `sizeClass` (`kb`, `mb`, `gb`, `tb`, `unknown`), `mountpoint`, `note`, `anonymous`, `mounts: Mount[]` |
| layout | `owner` (the container whose lot holds the tank: the first that mounts it), `col`, `row`, `r` (by size class, `TANK_RADIUS`), `height` (by size) |

Tanks by size class (`TANK_STYLES` in `isocontainers.draw.ts`):

| Class     | Size        | Radius (cells) | Color |
| --------- | ----------- | -------------- | ----- |
| `kb`      | below 1 MB  | 0.20           | green `#6ee7b7` |
| `mb`      | below 1 GB  | 0.28           | cyan `#4cc9f0` |
| `gb`      | below 1 TB  | 0.36           | blue `#6b8cff` |
| `tb`      | 1 TB and up | 0.42           | pink `#f472b6` |
| `unknown` | not known   | 0.30, height 30 px | grey `#9aa3a8`, dashed rim, `?` on top |
| live   | `flash`, `reads`, `writes` |

### `Environment`

| Group  | Fields |
| ------ | ------ |
| data   | `key`, `name`, `caption`, `region` (the `Region` it belongs to), `containers`, `networks`, `volumes` |
| layout | `col`, `row`, `cols`, `rows` (the plate), `roads` (one in front of each line of districts; the last, at `frontRow`, leads to the gate), `avenues` (from a district, `row0`, to its line's road, `row1`; plus the spine that joins the roads), `gate` |

### `Link`

| Group  | Fields |
| ------ | ------ |
| data   | `id`, `kind` (`call`, `ingress`, `mount`), `env`, `from` (undefined for ingress: it starts at the gate), `to`, `volume` (mounts), `inferred` (guessed, not given), `label` |
| layout | `network` (the street it travels on), `path` + `lengths` (a ground route in grid points), or `arc` (two points with heights, for links between hosts, without a shared street, or a second mount of a volume) |
| live   | `rate` (requests or I/O per second, by the target's kind), `pulses` (the flows on it, each with `t` 0..1, `back`, `failed`, `arrived`), `timer` |

### What the builder adds to the spec

- **Kinds**: `guessKind(image, service ?? name)` when `kind` is missing.
- **Calls**: `calls` and `dependsOn` become `call` links. `'env/name'` reaches another host;
  a bare name finds a container, then a service of the caller's project, then any service.
- **Guessed calls** (`inferred: true`, marked "guessed" in the pane):
    - a proxy that calls nobody routes to the web and app containers (and `traefik.enable=true` ones) on its networks;
    - if **no container of the host** has calls, apps, webs and workers call the databases, caches,
      queues and storage on a shared network of the same project.
- **Ingress**: one link from the gate to each container with a port published on all interfaces
  (not `127.0.0.1:`).
- **Mount links**: one per container and named volume it mounts.
- **Layout**: networks are ordered so that a container's networks are neighbors; districts are the
  groups of networks that share containers. A plate keeps its districts in one line unless that makes
  it more than 2.2 times as wide as deep (a host with many small compose projects); then they wrap
  into the number of lines that makes it closest to square, each line with a road in front and a
  spine on the left joining the roads to the gate. Volumes nobody mounts are stored in a compact yard,
  the tallest at the back: unknown sizes first (they are drawn at a middle
  height), then by size. Plates are placed in lines on screen. With regions, the plates of each
  region are placed in lines of their own, and the regions in lines farther apart, with room under
  each for its name; hosts without a region come last. Each region gets a color from
  `REGION_COLORS` (never green or red, which mean hover and trouble) and an `outline` (the convex
  hull around its plates). `placeEnvironments(model, shown)` places only the hosts shown, closed
  up, routes the links again and empties the outlines of hidden regions.
- **Looks** and **heights**: see below.

## Building looks

A container's `look` is merged from weakest to strongest:

1. the image's default (`IMAGE_STYLES`, e.g. postgres → `datacenter`), else the kind's (`KIND_STYLES`);
2. style rules, by specificity: `kind` < `image` glob < `name` glob;
3. docker labels: `isocontainers.style`, `isocontainers.roof`, `isocontainers.scale`,
   `isocontainers.accent`, `isocontainers.badge`.

`look.source` says which won (`image`, `kind`, `rule …`, `labels`). Rules come from three places, in
this order: `spec.styles`, `?styles=<url>` (a JSON array or `{ rules: [...] }`), and the rules the
user makes in the settings view (saved in the browser). `applyLooks(model, rules)` re-resolves the
looks and heights of a built model without building it again.

```ts
type StyleRule = {
  image?: string        // glob: 'postgres', 'bitnami/*', 'registry:5000/team/*:2.*'
  kind?: ContainerKind
  name?: string         // glob of the container or service name
  style?: BuildingStyle // 18 styles, see STYLES in isocontainers.styles.ts
  roof?: RoofProp
  scale?: number        // 0.5..2, times the kind's height
  accent?: string       // a CSS color
  badge?: string        // a short sign, e.g. 'PG'
}
```

## The advisor

`advise(model)` returns `Advice[]` for containers and volumes:

```ts
type Advice = {
  id: string            // `${target.key}:${check}`
  check: CheckId        // e.g. 'public-datastore', 'docker-socket', 'no-healthcheck'
  severity: 'risk' | 'warn' | 'tip'
  target: Container | Volume
  title: string
  detail: string        // why it matters
  fix: string           // what to change in the compose file
  fixable: boolean      // applyFix() can try it in the view
}
```

The checks read only spec data: `image` (tag), `kind`, `ports`, `mounts`, `state`, `exitCode`,
`restart`, `memory`, `user`, `privileged`, `healthcheck`, `health` and `labels`. So the quality of the
advice depends on how many of these the source fills in. `rate(advice, containers, accepted)` gives a
0–100 score and 0–5 stars. Accepted advice ids are saved in the browser. `applyFix` changes the
model in the view only, never the real host.

A container's advice is on the **Advisor** tab of its pane, next to **Info**; the tab shows how many
are open, in the color of the worst. The tab chosen stays when another container is selected. A
volume's advice is still at the end of its pane.

## Real and simulated

Today every value that changes over time is **simulated**. A real source changes this split.

| Value | Today | From an API |
| ----- | ----- | ----------- |
| hosts, containers, networks, volumes, ports, mounts, labels, limits | spec | spec (inventory) |
| `state`, `health`, `exitCode` | spec, then changed by stop/start in the view (button or S key) | live: engine events (done); stop/start in the view is still simulated |
| containers coming and going | spec | live: `create` / `destroy` events rebuild the world (done) |
| calls between containers | spec `calls` / `dependsOn`, or guessed | spec, or observed connections |
| `cpu`, `mem` | simulated by kind (`BASE_CPU`, `BASE_MEM`) | `docker stats` |
| request rate per link | `CALL_RATE` by the target's kind | metrics (e.g. a proxy, a service mesh, eBPF) |
| `requests`, `errors`, flows, sparks | simulated: a request to a container that isn't running fails | metrics |
| volume `reads`, `writes` | simulated by kind | block I/O stats |
| volume `size` | spec | `docker system df -v` |
| engine lines of the log | simulated by `LogSimulator` | live: the API's docker events stream (done) |

## State kept outside the model

| What | Where |
| ---- | ----- |
| Style rules made in the settings | `localStorage['isocontainers.styles.v1']` |
| Accepted advice ids | `localStorage['isocontainers.accepted.v1']` |
| Flags switch, host links switch, log switch | `localStorage['isocontainers.flags.v1']`, `['isocontainers.links.v1']`, `['isocontainers.log.v1']` |
| The log's lines (the last 500) | `IsoContainersSystem.log` (`LogStream`) |
| Regions switched off, by stack | `localStorage['isocontainers.regions.v1']` (`{ [stack]: [region, …] }`); their hosts in `scene.hidden` |
| The host open in the side pane, the one under the pointer, the pane's tab | `scene.openHost`, `scene.hoveredHost`, `IsoContainersSystem.hostTab` |
| The plate under the pointer and how lit its rim is | `scene.hoveredPlate`, `scene.plates` (eased by the system each frame) |
| Selected entity, zoom, open panes | URL: `?select=<key>`, `?zoom=`, `?advisor`, `?settings` |
| The data | URL: `?api[=<base>]`, `?stack=<sample id>` or `?graph=<url>[,<url>…]` (in this order), plus `?styles=<url>` |

Each plate hovers above the floor: a slab with a lit lip, a floor with faint tiles, and a soft shadow
far below that breathes slowly. When the pointer enters a plate, its rim turns green, a ripple runs
out from it and two soft lights circle along it; leaving fades it out. The sizes and timings are in
`PLATE` (`IsoContainersGroundComponent.ts`).

Clicking a host's gate (the HOST arch at the front of its plate) or its name in the explorer opens
the host in the side pane, in place of a selection. The **Engine** tab has the engine, the machine
and the runtime (from `engine`), and what runs on it: the containers by state, images, volumes,
networks and the (simulated) CPU and memory. The **Network** tab has the host's forwarding,
firewall and proxies, every published port with its container, and all networks, including
`host`, `none` and empty ones; a network with a street jumps to it. Hosts from a file or a sample
without `engine` show only what the model knows. Esc or a second click closes it.

When the hosts have regions (the `massive` sample), each region is a tinted field on the floor under
its plates, with a dashed edge and its name and counts in front, and its plates' rims take its
color. The explorer lists the hosts under region headings and has a chip per region: a click shows
or hides that region, shift-click shows only it (again: all), SHOW ALL brings them all back; one
region always stays on. Hidden hosts are not drawn or picked, the others close up, and the camera
fits what is left. The explorer's counts are those of the hosts shown; the status bar stays
fleet-wide, so incidents in hidden regions still show.

The samples are in `isocontainers.samples.ts` (`shop`, `fleet`, `states`, `devbox`, `gallery`) and
`isocontainers.massive.ts` (`massive`: 61 generated hosts in five regions and `global`).

## The log

At the bottom left, next to the explorer, the log is written over the city: no panel and no background, only text with a
dark halo, so it stays readable over plates and buildings, above the canvas and under the panels;
clicks pass through to the map. The newest line is at the bottom, older lines fade out toward the
top. The
`▤ LOG` switch in the status bar (key `T`) shows or hides it; lines of hidden regions are left out.

Each line is a `LogEvent` in one `LogStream` (`isocontainers.log.ts`, pure):

| Field | |
| ----- | - |
| `id`, `time` | increasing number; epoch milliseconds |
| `source` | `engine` (docker events, marked ◆, cyan), `container` (its output, marked ·), `world` (what you did, marked ▸, green) |
| `level` | `debug`, `info`, `warn`, `error` (the color of the text) |
| `host`, `key`, `actor` | the environment key, the entity key, and the name shown (a container, `gate`, `you`) |
| `text` | the line |

`stream.push(input)` adds a line (the last 500 are kept), `stream.subscribe(fn)` hears each new one.
`LogView` (`IsoContainersLogView.ts`) draws the last 16.

The samples' lines are simulated by `LogSimulator`, from the simulation's `onEvent` (`SimEvent`:
`request` with `failed`, and `stop`, `start`, `up`):

- a sample of the requests, at most `rate` (2.2) lines a second, as the target's kind writes them:
  access logs of proxies and webs, `INFO` lines of apps and workers, postgres statements, redis
  commands, queue publishes, object storage requests, scrapes;
- every failed request, from the caller (`ERROR upstream postgres:5432: connect: connection refused`)
  or, for ingress, the host's gate (502), at most one a second per target;
- the engine events of a stop (`kill`, `die`, `network disconnect`, `stop`) and a start (`network
  connect`, `volume mount`, `start`), and the container's ready line when it is up;
- every few seconds a health check (`exec_start`, debug), or for a container in trouble a failing
  health check or a crash (`die exitCode=1`, `restart`).

The system writes `world` lines itself: the stack loaded, `docker stop|start` from the pane or `S`,
fixes, and the regions shown. In the live stack the engine lines are real: see
[Live engine events](#live-engine-events).

## The mission-control API

`?api` loads the docker hosts of the mission-control (mc) API, read only. It is the **Live** entry of
the stacks list (key `0`).

### Setup

The Vite dev server proxies `/mc-api/*` to `<MC_API_URL>/api/*` and adds the `x-api-key` header, so
the key stays on the dev server and the browser makes same-origin requests. Copy `.env.example` to
`.env.local` (git ignores it) and set:

```
MC_API_URL=http://127.0.0.1:3080
MC_API_KEY=<the key>
```

Restart `yarn dev` after changing it, then open `?world=isocontainers&api`. `?api=<base>` uses
another base URL instead of `/mc-api` (it must add the key itself, or need none).

### What is loaded

| Request (per host `alias`) | What it gives | Required |
| -------------------------- | ------------- | -------- |
| `GET /containers/hosts` | the hosts: `[{ id, name, connected }]`; hosts with `connected: false` are skipped | yes |
| `GET /containers/{alias}/containers` | every container, fully inspected (as `docker inspect`) | yes |
| `GET /containers/{alias}/networks` | the networks, as `docker network ls` lists them (with `IPAM`, `Internal`) | yes |
| `GET /containers/{alias}/volumes` | the volumes, without sizes | yes |
| `GET /containers/{alias}/df` | disk usage: `Volumes[].UsageData.Size` gives the volume sizes | no |
| `GET /containers/{alias}/info` | `docker info`: the plate caption (`name · docker 29.9.2 · 16 CPUs · 18 GiB`) and the host pane's `engine` (`engineInfo()`) | no |

The responses go through `fromInspect()` unchanged, apart from the sizes merged into the volumes,
so an API host is read like a `docker inspect` file. Each host is one environment named by the
host's `name` (or `id`). The API caches its answers (30 s, `df` 60 s), so a reload shows changes
with that delay.

When a host fails, the others still load and a message says which one failed. When nothing loads
(the API is down, the key is wrong, no proxy), the first sample opens with a message saying why.

### Live engine events

Once the live stack is shown, the system opens `GET /containers/{alias}/events/stream` for each
loaded host (`loadFromApi` returns the hosts' aliases) and writes each docker event into the log
as an `engine` line. The stream is ndjson, one docker event a line; `EngineEvents` reads it with
`fetch` (through the same proxy, so the key stays on the dev server) and connects again when it
ends or fails, after 2, 4, 8, … up to 30 seconds. A `world` line says when a host's stream is
listening, lost (once, until it is back) and reconnected.

`engineLine(event, env)` makes the line:

| Event | Line |
| ----- | ---- |
| container `start` | `container start image=redis:7` |
| container `die` | `container die exitCode=N`: a warning for 0, an error otherwise |
| container `kill`, `oom` | `container kill signal=15` (warning), `container oom` (error) |
| `health_status: …` | as docker says it; `unhealthy` is a warning |
| `exec_start: …` | the command, as debug (health checks) |
| `exec_die` | only when it failed (exit code not 0), as a warning |
| `exec_create`, `attach`, `detach`, `resize`, `top` | left out |
| other container actions | `container create`, `stop`, `destroy`, `pause`, … |
| network `connect` / `disconnect` | `network connect backend`, on the container's line |
| volume `mount` / `unmount` | `volume mount data → /var/lib/postgresql/data`, on the container's line |
| image events | `image pull redis:7` (actor `images`) |

The actor is the container's name. Containers loaded with the stack keep docker's id
(`Container.id`), so the line carries their key; a container that came later is named from its
own events (network and volume events name it by id only, so the names seen are remembered).

The live stack has no `LogSimulator`: no simulated lines at all, neither engine events nor traffic.
The log holds the engine's events and the `world` lines (what you did, the streams' status). The
caption under the log says so: `LOG · ENGINE EVENTS LIVE FROM /mc-api`.

### The events change the city

`applyEngineState(container, event, sim)` sets the state of a container on the map:

| Event | State |
| ----- | ----- |
| `start` | rises out of the ground (`restarting`, then `running`, as a start in the view); `health: starting` when it has a health check |
| `die` | `exited` with the event's `exitCode` |
| `stop` | `exited`, when no `die` came before it |
| `pause` / `unpause` | `paused` / `running` |
| `health_status: …` | `health` |

`LiveChanges` handles the containers that come and go. A `create` (or any event of a container the
map doesn't have, e.g. one that was restarting when the stack loaded, which the API's list leaves
out) is fetched with `GET /containers/{alias}/containers/{id}` and added to the live spec through
`fromInspect()`. A container of the same name is replaced, as when compose recreates one. A
`destroy` takes it out. 600 ms after the last change the world is rebuilt once, so a `compose up`
is one rebuild. A container that is created and destroyed before it is fetched (`docker run --rm`)
is never added.

The events of a container that is not on the map yet are kept and replayed, in order, once it is,
since the inspect may be older than them (the API caches). The rebuild (`rebuildWorld(world, spec)`
in `isocontainers.world.ts`) builds a new model into the same tile map. It swaps the structures, and
the ground and the overlay draw the new model. The system then carries over, by key:
- the state, health, load and counts of each container;
- the volumes' reads and writes;
- the simulation's speed, pause and totals;
- the selection, the open host and the regions shown.

A new running container rises out of the ground. The camera stays where it is.

### Not used yet

- Network and volume events changing the view (a new network is drawn when a container joins it).
- `POST /containers/{alias}/containers/{id}/actions/{start|stop|restart|pause|unpause|remove}`: the
  real stop and start.
- Logs and exec.

### API limits

- No container stats: cpu and memory stay simulated.
- The container list leaves out `restarting` and `dead` containers.
- Calls come only from compose `depends_on` labels, or are guessed.
- On a cold cache, parallel requests to one host get 500s, so the loader asks for the containers,
  networks and volumes one after another (and tries a server error again once).

## Before connecting an API

What the current code assumes, and what has to change for live data:

- **The model is built once.** `isoContainersWorldBuilder(spec)` builds the model and one component
  per container, volume and gate. Switching stacks reloads the page. There is no path yet to add,
  remove or move a container in a running world. A live source needs either a rebuild that keeps
  the camera, selection and live counters (matched by `key`), or an update that only patches
  `data` fields when the inventory hasn't changed shape.
- **Keys are the identity.** Keep host names stable and unique. Container names are unique per host
  in docker, so `<host>/<name>` works. A recreated container (new id, same name) keeps its key, which
  is what the view wants.
- **Two kinds of updates.** The inventory (containers, networks, volumes, ports, mounts, calls)
  changes rarely and changes the layout. Status (state, health, stats, rates) changes often and
  should only touch live fields. Keeping them apart in the API avoids relayouts.
- **The simulation owns the live fields.** `ContainersSimulation` writes `cpu`, `mem`, `requests`,
  `errors` and makes flows from `link.rate`. With real metrics, it should take the rates and stats
  from the source and only animate the flows.
- **The stop and start buttons** change `state` in the view only. With an API they would become
  real actions (or be hidden).
- **Calls are the weakest data.** Docker doesn't know who calls whom. Without `calls`, the builder
  guesses. Observed connections would be the best source; compose `depends_on` the next best.
- **Inspect output is the fallback.** The importer already reads `docker inspect`, so an API that
  returns the Docker Engine API's container JSON works through `toEnvironments()` as is. An API that
  returns `ContainersSpec` directly is simpler to keep stable.
