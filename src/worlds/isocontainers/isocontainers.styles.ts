/**
 * Building styles of the 'isocontainers' world: which architecture a container gets. A look is
 * merged from, weakest first:
 *
 * 1. the default of its kind (databases are vaults, caches silos, …),
 * 2. user rules, from the least to the most specific: by kind, by image, by name,
 * 3. its docker labels, e.g. `isocontainers.style: silo` in a compose file.
 *
 * Image patterns are globs. A pattern without a tag matches every tag, a pattern without a registry
 * matches the image on any registry: 'postgres' matches 'docker.io/library/postgres:17'.
 */
import type {
  BuildingLook,
  BuildingStyle,
  Container,
  ContainerKind,
  RoofProp,
} from './isocontainers.types.ts'

export type StyleOptions = {
  style?: BuildingStyle
  roof?: RoofProp
  scale?: number
  accent?: string
  badge?: string
}

/** Options for the containers it matches; every matcher it has must match */
export type StyleRule = StyleOptions & {
  /** A glob of the image, e.g. 'postgres', 'bitnami/*', 'registry.local:5000/team/*:2.*' */
  image?: string
  kind?: ContainerKind
  /** A glob of the container or service name */
  name?: string
}

export type Facade = 'grid' | 'glass' | 'slits' | 'bands' | 'ribbon' | 'sparse'

export type StyleDefinition = {
  label: string
  description: string
  shape: 'box' | 'octagon'
  facade: Facade
  /** Times the height of the kind */
  scale: number
  roof: RoofProp
  /** A door at the front */
  door?: boolean
  /** A gate through the front */
  arch?: boolean
  /** Battlements along the roof edges */
  crenels?: boolean
  /** Light and dark rings */
  stripes?: boolean
}

export const STYLES: Record<BuildingStyle, StyleDefinition> = {
  tower: {
    label: 'Tower',
    description: 'An office tower with rows of windows',
    shape: 'box',
    facade: 'grid',
    scale: 1,
    roof: 'antenna',
  },
  glass: {
    label: 'Glass',
    description: 'A glass curtain wall, lit floor by floor',
    shape: 'box',
    facade: 'glass',
    scale: 1.15,
    roof: 'none',
  },
  vault: {
    label: 'Vault',
    description: 'A heavy block with slit windows and a door',
    shape: 'box',
    facade: 'slits',
    scale: 0.8,
    roof: 'dome',
    door: true,
  },
  silo: {
    label: 'Silo',
    description: 'A ringed silo with portholes',
    shape: 'octagon',
    facade: 'bands',
    scale: 1,
    roof: 'vents',
  },
  factory: {
    label: 'Factory',
    description: 'A low hall with ribbon windows and a smokestack',
    shape: 'box',
    facade: 'ribbon',
    scale: 0.8,
    roof: 'chimney',
    door: true,
  },
  gatehouse: {
    label: 'Gatehouse',
    description: 'A gate with battlements, for what lets traffic in',
    shape: 'box',
    facade: 'grid',
    scale: 1.1,
    roof: 'none',
    arch: true,
    crenels: true,
  },
  lighthouse: {
    label: 'Lighthouse',
    description: 'A striped tower whose beam sweeps the city',
    shape: 'octagon',
    facade: 'bands',
    scale: 1.6,
    roof: 'beacon',
    stripes: true,
  },
  shed: {
    label: 'Shed',
    description: 'A small shed, for tools and one-off jobs',
    shape: 'box',
    facade: 'sparse',
    scale: 0.75,
    roof: 'none',
    door: true,
  },
}

export const ROOFS: Record<RoofProp, string> = {
  none: 'None',
  antenna: 'Antenna',
  tank: 'Water tank',
  dome: 'Dome',
  chimney: 'Chimney',
  beacon: 'Beacon',
  vents: 'Vents',
}

export const KIND_STYLES: Record<ContainerKind, BuildingStyle> = {
  proxy: 'gatehouse',
  web: 'glass',
  app: 'tower',
  worker: 'factory',
  database: 'vault',
  cache: 'silo',
  queue: 'silo',
  storage: 'vault',
  monitor: 'lighthouse',
  tool: 'shed',
}

/** Accents to pick from */
export const STYLE_ACCENTS = [
  '#3ee07f',
  '#4cc9f0',
  '#a78bfa',
  '#f472b6',
  '#ffc04d',
  '#ff7a59',
  '#e9efec',
]

export const SCALE_RANGE: [number, number] = [0.5, 2]

/** The docker labels that set a look */
export const STYLE_LABELS = {
  style: 'isocontainers.style',
  roof: 'isocontainers.roof',
  scale: 'isocontainers.scale',
  accent: 'isocontainers.accent',
  badge: 'isocontainers.badge',
} as const

/** Signs for well known images */
const BADGES: Array<[RegExp, string]> = [
  [/^postgres|postgis|timescale/, 'PG'],
  [/^mysql/, 'MY'],
  [/^mariadb/, 'MDB'],
  [/^mongo/, 'MGO'],
  [/^redis|valkey/, 'RDS'],
  [/^memcached/, 'MC'],
  [/^rabbitmq/, 'MQ'],
  [/kafka/, 'KFK'],
  [/^nats/, 'NATS'],
  [/^nginx/, 'NGX'],
  [/^traefik/, 'TFK'],
  [/^caddy/, 'CDY'],
  [/^haproxy/, 'HAP'],
  [/^minio/, 'S3'],
  [/elasticsearch|opensearch/, 'ES'],
  [/^grafana/, 'GRF'],
  [/^prom\/prometheus|^prometheus/, 'PRM'],
]

const isStyle = (v: unknown): v is BuildingStyle => typeof v === 'string' && v in STYLES
const isRoof = (v: unknown): v is RoofProp => typeof v === 'string' && v in ROOFS
const isColor = (v: unknown): v is string =>
  typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v.trim())
const clampScale = (v: number) => Math.max(SCALE_RANGE[0], Math.min(SCALE_RANGE[1], v))

/** 'docker.io/library/postgres:17' → 'postgres:17' (the default registry and namespace dropped) */
export function normalizeImage(image: string): string {
  return image
    .split('@')[0]
    .replace(/^(docker\.io|index\.docker\.io|registry-1\.docker\.io)\//, '')
    .replace(/^library\//, '')
}

/** The image without its tag: 'registry:5000/team/api:1.2' → 'registry:5000/team/api' */
export function imageRepository(image: string): string {
  const name = normalizeImage(image)
  const slash = name.lastIndexOf('/')
  const colon = name.lastIndexOf(':')
  return colon > slash ? name.slice(0, colon) : name
}

const globToRegExp = (glob: string) =>
  new RegExp(
    `^${glob
      .split('*')
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*')}$`,
    'i',
  )

/** Does an image match a pattern? Without a tag in the pattern, any tag does */
export function matchesImage(pattern: string, image: string): boolean {
  const p = normalizeImage(pattern.trim())
  if (!p) return false
  const name = normalizeImage(image)
  const hasTag = p.lastIndexOf(':') > p.lastIndexOf('/')
  const target = hasTag ? name : imageRepository(name)
  if (globToRegExp(p).test(target)) return true
  // no registry in the pattern: try the image without its registry
  const path = target.split('/')
  return path.length > 1 && !p.includes('/') && globToRegExp(p).test(path[path.length - 1])
}

type Matchable = Pick<Container, 'name' | 'image' | 'kind'> & { service?: string }

export function ruleMatches(rule: StyleRule, c: Matchable): boolean {
  if (!rule.image && !rule.kind && !rule.name) return false
  if (rule.kind && rule.kind !== c.kind) return false
  if (rule.image && !matchesImage(rule.image, c.image)) return false
  if (rule.name) {
    const re = globToRegExp(rule.name.trim())
    if (!re.test(c.name) && !(c.service && re.test(c.service))) return false
  }
  return true
}

/** How specific a rule is: names beat images, images beat kinds */
export const specificity = (rule: StyleRule) => (rule.name ? 3 : rule.image ? 2 : 1)

/** What a rule matches, in words: 'postgres', 'name api-1', 'all databases' */
export function describeRule(rule: StyleRule): string {
  if (rule.name) return `name ${rule.name}`
  if (rule.image) return rule.image
  return rule.kind ? `kind ${rule.kind}` : 'nothing'
}

/** The options its labels set */
export function labelOptions(labels: Record<string, string>): StyleOptions {
  const o: StyleOptions = {}
  const style = labels[STYLE_LABELS.style]?.trim().toLowerCase()
  if (isStyle(style)) o.style = style
  const roof = labels[STYLE_LABELS.roof]?.trim().toLowerCase()
  if (isRoof(roof)) o.roof = roof
  const scale = Number(labels[STYLE_LABELS.scale])
  if (labels[STYLE_LABELS.scale] && Number.isFinite(scale) && scale > 0) o.scale = scale
  if (isColor(labels[STYLE_LABELS.accent])) o.accent = labels[STYLE_LABELS.accent].trim()
  if (labels[STYLE_LABELS.badge]) o.badge = labels[STYLE_LABELS.badge].trim().slice(0, 4)
  return o
}

/** A well known image's sign, e.g. 'PG' for postgres */
export function badgeOf(image: string): string | undefined {
  const name = imageRepository(image).split('/').slice(-2).join('/')
  const last = name.split('/').pop() ?? name
  return BADGES.find(([re]) => re.test(last) || re.test(name))?.[1]
}

/** The look of a container */
export function resolveLook(c: Matchable & { labels: Record<string, string> }, rules: StyleRule[]) {
  const base = KIND_STYLES[c.kind]
  let options: StyleOptions = {}
  let source = 'kind'
  const matching = rules
    .map((rule, i) => ({ rule, i }))
    .filter(({ rule }) => ruleMatches(rule, c))
    .sort((a, b) => specificity(a.rule) - specificity(b.rule) || a.i - b.i)
  for (const { rule } of matching) {
    options = merge(options, rule)
    source = `rule ${describeRule(rule)}`
  }
  const fromLabels = labelOptions(c.labels)
  if (Object.keys(fromLabels).length) {
    options = merge(options, fromLabels)
    source = 'labels'
  }
  const style = options.style ?? base
  const definition = STYLES[style]
  const look: BuildingLook = {
    style,
    // a new style brings its own roof, unless one was picked
    roof: options.roof ?? definition.roof,
    scale: clampScale(definition.scale * (options.scale ?? 1)),
    accent: options.accent,
    badge: options.badge === '' ? undefined : options.badge ?? badgeOf(c.image),
    source,
  }
  return look
}

/** Later options win; an empty string clears an option */
function merge(a: StyleOptions, b: StyleOptions): StyleOptions {
  const out: StyleOptions = { ...a }
  if (isStyle(b.style)) out.style = b.style
  if (isRoof(b.roof)) out.roof = b.roof
  if (typeof b.scale === 'number' && b.scale > 0) out.scale = b.scale
  if (b.accent === '') delete out.accent
  else if (isColor(b.accent)) out.accent = b.accent
  if (typeof b.badge === 'string') out.badge = b.badge.slice(0, 4)
  return out
}

const sameTarget = (a: StyleRule, b: StyleRule) =>
  (a.image ?? '') === (b.image ?? '') &&
  (a.kind ?? '') === (b.kind ?? '') &&
  (a.name ?? '') === (b.name ?? '')

/** Set options on the rule for a target (image, kind or name), adding the rule if there is none */
export function upsertRule(
  rules: StyleRule[],
  target: Pick<StyleRule, 'image' | 'kind' | 'name'>,
  options: StyleOptions,
): StyleRule[] {
  const i = rules.findIndex((r) => sameTarget(r, target))
  const rule: StyleRule = { ...(i >= 0 ? rules[i] : target), ...options }
  // a new style starts with its own roof
  if (options.style && !('roof' in options)) delete rule.roof
  return i >= 0 ? rules.map((r, j) => (j === i ? rule : r)) : [...rules, rule]
}

export function removeRule(
  rules: StyleRule[],
  target: Pick<StyleRule, 'image' | 'kind' | 'name'>,
): StyleRule[] {
  return rules.filter((r) => !sameTarget(r, target))
}

/** Rules from JSON (an array, or { rules: [...] }); what is not a rule is dropped */
export function parseRules(data: unknown): StyleRule[] {
  const list = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { rules?: unknown }).rules)
      ? (data as { rules: unknown[] }).rules
      : []
  const rules: StyleRule[] = []
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    const rule: StyleRule = {}
    if (typeof r.image === 'string' && r.image.trim()) rule.image = r.image.trim()
    if (typeof r.kind === 'string' && r.kind in KIND_STYLES) rule.kind = r.kind as ContainerKind
    if (typeof r.name === 'string' && r.name.trim()) rule.name = r.name.trim()
    if (!rule.image && !rule.kind && !rule.name) continue
    Object.assign(rule, merge({}, r as StyleOptions))
    if (r.accent === '') rule.accent = ''
    rules.push(rule)
  }
  return rules
}

/** The compose labels for a look, to paste under a service */
export function lookToLabels(look: BuildingLook): string {
  const lines = [`${STYLE_LABELS.style}: ${look.style}`]
  const definition = STYLES[look.style]
  if (look.roof !== definition.roof) lines.push(`${STYLE_LABELS.roof}: ${look.roof}`)
  const scale = Math.round((look.scale / definition.scale) * 100) / 100
  if (scale !== 1) lines.push(`${STYLE_LABELS.scale}: "${scale}"`)
  if (look.accent) lines.push(`${STYLE_LABELS.accent}: "${look.accent}"`)
  if (look.badge) lines.push(`${STYLE_LABELS.badge}: ${look.badge}`)
  return `labels:\n${lines.map((l) => `  ${l}`).join('\n')}`
}
