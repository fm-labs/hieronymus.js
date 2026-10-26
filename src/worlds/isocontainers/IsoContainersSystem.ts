import type { IGame, IGameSystem } from '../../../lib/game.types'
import { AbstractGameSystem } from '../../../lib'
import { LOT, applyLooks, isPublished, neighborhood } from './isocontainers.layout.ts'
import {
  ROOFS,
  SCALE_RANGE,
  STYLES,
  STYLE_ACCENTS,
  imageRepository,
  lookToLabels,
  parseRules,
  removeRule,
  upsertRule,
  type StyleOptions,
  type StyleRule,
} from './isocontainers.styles.ts'
import { ContainersSimulation } from './isocontainers.sim.ts'
import {
  POINTS,
  SEVERITY_LABELS,
  advise,
  applyFix,
  rate,
  type Advice,
  type Rating,
} from './isocontainers.advisor.ts'
import { FIRE, ICE, SEVERITY_COLORS, moodOf, type Mood } from './isocontainers.fx.ts'
import {
  KIND_LABELS,
  type Container,
  type ContainersSpec,
  type Entity,
  type Environment,
  type Network,
  type Volume,
} from './isocontainers.types.ts'
import {
  COLORS,
  FONT,
  PALETTE,
  TANK_STYLES,
  hexAlpha,
  stateColor,
  stateText,
  type ContainersScene,
} from './isocontainers.draw.ts'
import type { ContainersWorld } from './isocontainers.world.ts'
import { IsoContainerBuildingComponent } from './IsoContainerBuildingComponent.ts'
import { GATE_HEIGHT } from './IsoContainersGateComponent.ts'

export type IsoContainersSystemOptions = {
  /** The stacks that can be opened from the explorer */
  samples: ContainersSpec[]
  /** The id of the open stack ('custom' for one loaded from a URL, 'api' for the live one) */
  current: string
  /** Where a custom stack came from */
  source?: string
  /** Why the stack asked for (API, files) didn't load: shown at the start */
  error?: string
  /** Select and fly to a container (or network, volume) at the start */
  select?: string
  /** The zoom to fly in with */
  zoom?: number
  /** Building style rules from the URL (?styles=); the stack's own come first, the user's last */
  styleRules?: StyleRule[]
  /** Open the advisor at the start */
  advisor?: boolean
  /** Open the building settings of the selected container at the start */
  settings?: boolean
}

/** Who a style change applies to */
type StyleScope = 'image' | 'name' | 'kind'

/** The stacks list entry of the live stack, before it is loaded */
const LIVE_STACK: ContainersSpec = {
  title: 'Live.',
  subtitle: 'Your docker hosts, from the mc API',
  environments: [],
}

const STYLE_STORAGE = 'isocontainers.styles.v1'
/** The switches of the status bar: what they show, their key, and where the choice is kept */
type SwitchName = 'showAdvice' | 'showCrossHost'
const SWITCHES: Record<
  SwitchName,
  { label: string; key: string; title: string; color: string; storage: string }
> = {
  showAdvice: {
    label: '⚑ FLAGS',
    key: 'M',
    title: "Show or hide the advisor's flags",
    color: COLORS.amber,
    storage: 'isocontainers.flags.v1',
  },
  showCrossHost: {
    label: '⇄ HOST LINKS',
    key: 'L',
    title: 'Show or hide the connections between hosts (the selection keeps its own)',
    color: PALETTE.cross,
    storage: 'isocontainers.links.v1',
  },
}

/** The settings icon of the info pane */
const GEAR =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'

/** The groups of the health meter, in its order: what is fine first, what is gone last */
const HEALTH_GROUPS: Array<{ label: string; color: string; moods: Mood[] }> = [
  { label: 'healthy', color: COLORS.green, moods: ['ok'] },
  { label: 'starting', color: COLORS.amber, moods: ['starting', 'booting'] },
  { label: 'failing', color: COLORS.red, moods: ['unhealthy', 'crashloop'] },
  { label: 'paused', color: ICE, moods: ['paused'] },
  { label: 'crashed', color: FIRE, moods: ['burning', 'dead'] },
  { label: 'stopped', color: 'rgba(233,239,236,0.22)', moods: ['stopped', 'created'] },
]

/** What counts as an incident: a container that fails or crashed */
const INCIDENT_MOODS = new Set<Mood>(['unhealthy', 'crashloop', 'burning', 'dead'])
const ACCEPTED_STORAGE = 'isocontainers.accepted.v1'

function loadAccepted(): Set<string> {
  try {
    const list = JSON.parse(localStorage.getItem(ACCEPTED_STORAGE) ?? '[]')
    return new Set(Array.isArray(list) ? list.filter((x) => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

function saveAccepted(ids: Set<string>) {
  try {
    localStorage.setItem(ACCEPTED_STORAGE, JSON.stringify([...ids]))
  } catch {
    // private mode: accepted until the page reloads
  }
}

/** Five stars, in halves */
function stars(value: number, size = 13) {
  let html = ''
  for (let i = 0; i < 5; i++) {
    const fill = value >= i + 1 ? 1 : value >= i + 0.5 ? 0.5 : 0
    const on = COLORS.amber
    const off = 'rgba(255,255,255,0.16)'
    const background =
      fill === 0.5 ? `linear-gradient(90deg,${on} 50%,${off} 50%)` : fill ? on : off
    html +=
      `<span style="font-size:${size}px;line-height:1;background:${background};-webkit-background-clip:text;` +
      `background-clip:text;color:transparent">★</span>`
  }
  return `<span style="letter-spacing:1px;white-space:nowrap">${html}</span>`
}

/** The user's own style rules, kept in this browser */
function loadLocalRules(): StyleRule[] {
  try {
    return parseRules(JSON.parse(localStorage.getItem(STYLE_STORAGE) ?? '[]'))
  } catch {
    return []
  }
}

function saveLocalRules(rules: StyleRule[]) {
  try {
    localStorage.setItem(STYLE_STORAGE, JSON.stringify(rules))
  } catch {
    // private mode: the rules last until the page reloads
  }
}

const LEFT = 300
const RIGHT = 350
const TOP = 70
const BOTTOM = 56
const SPEEDS = [0.25, 0.5, 1, 2, 4, 8]

const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  )

const MONO_LABEL = `font:600 10px/1.4 ${FONT.mono};letter-spacing:2px;text-transform:uppercase;color:${COLORS.muted}`

/**
 * Runs the containers world: the simulation, the camera (drag to pan, fly to things), hover and
 * selection, the explorer on the left, the info pane on the right, the status bar and the HUD.
 * Keys: 1-9 open a stack, space pause, + / − speed, F fit, S stop / start the selected container, Esc clear.
 */
export class IsoContainersSystem extends AbstractGameSystem implements IGameSystem {
  public name = 'IsoContainersSystem'

  private readonly world: ContainersWorld
  private readonly options: IsoContainersSystemOptions
  private readonly sim: ContainersSimulation
  private speedIndex = 2
  private $explorer?: HTMLDivElement
  private $info?: HTMLDivElement
  private $hud?: HTMLDivElement
  private previousBackground = ''
  private previousCursor = ''
  private drag?: { x: number; y: number; ox: number; oy: number; moved: boolean }
  private glide?: { x: number; y: number; zoom: number }
  private lastCamera = { x: NaN, y: NaN, zoom: NaN }
  private backgroundKey = ''
  private refresh = 0
  private localRules = loadLocalRules()
  private advice: Advice[] = []
  /** What the advisor said at the start: what is gone since was fixed */
  private initialAdvice = new Set<string>()
  private accepted = loadAccepted()
  private advisorOpen = false
  private $toast?: HTMLDivElement
  private $status?: HTMLDivElement
  private styleScope: StyleScope = 'image'
  /** The info pane shows the container, or its building settings */
  private paneView: 'info' | 'building' = 'info'
  /** The tab of the host pane; it stays when another host is opened */
  private hostTab: 'engine' | 'network' = 'engine'
  /** The tab of the container pane; it stays when another container is selected */
  private containerTab: 'info' | 'advisor' = 'info'

  constructor(game: IGame, world: ContainersWorld, options: IsoContainersSystemOptions) {
    super(game)
    this.world = world
    this.options = options
    applyLooks(world.model, this.styleRules())
    this.sim = new ContainersSimulation(world.model)
    // a few seconds ahead, so the city opens with traffic on the move
    for (let i = 0; i < 150; i++) this.sim.step(1 / 30)
    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.handleMouseDown = this.handleMouseDown.bind(this)
    this.handleMouseUp = this.handleMouseUp.bind(this)
    this.handleMouseMove = this.handleMouseMove.bind(this)
  }

  public start() {
    this._game.eventbus.on('keyboard.keydown', this.handleKeyDown)
    this._game.eventbus.on('mouse.mousedown', this.handleMouseDown)
    this._game.eventbus.on('mouse.mouseup', this.handleMouseUp)
    window.addEventListener('mousemove', this.handleMouseMove)
    document.addEventListener('mouseleave', this.handleMouseLeave)
    const $c = this._game.$container
    this.previousBackground = $c.style.background
    this.previousCursor = $c.style.cursor
    this.$explorer = this.createPanel(
      `left:10px;top:10px;bottom:${BOTTOM + 10}px;width:${LEFT - 20}px;display:flex;flex-direction:column;padding:0`,
    )
    this.$info = this.createPanel(
      `right:10px;top:10px;width:${RIGHT - 20}px;max-height:calc(100vh - ${BOTTOM + 30}px);overflow-y:auto;` +
        'transform:translateX(110%);transition:transform 0.3s ease',
    )
    this.$hud = this.createPanel(`left:10px;bottom:10px;right:10px;padding:9px 14px`)
    for (const name of Object.keys(SWITCHES) as SwitchName[])
      this.world.scene[name] = this.loadSwitch(name)
    this.$status = this.createStatusBar()
    this.$toast = document.createElement('div')
    this.$toast.style.cssText =
      `position:fixed;top:66px;left:${LEFT}px;right:20px;z-index:9;text-align:center;pointer-events:none;` +
      `font:700 12px ${FONT.mono};letter-spacing:2px;color:${COLORS.amber};opacity:0;transition:opacity 0.4s ease`
    $c.appendChild(this.$toast)
    this.refreshAdvice()
    this.initialAdvice = new Set(this.advice.map((a) => a.id))
    this.renderExplorer()
    if (this.options.advisor) this.toggleAdvisor()
    if (this.options.error) this.toast(this.options.error, { color: COLORS.red, seconds: 10 })
    this.fitView(true)
    this.updateView()
    this.updateBackground()
    this.updateHud()
    const first = this.options.select && this.find(this.options.select)
    if (first) {
      this.select(first)
      this.focusOn(first, this.options.zoom)
      if (this.options.settings && first.type === 'container') this.showPane('building')
    }
  }

  public stop() {
    this._game.eventbus.off('keyboard.keydown', this.handleKeyDown)
    this._game.eventbus.off('mouse.mousedown', this.handleMouseDown)
    this._game.eventbus.off('mouse.mouseup', this.handleMouseUp)
    window.removeEventListener('mousemove', this.handleMouseMove)
    document.removeEventListener('mouseleave', this.handleMouseLeave)
    const $c = this._game.$container
    $c.style.background = this.previousBackground
    $c.style.cursor = this.previousCursor
    this.$explorer?.remove()
    this.$info?.remove()
    this.$hud?.remove()
    this.$toast?.remove()
    this.$status?.remove()
  }

  public async tick(deltaTime: number) {
    // cap the step, so a long frame (e.g. a background tab) doesn't skip ahead
    const seconds = Math.min(deltaTime, 100) / 1000
    this.world.scene.time += seconds
    this.sim.step(seconds)
    this.stepGlide(seconds)
    this.stepPlates(seconds)
    this.updateView()
    this.updateBackground()
    this.refresh -= seconds
    if (this.refresh <= 0) {
      this.refresh = 0.3
      this.updateHud()
      this.updateStatus()
      this.updateExplorerStates()
      // live values, but not under the pointer: a rebuilt button would swallow the click
      // (the building settings have nothing live: they stay as they are)
      if (this.paneOpen() && this.paneView === 'info' && !this.$info?.matches(':hover'))
        this.renderInfo()
    }
  }

  /** The rims light up and fade out smoothly as the pointer enters and leaves a plate */
  private stepPlates(seconds: number) {
    const { scene, model } = this.world
    const k = 1 - Math.exp(-seconds * 5)
    for (const env of model.environments) {
      const plate = scene.plates.get(env)
      const target = env === scene.hoveredPlate ? 1 : 0
      if (!plate) {
        if (target) scene.plates.set(env, { glow: 0, entered: scene.time })
        continue
      }
      plate.glow += (target - plate.glow) * k
      if (!target && plate.glow < 0.005) scene.plates.delete(env)
    }
  }

  /** The plate under the pointer; entering one starts its ripple */
  private hoverPlate(env: Environment | undefined) {
    const scene = this.world.scene
    if (env === scene.hoveredPlate) return
    scene.hoveredPlate = env
    const plate = env && scene.plates.get(env)
    if (plate) plate.entered = scene.time
  }

  /** A container by name (or environment/name), a network or a volume by name */
  private find(name: string): Entity | undefined {
    const { model } = this.world
    return (
      model.containers.find((c) => c.name === name || c.key === name || c.service === name) ??
      model.networks.find((n) => n.name === name || n.key === name) ??
      model.volumes.find((v) => v.name === name || v.key === name)
    )
  }

  // ---- camera ----

  private viewport() {
    return {
      width: this._game.$container.offsetWidth || window.innerWidth,
      height: this._game.$container.offsetHeight || window.innerHeight,
    }
  }

  /** The free part of the screen between the panels, where the camera centers things */
  private freeArea() {
    const { width, height } = this.viewport()
    const right = this.paneOpen() ? RIGHT : 10
    const left = width > 900 ? LEFT : 10
    const w = Math.max(240, width - left - right)
    const h = Math.max(200, height - TOP - BOTTOM)
    return { x: left + w / 2, y: TOP + h / 2, w, h }
  }

  /** The visible part of the world, so components can skip drawing what is off screen */
  private updateView() {
    const { offset, zoom } = this._game.camera
    const { width, height } = this.viewport()
    const view = this.world.scene.view
    view.x0 = offset.x / zoom
    view.y0 = offset.y / zoom
    view.x1 = (offset.x + width) / zoom
    view.y1 = (offset.y + height) / zoom
    this.world.scene.zoom = zoom
  }

  /** Move the camera so a world point is at the center of the free area */
  private glideTo(x: number, y: number, zoom: number, now = false) {
    const { minZoom = 0.1, maxZoom = 3 } = this._game.config.camera ?? {}
    const z = Math.max(minZoom, Math.min(maxZoom, zoom))
    if (now) {
      const f = this.freeArea()
      this.setCamera(x * z - f.x, y * z - f.y, z)
      this.glide = undefined
    } else {
      // start from where the camera is now: a drag or the wheel since the last glide moved it, and
      // stepGlide would take that for the user taking over and stop at once
      const { offset, zoom: current } = this._game.camera
      this.lastCamera = { x: offset.x, y: offset.y, zoom: current }
      this.glide = { x, y, zoom: z }
    }
  }

  private setCamera(x: number, y: number, zoom: number) {
    this._game.camera.zoom = zoom
    this._game.camera.offset = { x, y }
    this.lastCamera = { x, y, zoom }
  }

  private stepGlide(seconds: number) {
    if (!this.glide) return
    const cam = this._game.camera
    // the wheel or the keys moved the camera: they win
    if (
      cam.zoom !== this.lastCamera.zoom ||
      cam.offset.x !== this.lastCamera.x ||
      cam.offset.y !== this.lastCamera.y
    ) {
      this.glide = undefined
      return
    }
    const f = this.freeArea()
    const k = 1 - Math.exp(-seconds * 6)
    const cx = (cam.offset.x + f.x) / cam.zoom
    const cy = (cam.offset.y + f.y) / cam.zoom
    const zoom = Math.exp(Math.log(cam.zoom) + (Math.log(this.glide.zoom) - Math.log(cam.zoom)) * k)
    const x = cx + (this.glide.x - cx) * k
    const y = cy + (this.glide.y - cy) * k
    this.setCamera(x * zoom - f.x, y * zoom - f.y, zoom)
    if (
      Math.abs(x - this.glide.x) < 0.5 &&
      Math.abs(y - this.glide.y) < 0.5 &&
      Math.abs(zoom - this.glide.zoom) < 0.002
    ) {
      this.glide = undefined
    }
  }

  /** Zoom out and center, so all plates (or the given ones) fit between the panels */
  private fitView(now = false, environments = this.world.model.environments, maxZoom = 1.4) {
    const P = this.world.scene.projection
    const xs: number[] = []
    const ys: number[] = []
    for (const e of environments) {
      for (const [c, r, z] of [
        [e.col, e.row, 0],
        [e.col + e.cols, e.row, 0],
        [e.col, e.row + e.rows, 0],
        [e.col + e.cols, e.row + e.rows, 0],
        [e.col + 2, e.row + 2, 70],
      ]) {
        const [x, y] = P.at(c, r, z)
        xs.push(x)
        ys.push(y)
      }
    }
    if (!xs.length) return
    const [x0, x1] = [Math.min(...xs), Math.max(...xs)]
    const [y0, y1] = [Math.min(...ys), Math.max(...ys)]
    const f = this.freeArea()
    const zoom = Math.min(maxZoom, (f.w * 0.94) / (x1 - x0), (f.h * 0.94) / (y1 - y0))
    this.glideTo((x0 + x1) / 2, (y0 + y1) / 2, zoom, now)
  }

  private focusOn(e: Entity, zoomTo?: number) {
    const P = this.world.scene.projection
    const [x, y] =
      e.type === 'container'
        ? P.at(e.col + e.w / 2, e.row + e.d / 2, e.height / 2)
        : e.type === 'volume'
          ? P.at(e.col, e.row, e.height / 2)
          : P.at((e.col0 + e.col1) / 2, e.row)
    const zoom =
      e.type === 'network'
        ? Math.max(0.6, this._game.camera.zoom)
        : Math.max(this._game.camera.zoom, 1.1)
    this.glideTo(x, y, zoomTo ?? Math.min(1.8, zoom))
  }

  /** The dot grid moves and scales with the camera, so the floor feels attached to the city */
  private updateBackground() {
    const { offset, zoom } = this._game.camera
    let size = 28 * zoom
    while (size < 12) size *= 2
    const px = -offset.x % size
    const py = -offset.y % size
    const key = `${px.toFixed(1)},${py.toFixed(1)},${size.toFixed(2)}`
    if (key === this.backgroundKey) return
    this.backgroundKey = key
    const s = this._game.$container.style
    s.backgroundColor = COLORS.bg0
    s.backgroundImage =
      `radial-gradient(circle, ${COLORS.dot} 1px, transparent 1.6px),` +
      `radial-gradient(ellipse at 55% 45%, ${COLORS.bg1} 0%, ${COLORS.bg0} 75%)`
    s.backgroundSize = `${size}px ${size}px, 100% 100%`
    s.backgroundPosition = `${px}px ${py}px, 0 0`
  }

  // ---- input ----

  private isOnPanel(e: Event) {
    return !!(e.target as HTMLElement | null)?.closest?.('.isocontainers-panel')
  }

  /** The grid point under a screen point, on the plane at height z */
  private gridAt(clientX: number, clientY: number, z: number) {
    const rect = this._game.$container.getBoundingClientRect()
    const { offset, zoom } = this._game.camera
    const P = this.world.scene.projection
    const x = (clientX - rect.left + offset.x) / zoom
    const y = (clientY - rect.top + offset.y) / zoom + z * P.zScale
    return P.toGrid(x, y)
  }

  /** The host whose gate (its pad, pillars, beam or label) is under a screen point */
  private pickHost(clientX: number, clientY: number): Environment | undefined {
    const half = LOT.avenue / 2 + 0.4
    for (const env of this.world.model.environments) {
      const [gc, gr] = env.gate
      for (const z of [GATE_HEIGHT, GATE_HEIGHT / 2, 0]) {
        const [col, row] = this.gridAt(clientX, clientY, z)
        // on the ground, the label in front counts too
        if (Math.abs(col - gc) <= half && row >= gr - 0.5 && row <= gr + (z ? 0.5 : 1.2)) return env
      }
    }
    return undefined
  }

  /** The thing under a screen point: buildings and tanks (front-most wins), then streets */
  private pick(clientX: number, clientY: number): Entity | undefined {
    const { model } = this.world
    let best: Entity | undefined
    let depth = -Infinity
    const consider = (e: Entity, d: number) => {
      if (d > depth) {
        best = e
        depth = d
      }
    }
    for (const c of model.containers) {
      // the roof or the ground footprint (a tall building also hides what is behind its sides)
      for (const z of [c.height, c.height / 2, 0]) {
        const [col, row] = this.gridAt(clientX, clientY, z)
        if (col >= c.col && col <= c.col + c.w && row >= c.row && row <= c.row + c.d) {
          consider(c, c.col + c.w / 2 + c.row + c.d / 2)
          break
        }
      }
    }
    for (const v of model.volumes) {
      for (const z of [v.height, v.height / 2, 0]) {
        const [col, row] = this.gridAt(clientX, clientY, z)
        if (Math.hypot(col - v.col, row - v.row) <= v.r + 0.08) {
          consider(v, v.col + v.row)
          break
        }
      }
    }
    if (best) return best
    const [col, row] = this.gridAt(clientX, clientY, 0)
    return model.networks.find(
      (n) => n.street && col >= n.col0 && col <= n.col1 && Math.abs(row - n.row) <= LOT.street / 2,
    )
  }

  private handleMouseDown(e: MouseEvent) {
    if (e.button !== 0 || this.isOnPanel(e)) return
    const { offset } = this._game.camera
    this.drag = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y, moved: false }
  }

  private handleMouseMove(e: MouseEvent) {
    const drag = this.drag
    if (drag && e.buttons & 1) {
      const dx = e.clientX - drag.x
      const dy = e.clientY - drag.y
      if (!drag.moved && Math.hypot(dx, dy) > 4) drag.moved = true
      if (drag.moved) {
        this.glide = undefined
        this._game.camera.offset = { x: drag.ox - dx, y: drag.oy - dy }
        this._game.$container.style.cursor = 'grabbing'
      }
      return
    }
    if (this.isOnPanel(e)) {
      if (!(e.target as HTMLElement).closest('[data-key]')) this.world.scene.hovered = undefined
      if (!(e.target as HTMLElement).closest('[data-host]'))
        this.world.scene.hoveredHost = undefined
      this.hoverPlate(undefined)
      return
    }
    const [col, row] = this.gridAt(e.clientX, e.clientY, 0)
    this.hoverPlate(
      this.world.model.environments.find(
        (env) =>
          col >= env.col &&
          col <= env.col + env.cols &&
          row >= env.row &&
          row <= env.row + env.rows,
      ),
    )
    const host = this.pickHost(e.clientX, e.clientY)
    const thing = host ? undefined : this.pick(e.clientX, e.clientY)
    this.world.scene.hoveredHost = host
    this.world.scene.hovered = thing
    this._game.$container.style.cursor = thing || host ? 'pointer' : ''
  }

  /** The pointer left the page: nothing is under it */
  private handleMouseLeave = () => {
    this.hoverPlate(undefined)
    this.world.scene.hovered = undefined
    this.world.scene.hoveredHost = undefined
  }

  private handleMouseUp(e: MouseEvent) {
    const drag = this.drag
    this.drag = undefined
    if (!drag) return
    this._game.$container.style.cursor = ''
    if (drag.moved) return
    const host = this.pickHost(e.clientX, e.clientY)
    if (host) return this.openHost(host === this.world.scene.openHost ? undefined : host)
    const thing = this.pick(e.clientX, e.clientY)
    this.select(thing && thing !== this.world.scene.selected ? thing : undefined)
  }

  private handleKeyDown(e: KeyboardEvent) {
    if ((e.target as HTMLElement | null)?.closest?.('select, input, textarea')) return
    const index = Number(e.key)
    if (e.key === '0') return this.open('api')
    if (index >= 1 && index <= this.options.samples.length)
      return this.open(this.options.samples[index - 1].id!)
    const selected = this.world.scene.selected
    if (e.code === 'Space') {
      this.sim.paused = !this.sim.paused
      e.preventDefault()
    } else if (e.key === '+' || e.key === '=')
      this.speedIndex = Math.min(SPEEDS.length - 1, this.speedIndex + 1)
    else if (e.key === '-') this.speedIndex = Math.max(0, this.speedIndex - 1)
    else if (e.key === 'f' || e.key === 'F') this.fitView()
    else if ((e.key === 's' || e.key === 'S') && selected?.type === 'container')
      this.toggle(selected)
    else if (e.key === 'a' || e.key === 'A') this.toggleAdvisor()
    else if (e.key === 'm' || e.key === 'M') this.toggleSwitch('showAdvice')
    else if (e.key === 'l' || e.key === 'L') this.toggleSwitch('showCrossHost')
    else if (e.key === 'Escape') {
      if (this.paneView === 'building') this.showPane('info')
      else if (this.world.scene.selected) this.select(undefined)
      else if (this.world.scene.openHost) this.openHost(undefined)
      else if (this.advisorOpen) this.toggleAdvisor()
    } else return
    this.sim.speed = SPEEDS[this.speedIndex]
    this.updateHud()
  }

  /** docker stop / docker start */
  private toggle(c: Container) {
    if (c.state === 'running' || c.state === 'restarting' || c.state === 'paused') this.sim.stop(c)
    else this.sim.start(c)
    this.renderInfo()
    this.updateExplorerStates()
  }

  private open(id: string) {
    if (id === this.options.current) return
    const params = new URLSearchParams(window.location.search)
    if (id === 'api') {
      params.set('api', '')
      params.delete('stack')
    } else {
      params.set('stack', id)
      params.delete('api')
    }
    params.delete('graph')
    params.delete('select')
    window.location.search = params.toString()
  }

  private select(thing: Entity | undefined, fly = false) {
    const scene = this.world.scene
    if (thing !== scene.selected) this.paneView = 'info'
    scene.selected = thing
    scene.openHost = undefined
    scene.focus = thing ? neighborhood(thing, this.world.model) : undefined
    this.updatePane()
    if (thing && fly) this.focusOn(thing)
    this.renderInfo()
    this.highlightExplorer()
  }

  /** Open a host in the side pane (undefined closes it); it takes the place of the selection */
  private openHost(env: Environment | undefined, fly = false) {
    const scene = this.world.scene
    if (env && env !== scene.openHost && this.$info) this.$info.scrollTop = 0
    scene.openHost = env
    if (env) {
      scene.selected = undefined
      scene.focus = undefined
      this.paneView = 'info'
    }
    this.updatePane()
    this.renderInfo()
    this.highlightExplorer()
    // the whole plate, between the panels, but not closer than a building's view
    if (env && fly) this.fitView(false, [env], 1.1)
  }

  // ---- panels ----

  private createPanel(position: string): HTMLDivElement {
    const $panel = document.createElement('div')
    // the panel class makes the system ignore clicks on it
    $panel.className = 'isocontainers-panel'
    $panel.style.cssText =
      `position:fixed;${position};z-index:10;padding:14px 16px;box-sizing:border-box;` +
      `background:rgba(9,13,14,0.82);color:${COLORS.text};font:12.5px/1.5 ${FONT.ui};` +
      'border-radius:12px;border:1px solid rgba(255,255,255,0.08);' +
      'box-shadow:0 12px 40px rgba(0,0,0,0.55);backdrop-filter:blur(10px)'
    // the wheel scrolls the panel, not the map
    $panel.dataset.nativeScroll = ''
    this._game.$container.appendChild($panel)
    return $panel
  }

  private dot(color: string, size = 7, glow = false) {
    return (
      `<span style="display:inline-block;width:${size}px;height:${size}px;border-radius:50%;background:${color};` +
      `${glow ? `box-shadow:0 0 8px ${color};` : ''}margin-right:8px;vertical-align:middle;flex:none"></span>`
    )
  }

  private square(color: string) {
    return `<span style="display:inline-block;width:10px;height:3px;border-radius:2px;background:${color};margin-right:8px;vertical-align:middle;flex:none"></span>`
  }

  private renderExplorer() {
    const $panel = this.$explorer
    if (!$panel) return
    const { model } = this.world
    const items = this.options.samples.map((s, i) => ({ id: s.id!, key: String(i + 1), spec: s }))
    if (this.options.current === 'custom') items.push({ id: 'custom', key: '·', spec: model.spec })
    // the live stack, from the mission-control API (through the dev proxy)
    items.push({
      id: 'api',
      key: '0',
      spec: this.options.current === 'api' ? model.spec : LIVE_STACK,
    })
    const stacks = items
      .map(({ id, key, spec }) => {
        const active = id === this.options.current
        return (
          `<div class="isocontainers-stack" data-id="${id}" style="display:flex;gap:10px;padding:7px 10px;margin:2px 0;` +
          `border-radius:8px;cursor:pointer;border-left:2px solid ${active ? COLORS.green : 'transparent'};` +
          `background:${active ? 'rgba(62,224,127,0.08)' : 'transparent'}">` +
          `<span style="font:600 11px ${FONT.mono};color:${COLORS.faint};padding-top:2px">${key}</span>` +
          `<div style="min-width:0"><div style="font-weight:600;color:${active ? COLORS.text : '#c5cfcc'}">${escapeHtml(spec.title)}</div>` +
          `<div style="color:${COLORS.muted};font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">` +
          `${escapeHtml(spec.subtitle ?? '')}</div></div></div>`
        )
      })
      .join('')
    const stat = (value: string | number, label: string) =>
      `<div style="flex:1"><div style="font:600 16px ${FONT.ui};color:${COLORS.text}">${value}</div>` +
      `<div style="${MONO_LABEL};font-size:9px;letter-spacing:1.5px">${label}</div></div>`

    $panel.innerHTML =
      `<div style="padding:14px 16px 10px;border-bottom:1px solid rgba(255,255,255,0.06)">` +
      `<div style="${MONO_LABEL};color:${COLORS.text}">${this.dot(COLORS.green, 7, true)}IsoContainers</div>` +
      `<div style="color:${COLORS.muted};margin-top:4px">Docker hosts as a city: networks are streets, containers buildings, volumes tanks</div></div>` +
      `<div style="padding:10px 8px 6px"><div style="${MONO_LABEL};padding:0 8px 4px">Stacks</div>${stacks}</div>` +
      `<div style="display:flex;gap:6px;padding:10px 16px;border-top:1px solid rgba(255,255,255,0.06);border-bottom:1px solid rgba(255,255,255,0.06)">` +
      `${stat(model.environments.length, 'hosts')}${stat(model.containers.length, 'containers')}` +
      `${stat(model.networks.filter((n) => n.street).length, 'networks')}${stat(model.volumes.length, 'volumes')}</div>` +
      `<div class="isocontainers-rating" title="The advisor (A)" style="display:flex;align-items:center;padding:10px 16px;cursor:pointer;` +
      `border-bottom:1px solid rgba(255,255,255,0.06)"></div>` +
      `<div class="isocontainers-tree" style="overflow-y:auto;padding:4px 8px 12px;flex:1"></div>`

    $panel.querySelectorAll<HTMLDivElement>('.isocontainers-stack').forEach(($row) => {
      $row.onclick = () => this.open($row.dataset.id!)
    })
    const $rating = $panel.querySelector<HTMLDivElement>('.isocontainers-rating')!
    $rating.onclick = () => this.toggleAdvisor()
    this.updateRating()
    const $tree = $panel.querySelector<HTMLDivElement>('.isocontainers-tree')!
    for (const env of model.environments) {
      const $env = document.createElement('div')
      $env.dataset.host = env.key
      $env.title = 'The host: its engine and network'
      $env.style.cssText = `${MONO_LABEL};color:${COLORS.text};padding:8px 8px 4px;margin-top:2px;border-radius:6px;cursor:pointer`
      $env.onmouseenter = () => {
        this.world.scene.hoveredHost = env
        if (!$env.dataset.active) $env.style.background = 'rgba(255,255,255,0.05)'
      }
      $env.onmouseleave = () => {
        if (this.world.scene.hoveredHost === env) this.world.scene.hoveredHost = undefined
        $env.style.background = $env.dataset.active ? 'rgba(62,224,127,0.12)' : ''
      }
      $env.onclick = () => this.openHost(env === this.world.scene.openHost ? undefined : env, true)
      $env.innerHTML =
        `<div>${escapeHtml(env.name)}</div>` +
        `<div style="color:${COLORS.faint};letter-spacing:1px;font-size:9px">${escapeHtml(env.caption ?? '')}</div>`
      $tree.appendChild($env)
      const order = (c: Container) => (c.project ?? '') + c.name
      for (const c of [...env.containers].sort((a, b) => order(a).localeCompare(order(b))))
        this.treeRow(
          $tree,
          c,
          `<span class="isocontainers-state">${this.dot(stateColor(c))}</span>`,
          c.name,
          KIND_LABELS[c.kind],
        )
      for (const n of env.networks.filter((n) => n.street))
        this.treeRow($tree, n, this.square(n.accent), n.name, `network · ${n.members.length}`)
      for (const v of env.volumes)
        this.treeRow(
          $tree,
          v,
          this.dot(TANK_STYLES[v.sizeClass].color, 6),
          v.anonymous ? `${v.name.slice(0, 12)}…` : v.name,
          v.size ? `volume · ${v.size}` : 'volume',
        )
    }
    this.updateExplorerStates()
  }

  private treeRow($tree: HTMLDivElement, e: Entity, icon: string, label: string, caption: string) {
    const $row = document.createElement('div')
    $row.dataset.key = e.key
    $row.style.cssText =
      'display:flex;align-items:center;padding:3px 8px;border-radius:6px;cursor:pointer;white-space:nowrap'
    $row.innerHTML =
      `${icon}<span style="overflow:hidden;text-overflow:ellipsis">${escapeHtml(label)}</span>` +
      `<span style="margin-left:auto;padding-left:8px;font:500 10px ${FONT.mono};color:${COLORS.faint};text-transform:uppercase">${escapeHtml(caption)}</span>`
    $row.onmouseenter = () => {
      this.world.scene.hovered = e
      if (!$row.dataset.active) $row.style.background = 'rgba(255,255,255,0.05)'
    }
    $row.onmouseleave = () => {
      if (this.world.scene.hovered === e) this.world.scene.hovered = undefined
      $row.style.background = $row.dataset.active ? 'rgba(62,224,127,0.12)' : ''
    }
    $row.onclick = () => this.select(e, true)
    $tree.appendChild($row)
  }

  private updateExplorerStates() {
    this.$explorer
      ?.querySelectorAll<HTMLDivElement>('.isocontainers-tree > div[data-key]')
      .forEach(($row) => {
        const c = this.world.model.byKey.get($row.dataset.key!)
        const $dot = $row.querySelector<HTMLSpanElement>('.isocontainers-state > span')
        if (!c || c.type !== 'container' || !$dot) return
        const color = stateColor(c)
        $dot.style.background = color
        $dot.style.boxShadow = c.state === 'running' && c.flash > 0.3 ? `0 0 8px ${color}` : 'none'
      })
  }

  private highlightExplorer() {
    const host = this.world.scene.openHost?.key
    this.$explorer
      ?.querySelectorAll<HTMLDivElement>('.isocontainers-tree > div[data-host]')
      .forEach(($env) => {
        const active = $env.dataset.host === host
        $env.dataset.active = active ? '1' : ''
        $env.style.background = active ? 'rgba(62,224,127,0.12)' : ''
        if (active) $env.scrollIntoView({ block: 'nearest' })
      })
    const key = this.world.scene.selected?.key
    this.$explorer
      ?.querySelectorAll<HTMLDivElement>('.isocontainers-tree > div[data-key]')
      .forEach(($row) => {
        const active = $row.dataset.key === key
        $row.dataset.active = active ? '1' : ''
        $row.style.background = active ? 'rgba(62,224,127,0.12)' : ''
        if (active) $row.scrollIntoView({ block: 'nearest' })
      })
  }

  private section(title: string) {
    return `<div style="${MONO_LABEL};margin-top:14px">${title}</div>`
  }

  private facts(rows: Array<[string, string]>) {
    return (
      '<table style="width:100%;border-collapse:collapse;margin-top:6px;table-layout:fixed">' +
      rows
        .map(
          ([k, v]) =>
            `<tr><td style="color:${COLORS.muted};padding:2px 10px 2px 0;white-space:nowrap;width:92px">${k}</td>` +
            `<td style="text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(v)}">${escapeHtml(v)}</td></tr>`,
        )
        .join('') +
      '</table>'
    )
  }

  private link(e: Entity, label: string, right = '') {
    const color =
      e.type === 'container'
        ? stateColor(e)
        : e.type === 'network'
          ? e.accent
          : TANK_STYLES[e.sizeClass].color
    return (
      `<div class="isocontainers-link" data-key="${escapeHtml(e.key)}" style="display:flex;align-items:center;padding:3px 0;cursor:pointer;color:#cfe9db;min-width:0">` +
      `${this.dot(color, 6)}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(label)}</span>` +
      (right
        ? `<span style="margin-left:auto;padding-left:8px;font:500 10px ${FONT.mono};color:${COLORS.faint};white-space:nowrap">${escapeHtml(right)}</span>`
        : '') +
      '</div>'
    )
  }

  private chip(text: string, color: string, glow: boolean) {
    return (
      `<div style="display:inline-flex;align-items:center;margin-top:8px;padding:2px 10px 2px 8px;border-radius:20px;` +
      `border:1px solid ${color}55;background:${color}14;font:600 10.5px ${FONT.mono};letter-spacing:1px;color:${color}">` +
      `${this.dot(color, 6, glow)}${escapeHtml(text)}</div>`
    )
  }

  /** The info pane shows while something is selected, a host is open, or the advisor is */
  private paneOpen() {
    return !!this.world.scene.selected || !!this.world.scene.openHost || this.advisorOpen
  }

  private updatePane() {
    const open = this.paneOpen()
    if (this.$info) this.$info.style.transform = open ? 'translateX(0)' : 'translateX(110%)'
    if (this.$toast) this.$toast.style.right = open ? `${RIGHT}px` : '20px'
    if (this.$status) {
      // centered in the free space between the panels, never under them
      const right = open ? RIGHT : 10
      this.$status.style.right = `${right}px`
      this.$status.style.maxWidth = `calc(100vw - ${LEFT + right}px)`
    }
  }

  private renderInfo() {
    const $info = this.$info
    const e = this.world.scene.selected
    if (!$info) return
    if (!e && this.world.scene.openHost) {
      $info.innerHTML = this.hostInfo(this.world.scene.openHost)
      this.bindInfo($info)
      this.bindTabs($info, (tab) => (this.hostTab = tab as 'engine' | 'network'))
      return
    }
    if (!e) {
      if (!this.advisorOpen) return
      $info.innerHTML = this.advisorInfo()
      this.bindInfo($info)
      return
    }
    if (e.type === 'container' && this.paneView === 'building') {
      $info.innerHTML = this.buildingSettings(e)
      this.bindStyleEditor($info, e)
      this.drawPreviews($info, e)
      return
    }
    let html =
      e.type === 'container'
        ? this.containerInfo(e)
        : e.type === 'network'
          ? this.networkInfo(e)
          : this.volumeInfo(e)
    html += `<div style="margin-top:14px;color:${COLORS.faint};font-size:11px">esc to close · click a name to jump</div>`
    $info.innerHTML = html
    this.bindInfo($info)
    const $toggle = $info.querySelector<HTMLButtonElement>('.isocontainers-toggle')
    if ($toggle && e.type === 'container') $toggle.onclick = () => this.toggle(e)
    const $settings = $info.querySelector<HTMLButtonElement>('.isocontainers-settings')
    if ($settings) $settings.onclick = () => this.showPane('building')
    this.bindTabs($info, (tab) => (this.containerTab = tab as 'info' | 'advisor'))
  }

  private bindTabs($info: HTMLDivElement, choose: (tab: string) => void) {
    $info.querySelectorAll<HTMLButtonElement>('.isocontainers-tab').forEach(($b) => {
      $b.onclick = () => {
        choose($b.dataset.tab!)
        $info.scrollTop = 0
        this.renderInfo()
      }
    })
  }

  private showPane(view: 'info' | 'building') {
    this.paneView = view
    if (this.$info) this.$info.scrollTop = 0
    this.renderInfo()
  }

  private containerInfo(c: Container): string {
    const color = stateColor(c)
    const up = c.state === 'running' || c.state === 'restarting' || c.state === 'paused'
    const rows: Array<[string, string]> = [
      ['Image', c.image],
      ...(c.exitCode !== undefined && c.state === 'exited'
        ? ([
            [
              'Exit code',
              `${c.exitCode}${c.exitCode === 137 ? ' (killed)' : c.exitCode === 0 ? ' (clean)' : ''}`,
            ],
          ] as Array<[string, string]>)
        : []),
      ['Kind', KIND_LABELS[c.kind] + (c.replicas > 1 ? ` × ${c.replicas}` : '')],
      ['Host', c.env.name],
    ]
    if (c.project) rows.push(['Project', c.service ? `${c.project} / ${c.service}` : c.project])
    if (c.restart) rows.push(['Restart', c.restart])
    if (c.memory) rows.push(['Memory limit', c.memory])
    if (c.cpus) rows.push(['CPUs', String(c.cpus)])
    if (c.created) rows.push(['Created', c.created.replace('T', ' ').slice(0, 16)])

    const live: Array<[string, string]> = [
      ['CPU', `${c.cpu.toFixed(1)} %`],
      ['Memory', `${Math.round(c.mem)} MiB`],
      ['Requests', String(c.requests)],
    ]
    if (c.errors) live.push(['Failed', String(c.errors)])

    let html =
      `<div style="display:flex;align-items:center"><div style="${MONO_LABEL}">${escapeHtml(KIND_LABELS[c.kind])} · container</div>` +
      `<button class="isocontainers-settings" title="Building settings: style, roof, accent, height, sign" ` +
      `style="margin-left:auto;display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:7px;cursor:pointer;` +
      `font:600 9.5px ${FONT.mono};letter-spacing:1px;color:${COLORS.muted};background:rgba(255,255,255,0.04);` +
      `border:1px solid rgba(255,255,255,0.12)">${GEAR}${escapeHtml(STYLES[c.look.style].label.toUpperCase())}</button></div>` +
      `<div style="font:600 19px/1.3 ${FONT.ui};margin-top:4px;word-break:break-word">${escapeHtml(c.name)}</div>` +
      `<div style="display:flex;align-items:center;gap:8px">${this.chip(stateText(c), color, c.state === 'running')}` +
      `<button class="isocontainers-toggle" style="margin:8px 0 0 auto;padding:3px 12px;border-radius:6px;cursor:pointer;` +
      `font:600 10.5px ${FONT.mono};letter-spacing:1px;color:${COLORS.text};background:rgba(255,255,255,0.06);` +
      `border:1px solid rgba(255,255,255,0.14)">${up ? 'STOP' : 'START'} · S</button></div>` +
      this.tabBar(this.containerTab, [
        ['info', 'INFO'],
        ['advisor', this.advisorTabLabel(c)],
      ])
    if (this.containerTab === 'advisor') return html + this.adviceSection(c)
    html += this.facts(rows)
    if (c.note) html += `<div style="margin-top:10px;color:#c5cfcc">${escapeHtml(c.note)}</div>`
    html += this.section('Live') + this.facts(live)
    if (c.command)
      html +=
        this.section('Command') +
        `<pre style="margin:6px 0 0;padding:8px 10px;border-radius:8px;background:rgba(255,255,255,0.04);` +
        `border:1px solid rgba(255,255,255,0.06);font:11.5px/1.5 ${FONT.mono};color:#b9c6c2;white-space:pre-wrap;word-break:break-all">` +
        `${escapeHtml(c.command)}</pre>`
    if (c.ports.length)
      html +=
        this.section(`Ports (${c.ports.length})`) +
        this.facts(
          c.ports.map((p) => [
            `${p.port}/${p.proto}`,
            isPublished(p)
              ? `${p.hostIp ?? '0.0.0.0'}:${p.hostPort}${p.local ? ' (local)' : ''}`
              : 'exposed',
          ]),
        )
    if (c.attachments.length)
      html +=
        this.section(`Networks (${c.attachments.length})`) +
        c.attachments.map((a) => this.link(a.network, a.network.name, a.ip ?? '')).join('')
    if (c.mounts.length)
      html +=
        this.section(`Mounts (${c.mounts.length})`) +
        c.mounts
          .map((m) =>
            m.volume
              ? this.link(
                  m.volume,
                  m.volume.anonymous ? `${m.volume.name.slice(0, 12)}…` : m.volume.name,
                  `${m.target}${m.readOnly ? ' ro' : ''}`,
                )
              : `<div style="display:flex;padding:3px 0;color:${COLORS.muted};min-width:0">${this.dot(COLORS.faint, 6)}` +
                `<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(m.source || m.type)}</span>` +
                `<span style="margin-left:auto;padding-left:8px;font:500 10px ${FONT.mono};color:${COLORS.faint};white-space:nowrap">` +
                `${escapeHtml(m.type.toUpperCase())} → ${escapeHtml(m.target)}${m.readOnly ? ' ro' : ''}</span></div>`,
          )
          .join('')
    const calls = c.out.filter((l) => l.kind === 'call')
    const callers = c.in.filter((l) => l.kind === 'call')
    if (calls.length)
      html +=
        this.section(`Calls (${calls.length})`) +
        calls
          .map((l) =>
            this.link(
              l.to,
              l.to.env === c.env ? l.to.name : `${l.to.env.name} / ${l.to.name}`,
              l.inferred ? 'guessed' : '',
            ),
          )
          .join('')
    if (callers.length)
      html +=
        this.section(`Called by (${callers.length})`) +
        callers
          .map((l) =>
            this.link(
              l.from!,
              l.from!.env === c.env ? l.from!.name : `${l.from!.env.name} / ${l.from!.name}`,
              l.inferred ? 'guessed' : '',
            ),
          )
          .join('')
    if (c.in.some((l) => l.kind === 'ingress'))
      html += `<div style="margin-top:8px;color:${COLORS.muted}">${this.dot(COLORS.greenSoft, 6)}Reachable from outside through the host gate</div>`
    return html
  }

  /** Links to entities and the advisor's buttons */
  private bindInfo($info: HTMLDivElement) {
    $info.querySelectorAll<HTMLDivElement>('.isocontainers-link').forEach(($link) => {
      $link.onclick = () => this.select(this.world.model.byKey.get($link.dataset.key!), true)
    })
    $info.querySelectorAll<HTMLButtonElement>('.isocontainers-advice').forEach(($b) => {
      $b.onclick = () => {
        const a = this.advice.find((x) => x.id === $b.dataset.id)
        if (!a) return
        if ($b.dataset.action === 'fix') this.fix(a)
        else if ($b.dataset.action === 'accept') this.accept(a)
        else if ($b.dataset.action === 'copy') this.copy($b, a.fix)
      }
    })
    $info.querySelectorAll<HTMLElement>('.isocontainers-advisor-open').forEach(($b) => {
      $b.onclick = () => {
        this.advisorOpen = true
        this.world.scene.allAdvice = true
        this.select(undefined)
      }
    })
  }

  // ---- the status bar ----

  /**
   * The bar at the top: a health meter of all containers by state, the incidents, the traffic and
   * its error rate, the advisor's rating, and the switch for its flags. Built once, then only its
   * values change, so a click on it is never lost to a rebuild.
   */
  private createStatusBar(): HTMLDivElement {
    const $bar = this.createPanel(
      `top:10px;left:${LEFT}px;right:10px;margin:0 auto;width:max-content;max-width:calc(100vw - ${LEFT + 10}px);` +
        'padding:7px 8px 7px 16px;border-radius:22px;display:flex;flex-wrap:wrap;justify-content:center;align-items:center;' +
        'column-gap:14px;row-gap:6px;white-space:nowrap;' +
        'transition:right 0.3s ease',
    )
    const label = `font:600 9.5px ${FONT.mono};letter-spacing:1.5px;color:${COLORS.muted}`
    const value = `font:600 13px ${FONT.ui};color:${COLORS.text}`
    $bar.innerHTML =
      `<div style="display:flex;align-items:center;gap:10px"><span style="${label}">HEALTH</span>` +
      `<div class="isocontainers-meter" style="display:flex;gap:2px;width:140px;height:8px;border-radius:4px;overflow:hidden;background:rgba(255,255,255,0.06)"></div>` +
      `<span class="isocontainers-health" style="${value}"></span></div>` +
      `<div class="isocontainers-incidents" style="font:600 10.5px ${FONT.mono};letter-spacing:1px"></div>` +
      `<div style="display:flex;align-items:baseline;gap:6px"><span class="isocontainers-rps" style="${value}"></span><span style="${label}">REQ/S</span></div>` +
      `<div style="display:flex;align-items:baseline;gap:6px"><span class="isocontainers-errors" style="${value}"></span><span style="${label}">ERRORS</span></div>` +
      `<div class="isocontainers-status-rating" title="The advisor (A)" style="display:flex;align-items:center;gap:6px;cursor:pointer"></div>` +
      (Object.keys(SWITCHES) as SwitchName[])
        .map(
          (name) =>
            `<button class="isocontainers-switch" data-switch="${name}" title="${SWITCHES[name].title} (${SWITCHES[name].key})" ` +
            `style="padding:4px 10px;border-radius:14px;cursor:pointer;font:600 10px ${FONT.mono};letter-spacing:1px"></button>`,
        )
        .join('')
    $bar.querySelector<HTMLDivElement>('.isocontainers-status-rating')!.onclick = () =>
      this.toggleAdvisor()
    $bar.querySelectorAll<HTMLButtonElement>('.isocontainers-switch').forEach(($b) => {
      $b.onclick = () => this.toggleSwitch($b.dataset.switch as SwitchName)
    })
    return $bar
  }

  private updateStatus() {
    const $bar = this.$status
    if (!$bar) return
    const { model } = this.world
    const moods = model.containers.map(moodOf)

    // the meter: one segment per group, as wide as its share
    const $meter = $bar.querySelector<HTMLDivElement>('.isocontainers-meter')!
    const counts = HEALTH_GROUPS.map((g) => moods.filter((m) => g.moods.includes(m)).length)
    const key = counts.join(',')
    if ($meter.dataset.key !== key) {
      $meter.dataset.key = key
      $meter.innerHTML = HEALTH_GROUPS.map((g, i) =>
        counts[i]
          ? `<div title="${counts[i]} ${g.label}" style="flex:${counts[i]} 0 0;background:${g.color};` +
            `${i === 0 ? `box-shadow:0 0 8px ${g.color}` : ''}"></div>`
          : '',
      ).join('')
    }
    const healthy = counts[0]
    const $health = $bar.querySelector<HTMLSpanElement>('.isocontainers-health')!
    $health.textContent = `${healthy}/${moods.length}`
    $health.style.color = healthy === moods.length ? COLORS.green : COLORS.text

    const incidents = moods.filter((m) => INCIDENT_MOODS.has(m)).length
    const $incidents = $bar.querySelector<HTMLDivElement>('.isocontainers-incidents')!
    $incidents.innerHTML = incidents
      ? `${this.dot(COLORS.red, 7, true)}<span style="color:${COLORS.red}">${incidents} INCIDENT${incidents > 1 ? 'S' : ''}</span>`
      : `${this.dot(COLORS.green, 7)}<span style="color:${COLORS.green}">NO INCIDENTS</span>`

    const sim = this.sim
    $bar.querySelector<HTMLSpanElement>('.isocontainers-rps')!.textContent = sim.rps.toFixed(1)
    const share = sim.eps / Math.max(1e-6, sim.rps + sim.eps)
    const $errors = $bar.querySelector<HTMLSpanElement>('.isocontainers-errors')!
    $errors.textContent =
      sim.rps + sim.eps < 0.01 ? '–' : `${(share * 100).toFixed(share < 0.1 ? 1 : 0)}%`
    $errors.style.color = share > 0.05 ? COLORS.red : share > 0.005 ? COLORS.amber : COLORS.text

    const r = this.rating()
    $bar.querySelector<HTMLDivElement>('.isocontainers-status-rating')!.innerHTML =
      `${stars(r.stars, 13)}<span style="font:600 13px ${FONT.ui};color:${COLORS.text}">${r.score}</span>`

    $bar.querySelectorAll<HTMLButtonElement>('.isocontainers-switch').forEach(($b) => {
      const name = $b.dataset.switch as SwitchName
      const { label, color } = SWITCHES[name]
      const on = this.world.scene[name]
      $b.textContent = `${label} ${on ? 'ON' : 'OFF'}`
      $b.style.color = on ? color : COLORS.muted
      $b.style.background = on ? hexAlpha(color, 0.1) : 'rgba(255,255,255,0.04)'
      $b.style.border = `1px solid ${on ? hexAlpha(color, 0.45) : 'rgba(255,255,255,0.12)'}`
    })
  }

  private loadSwitch(name: SwitchName): boolean {
    try {
      return localStorage.getItem(SWITCHES[name].storage) !== 'off'
    } catch {
      return true
    }
  }

  /** Turn a switch of the status bar on or off; the choice is kept in this browser */
  private toggleSwitch(name: SwitchName) {
    const scene = this.world.scene
    scene[name] = !scene[name]
    try {
      localStorage.setItem(SWITCHES[name].storage, scene[name] ? 'on' : 'off')
    } catch {
      // private mode: the choice lasts until the page reloads
    }
    this.updateStatus()
  }

  // ---- the advisor ----

  private refreshAdvice() {
    this.advice = advise(this.world.model)
    const map = this.world.scene.advice
    map.clear()
    const order = { risk: 0, warn: 1, tip: 2 } as const
    for (const a of this.advice) {
      if (this.accepted.has(a.id)) continue
      const entry = map.get(a.target)
      if (!entry) map.set(a.target, { count: 1, severity: a.severity })
      else {
        entry.count++
        if (order[a.severity] < order[entry.severity]) entry.severity = a.severity
      }
    }
    this.updateRating()
  }

  private rating(env?: Container['env']): Rating {
    const { model } = this.world
    const advice = env ? this.advice.filter((a) => a.target.env === env) : this.advice
    return rate(advice, env ? env.containers.length : model.containers.length, this.accepted)
  }

  private toggleAdvisor() {
    this.advisorOpen = !this.advisorOpen
    this.world.scene.allAdvice = this.advisorOpen
    if (this.advisorOpen) this.select(undefined)
    else this.updatePane()
    this.renderInfo()
  }

  /** Try a fix: the view changes, the advice goes, the points rise from the building */
  private fix(a: Advice) {
    const before = this.rating(a.target.env).stars
    if (!applyFix(a, this.world.model)) return
    const t = a.target
    const [col, row, z] =
      t.type === 'container'
        ? [t.col + t.w / 2, t.row + t.d / 2, t.height]
        : [t.col, t.row, t.height]
    this.world.scene.popups.push({
      col,
      row,
      z,
      text: `+${POINTS[a.severity]}`,
      color: COLORS.green,
      born: this.world.scene.time,
    })
    this.refreshAdvice()
    const after = this.rating(a.target.env)
    if (!this.advice.length) this.toast('ALL ADVISORS HAPPY · EVERY QUEST DONE')
    else if (after.stars === 5 && before < 5)
      this.toast(`${a.target.env.name.toUpperCase()} REACHED FIVE STARS`)
    else if (after.stars > before)
      this.toast(`${a.target.env.name.toUpperCase()} · ${after.stars} STARS`)
    this.renderInfo()
  }

  private accept(a: Advice) {
    if (this.accepted.has(a.id)) this.accepted.delete(a.id)
    else this.accepted.add(a.id)
    saveAccepted(this.accepted)
    this.refreshAdvice()
    this.renderInfo()
  }

  /** A short message under the status bar: a reward (amber, with a star) or a problem */
  private toast(text: string, { color = COLORS.amber, seconds = 2.6 } = {}) {
    const $t = this.$toast
    if (!$t) return
    $t.textContent = color === COLORS.amber ? `★ ${text}` : `! ${text}`
    $t.style.color = color
    $t.style.opacity = '1'
    clearTimeout(Number($t.dataset.timer))
    $t.dataset.timer = String(setTimeout(() => ($t.style.opacity = '0'), seconds * 1000))
  }

  private updateRating() {
    this.updateStatus()
    const $r = this.$explorer?.querySelector<HTMLDivElement>('.isocontainers-rating')
    if (!$r) return
    const r = this.rating()
    $r.innerHTML =
      `${stars(r.stars, 15)}<span style="font:600 15px ${FONT.ui};color:${COLORS.text};margin-left:8px">${r.score}</span>` +
      `<span style="margin-left:auto;font:600 10px ${FONT.mono};letter-spacing:1px;color:${r.open ? COLORS.amber : COLORS.green}">` +
      `${r.open ? `${r.open} QUEST${r.open > 1 ? 'S' : ''}` : 'ALL DONE'} ›</span>`
  }

  private severityChip(a: Advice) {
    const color = SEVERITY_COLORS[a.severity]
    return (
      `<span style="flex:none;padding:0 6px;border-radius:4px;font:700 9px/16px ${FONT.mono};letter-spacing:1px;` +
      `color:${color};background:${color}1c;border:1px solid ${color}55">${SEVERITY_LABELS[a.severity].toUpperCase()}</span>`
    )
  }

  /** The advisor: the rating of each host and the open quests, the worst first */
  private advisorInfo(): string {
    const { model } = this.world
    const r = this.rating()
    const fixed = [...this.initialAdvice].filter(
      (id) => !this.advice.some((a) => a.id === id),
    ).length
    const accepted = this.advice.filter((a) => this.accepted.has(a.id)).length
    let html =
      `<div style="${MONO_LABEL}">Advisor · quests</div>` +
      `<div style="display:flex;align-items:center;gap:10px;margin-top:6px">${stars(r.stars, 20)}` +
      `<span style="font:600 22px ${FONT.ui}">${r.score}</span></div>` +
      `<div style="color:${COLORS.muted};margin-top:4px">${fixed} fixed · ${accepted} accepted · ${r.open} open</div>`
    if (model.environments.length > 1)
      html +=
        this.section('Hosts') +
        model.environments
          .map((env) => {
            const er = this.rating(env)
            return (
              `<div style="display:flex;align-items:center;padding:3px 0"><span>${escapeHtml(env.name)}</span>` +
              `<span style="margin-left:auto">${stars(er.stars, 11)}</span>` +
              `<span style="width:30px;text-align:right;font:600 11px ${FONT.mono};color:${COLORS.muted}">${er.score}</span></div>`
            )
          })
          .join('')
    const open = this.advice.filter((a) => !this.accepted.has(a.id))
    html += this.section(`Quests (${open.length})`)
    if (!open.length)
      html += `<div style="margin-top:8px;color:${COLORS.green}">Nothing left to do. The city is in order.</div>`
    html += open
      .map(
        (a) =>
          `<div class="isocontainers-link" data-key="${escapeHtml(a.target.key)}" style="display:flex;gap:8px;align-items:flex-start;padding:6px 0;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.04)">` +
          `${this.severityChip(a)}<div style="min-width:0;flex:1"><div style="color:${COLORS.text}">${escapeHtml(a.title)}</div>` +
          `<div style="color:${COLORS.faint};font:500 10.5px ${FONT.mono};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">` +
          `${escapeHtml(model.environments.length > 1 ? `${a.target.env.name} / ${a.target.name}` : a.target.name)}</div></div>` +
          `<span style="font:600 10px ${FONT.mono};color:${COLORS.muted}">+${POINTS[a.severity]}</span></div>`,
      )
      .join('')
    html += `<div style="margin-top:12px;color:${COLORS.faint};font-size:11px">A to close · click a quest to see the fix</div>`
    return html
  }

  /** The advice for one container or volume, with its fix */
  /** 'ADVISOR' with the number of open advice, in the color of the worst */
  private advisorTabLabel(c: Container) {
    const open = this.advice.filter((a) => a.target === c && !this.accepted.has(a.id))
    if (!open.length) return 'ADVISOR'
    const worst = (['risk', 'warn', 'tip'] as const).find((s) =>
      open.some((a) => a.severity === s),
    )!
    return `ADVISOR<span style="margin-left:7px;padding:0 6px;border-radius:8px;font-size:9.5px;letter-spacing:0;color:${COLORS.bg0};background:${SEVERITY_COLORS[worst]}">${open.length}</span>`
  }

  private adviceSection(target: Container | Volume): string {
    const list = this.advice.filter((a) => a.target === target)
    if (!list.length)
      return (
        this.section('Advisor') +
        `<div style="margin-top:6px;color:${COLORS.green}">${this.dot(COLORS.green, 6)}Nothing to improve here.</div>`
      )
    const button = (a: Advice, action: string, label: string) =>
      `<button class="isocontainers-advice" data-id="${escapeHtml(a.id)}" data-action="${action}" style="padding:3px 10px;border-radius:6px;cursor:pointer;` +
      `font:600 10px ${FONT.mono};letter-spacing:1px;color:${action === 'fix' ? COLORS.green : COLORS.text};` +
      `background:${action === 'fix' ? 'rgba(62,224,127,0.1)' : 'rgba(255,255,255,0.06)'};` +
      `border:1px solid ${action === 'fix' ? 'rgba(62,224,127,0.45)' : 'rgba(255,255,255,0.14)'}">${label}</button>`
    const items = list
      .map((a) => {
        const accepted = this.accepted.has(a.id)
        return (
          `<div style="margin-top:10px;padding:10px;border-radius:8px;background:rgba(255,255,255,0.025);` +
          `border:1px solid rgba(255,255,255,0.06);${accepted ? 'opacity:0.55' : ''}">` +
          `<div style="display:flex;gap:8px;align-items:flex-start">${this.severityChip(a)}` +
          `<div style="font-weight:600;color:${COLORS.text}">${escapeHtml(a.title)}${accepted ? ' (accepted)' : ''}</div></div>` +
          `<div style="margin-top:6px;color:#c5cfcc">${escapeHtml(a.detail)}</div>` +
          `<pre style="margin:8px 0 0;padding:8px 10px;border-radius:6px;background:rgba(0,0,0,0.3);font:11px/1.5 ${FONT.mono};` +
          `color:#b9c6c2;white-space:pre-wrap;word-break:break-word">${escapeHtml(a.fix)}</pre>` +
          `<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">` +
          (a.fixable ? button(a, 'fix', `TRY FIX +${POINTS[a.severity]}`) : '') +
          button(a, 'accept', accepted ? 'UNDO ACCEPT' : 'ACCEPT') +
          button(a, 'copy', 'COPY') +
          '</div></div>'
        )
      })
      .join('')
    return (
      `<div style="display:flex;align-items:baseline;margin-top:14px"><div style="${MONO_LABEL}">Advisor (${list.length})</div>` +
      `<div class="isocontainers-advisor-open" style="margin-left:auto;color:${COLORS.muted};font-size:11px;cursor:pointer">all quests ›</div></div>` +
      items +
      `<div style="margin-top:8px;color:${COLORS.faint};font-size:11px">A fix you try changes this view only: put the snippet in your compose file.</div>`
    )
  }

  // ---- building styles ----

  private styleRules(): StyleRule[] {
    return [
      ...(this.world.model.spec.styles ?? []),
      ...(this.options.styleRules ?? []),
      ...this.localRules,
    ]
  }

  /** The rule target of a container, for a scope */
  private styleTarget(c: Container, scope: StyleScope): Pick<StyleRule, 'image' | 'kind' | 'name'> {
    if (scope === 'name') return { name: c.name }
    if (scope === 'kind') return { kind: c.kind }
    return { image: imageRepository(c.image) }
  }

  private setLook(c: Container, options: StyleOptions) {
    this.localRules = upsertRule(this.localRules, this.styleTarget(c, this.styleScope), options)
    this.restyle()
  }

  private resetLook(c: Container) {
    this.localRules = removeRule(this.localRules, this.styleTarget(c, this.styleScope))
    this.restyle()
  }

  private restyle() {
    saveLocalRules(this.localRules)
    applyLooks(this.world.model, this.styleRules())
    this.renderInfo()
  }

  /** The building settings of a container: a separate view of the info pane */
  private buildingSettings(c: Container): string {
    const look = c.look
    const button = (option: string, value: string, label: string, active: boolean, title = '') =>
      `<button class="isocontainers-style" data-option="${option}" data-value="${escapeHtml(value)}" title="${escapeHtml(title)}" ` +
      `style="padding:3px 8px;border-radius:6px;cursor:pointer;font:600 10px ${FONT.mono};letter-spacing:0.5px;` +
      `color:${active ? COLORS.text : COLORS.muted};background:${active ? 'rgba(62,224,127,0.14)' : 'rgba(255,255,255,0.04)'};` +
      `border:1px solid ${active ? 'rgba(62,224,127,0.55)' : 'rgba(255,255,255,0.1)'}">${escapeHtml(label)}</button>`
    const row = (label: string, content: string) =>
      `<div style="display:flex;gap:8px;align-items:flex-start;margin-top:9px">` +
      `<div style="width:46px;flex:none;padding-top:3px;color:${COLORS.muted};font-size:11.5px">${label}</div>` +
      `<div style="display:flex;flex-wrap:wrap;gap:4px;min-width:0">${content}</div></div>`
    // the styles as tiles, each with a small drawing of this container in that style
    const tiles = Object.entries(STYLES)
      .map(([id, d]) => {
        const active = look.style === id
        return (
          `<button class="isocontainers-style" data-option="style" data-value="${id}" title="${escapeHtml(d.description)}" ` +
          `style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 2px 5px;border-radius:8px;cursor:pointer;` +
          `background:${active ? 'rgba(62,224,127,0.1)' : 'rgba(255,255,255,0.025)'};` +
          `border:1px solid ${active ? 'rgba(62,224,127,0.6)' : 'rgba(255,255,255,0.07)'}">` +
          `<canvas class="isocontainers-preview" data-style="${id}" style="position:static;display:block;width:86px;height:64px"></canvas>` +
          `<span style="font:600 9.5px ${FONT.mono};letter-spacing:0.5px;color:${active ? COLORS.text : COLORS.muted}">${escapeHtml(d.label.toUpperCase())}</span></button>`
        )
      })
      .join('')
    const roofs = Object.entries(ROOFS)
      .map(([id, label]) => button('roof', id, label, look.roof === id))
      .join('')
    const swatch = (color: string) =>
      `<button class="isocontainers-style" data-option="accent" data-value="${color}" title="${color || 'no accent'}" ` +
      `style="width:18px;height:18px;border-radius:50%;cursor:pointer;padding:0;` +
      `background:${color || 'transparent'};border:2px solid ${look.accent === color || (!color && !look.accent) ? COLORS.text : 'rgba(255,255,255,0.15)'}">` +
      `${color ? '' : `<span style="color:${COLORS.muted};font-size:10px;line-height:14px">×</span>`}</button>`
    const accents = ['', ...STYLE_ACCENTS].map(swatch).join('')
    const factor = Math.round((look.scale / STYLES[look.style].scale) * 100) / 100
    const height =
      button('scale', '-', '−', false) +
      `<span style="padding:3px 6px;font:600 11px ${FONT.mono};color:${COLORS.text}">${factor.toFixed(2)}×</span>` +
      button('scale', '+', '+', false)
    const sign =
      `<input class="isocontainers-badge" maxlength="4" value="${escapeHtml(look.badge ?? '')}" placeholder="none" ` +
      `style="width:64px;padding:3px 8px;border-radius:6px;font:600 11px ${FONT.mono};color:${COLORS.text};` +
      `background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);outline:none;text-transform:uppercase">`
    const scopes: Array<[StyleScope, string]> = [
      ['image', `all ${imageRepository(c.image).split('/').pop()}`],
      ['name', 'only this one'],
      ['kind', `all ${KIND_LABELS[c.kind].toLowerCase()}s`],
    ]
    const scope = scopes
      .map(([id, label]) => button('scope', id, label, this.styleScope === id))
      .join('')
    const action = (name: string, label: string) =>
      `<button class="isocontainers-style" data-option="${name}" data-value="" style="padding:3px 10px;border-radius:6px;cursor:pointer;` +
      `font:600 10px ${FONT.mono};letter-spacing:1px;color:${COLORS.text};background:rgba(255,255,255,0.06);` +
      `border:1px solid rgba(255,255,255,0.14)">${label}</button>`
    const source =
      look.source === 'kind'
        ? `default for ${KIND_LABELS[c.kind].toLowerCase()}s`
        : look.source === 'image'
          ? `default for ${imageRepository(c.image).split('/').pop()} images`
          : look.source === 'labels'
            ? 'from its labels (they win over rules)'
            : `from ${look.source}`
    return (
      `<div class="isocontainers-back" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;color:${COLORS.muted};font-size:12px">` +
      `‹ <span style="color:${COLORS.text}">${escapeHtml(c.name)}</span></div>` +
      `<div style="display:flex;align-items:center;gap:8px;margin-top:10px">${GEAR.replace('width="15" height="15"', 'width="17" height="17"')}` +
      `<div style="font:600 17px ${FONT.ui}">Building</div></div>` +
      `<div style="color:${COLORS.muted};margin-top:2px">${escapeHtml(STYLES[look.style].description)} · ${escapeHtml(source)}</div>` +
      row('For', scope) +
      `<div style="${MONO_LABEL};margin-top:14px">Style</div>` +
      `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:6px">${tiles}</div>` +
      `<div style="${MONO_LABEL};margin-top:14px">Details</div>` +
      row('Roof', roofs) +
      row('Accent', accents) +
      row('Height', height) +
      row('Sign', sign) +
      `<div style="display:flex;gap:6px;margin-top:14px">${action('reset', 'RESET')}${action('labels', 'COPY LABELS')}${action('rules', 'COPY RULES')}</div>` +
      `<div style="margin-top:12px;color:${COLORS.faint};font-size:11px">Changes apply to ${escapeHtml(scopes.find(([id]) => id === this.styleScope)![1])} and are kept in this browser · esc to go back</div>`
    )
  }

  /** Draw each style's tile: this container, in its state, in that style */
  private drawPreviews($info: HTMLDivElement, c: Container) {
    const P = this.world.scene.projection
    const ratio = Math.min(2, window.devicePixelRatio || 1)
    const scene: ContainersScene = {
      ...this.world.scene,
      view: { x0: -1e6, y0: -1e6, x1: 1e6, y1: 1e6 },
      hovered: undefined,
      selected: undefined,
      focus: undefined,
      zoom: 1,
    }
    $info.querySelectorAll<HTMLCanvasElement>('.isocontainers-preview').forEach(($canvas) => {
      const style = $canvas.dataset.style as Container['look']['style']
      const definition = STYLES[style]
      const scale = definition.scale * (c.look.scale / STYLES[c.look.style].scale)
      const model: Container = {
        ...c,
        col: 0,
        row: 0,
        // one tower shows the style best
        replicas: 1,
        look: { ...c.look, style, roof: definition.roof, scale },
        height: Math.round(c.baseHeight * scale),
        sparks: [],
      }
      const [w, h] = [86, 64]
      $canvas.width = w * ratio
      $canvas.height = h * ratio
      const ctx = $canvas.getContext('2d')
      if (!ctx) return
      // the box around the building and what may stand on its roof
      const corners = [
        P.at(0, 0, model.height + 46),
        P.at(model.w, 0, model.height),
        P.at(0, model.d, 0),
        P.at(model.w, model.d, 0),
      ]
      const xs = corners.map((p) => p[0])
      const ys = corners.map((p) => p[1])
      const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
      const k = Math.min((w - 6) / (x1 - x0), (h - 4) / (y1 - y0))
      ctx.scale(ratio, ratio)
      ctx.translate(w / 2 - ((x0 + x1) / 2) * k, h / 2 - ((y0 + y1) / 2) * k)
      ctx.scale(k, k)
      new IsoContainerBuildingComponent({ container: model, scene }).draw(ctx)
    })
  }

  private bindStyleEditor($info: HTMLDivElement, c: Container) {
    const $back = $info.querySelector<HTMLDivElement>('.isocontainers-back')
    if ($back) $back.onclick = () => this.showPane('info')
    $info.querySelectorAll<HTMLButtonElement>('.isocontainers-style').forEach(($b) => {
      $b.onclick = () => {
        const { option, value = '' } = $b.dataset
        if (option === 'style') this.setLook(c, { style: value as Container['look']['style'] })
        else if (option === 'roof') this.setLook(c, { roof: value as Container['look']['roof'] })
        else if (option === 'accent') this.setLook(c, { accent: value })
        else if (option === 'scale') {
          const factor = c.look.scale / STYLES[c.look.style].scale
          const next = Math.round((factor + (value === '+' ? 0.25 : -0.25)) * 4) / 4
          this.setLook(c, { scale: Math.max(SCALE_RANGE[0], Math.min(SCALE_RANGE[1], next)) })
        } else if (option === 'scope') {
          this.styleScope = value as StyleScope
          this.renderInfo()
        } else if (option === 'reset') this.resetLook(c)
        else if (option === 'labels') this.copy($b, lookToLabels(c.look))
        else if (option === 'rules') this.copy($b, JSON.stringify(this.localRules, null, 2))
      }
    })
    const $badge = $info.querySelector<HTMLInputElement>('.isocontainers-badge')
    if ($badge)
      $badge.onchange = () => this.setLook(c, { badge: $badge.value.trim().toUpperCase() })
  }

  /** Copy text, and say so on the button */
  private copy($button: HTMLButtonElement, text: string) {
    const label = $button.textContent
    const done = (ok: boolean) => {
      $button.textContent = ok ? 'COPIED' : 'NO CLIPBOARD'
      setTimeout(() => ($button.textContent = label), 1200)
    }
    navigator.clipboard?.writeText(text).then(
      () => done(true),
      () => done(false),
    ) ?? done(false)
  }

  /** Tabs under a pane's header; a click sets the pane's tab (see renderInfo) */
  private tabBar(active: string, tabs: Array<[id: string, label: string]>) {
    return (
      `<div style="display:flex;margin-top:14px;border-bottom:1px solid rgba(255,255,255,0.08)">` +
      tabs
        .map(([id, label]) => {
          const on = id === active
          return (
            `<button class="isocontainers-tab" data-tab="${id}" style="flex:1;padding:7px 0 6px;cursor:pointer;` +
            `display:flex;align-items:center;justify-content:center;` +
            `background:none;border:none;border-bottom:2px solid ${on ? COLORS.green : 'transparent'};` +
            `font:600 10.5px ${FONT.mono};letter-spacing:1.5px;color:${on ? COLORS.text : COLORS.muted};` +
            `transition:color 0.2s ease,border-color 0.2s ease">${label}</button>`
          )
        })
        .join('') +
      '</div>'
    )
  }

  /** A host: its container engine on one tab, its networking on the other */
  private hostInfo(env: Environment): string {
    const engine = env.engine
    const running = env.containers.filter((c) => c.state === 'running').length
    const total = env.containers.length
    const failing = env.containers.some((c) => INCIDENT_MOODS.has(moodOf(c)))
    const product = [engine?.engine ?? 'docker', engine?.version].filter(Boolean).join(' ')
    let html =
      `<div style="${MONO_LABEL}">Container host</div>` +
      `<div style="font:600 19px/1.3 ${FONT.ui};margin-top:4px;word-break:break-word">${escapeHtml(env.name)}</div>` +
      `<div style="display:flex;align-items:center;gap:8px">` +
      this.chip(`${running}/${total} RUNNING`, failing ? COLORS.amber : COLORS.green, !failing) +
      `<span style="margin:8px 0 0 auto;font:500 10.5px ${FONT.mono};color:${COLORS.faint}">${escapeHtml(product.toUpperCase())}</span></div>` +
      this.tabBar(this.hostTab, [
        ['engine', 'ENGINE'],
        ['network', 'NETWORK'],
      ])
    html += this.hostTab === 'engine' ? this.hostEngine(env) : this.hostNetwork(env)
    html += `<div style="margin-top:14px;color:${COLORS.faint};font-size:11px">esc to close · click a name to jump</div>`
    return html
  }

  private hostEngine(env: Environment): string {
    const e = env.engine
    const rows = (list: Array<[string, string | number | undefined]>) =>
      list.filter((r): r is [string, string | number] => r[1] !== undefined && r[1] !== '')
    let html = ''
    if (e) {
      const engine = rows([
        ['Engine', [e.engine, e.version].filter(Boolean).join(' ')],
        ['Address', e.address],
        ['Hostname', e.hostname],
        ['OS', e.os],
        ['Kernel', e.kernel],
        ['Architecture', e.arch],
        ['CPUs', e.cpus],
        ['Memory', e.memory],
      ]).map(([k, v]): [string, string] => [k, String(v)])
      const runtime = rows([
        ['Runtime', e.runtime],
        ['Storage', e.storageDriver],
        ['Logging', e.loggingDriver],
        ['Cgroup', e.cgroup],
        ['Root dir', e.rootDir],
        ['Swarm', e.swarm],
      ]).map(([k, v]): [string, string] => [k, String(v)])
      html += this.facts(engine)
      if (runtime.length) html += this.section('Runtime') + this.facts(runtime)
    } else {
      html +=
        `<div style="margin-top:12px;color:#c5cfcc">No engine details: this host comes from a file or a sample, ` +
        `not from its engine's API.</div>` +
        (env.caption ? this.facts([['Caption', env.caption]]) : '')
    }

    // what runs on it, grouped like the status bar's meter
    const moods = env.containers.map(moodOf)
    const groups = HEALTH_GROUPS.map((g) => ({
      ...g,
      count: moods.filter((m) => g.moods.includes(m)).length,
    })).filter((g) => g.count)
    const total = env.containers.length
    html += this.section(`Containers (${total})`)
    if (total)
      html +=
        `<div style="display:flex;gap:2px;height:6px;margin-top:8px;border-radius:3px;overflow:hidden">` +
        groups
          .map(
            (g) =>
              `<div style="flex:${g.count};background:${g.color}" title="${g.count} ${g.label}"></div>`,
          )
          .join('') +
        `</div>` +
        `<div style="display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:7px">` +
        groups
          .map(
            (g) =>
              `<span style="display:inline-flex;align-items:center;font:500 10.5px ${FONT.mono};color:${COLORS.muted}">` +
              `${this.dot(g.color, 6)}${g.count} ${g.label}</span>`,
          )
          .join('') +
        `</div>`
    const cpu = env.containers.reduce((n, c) => n + c.cpu, 0)
    const mem = env.containers.reduce((n, c) => n + c.mem, 0)
    const workload: Array<[string, string]> = []
    if (e?.images !== undefined) workload.push(['Images', String(e.images)])
    workload.push(
      ['Volumes', String(env.volumes.length)],
      ['Networks', String(env.networks.length)],
      ['CPU', `${cpu.toFixed(1)} %${e?.cpus ? ` of ${e.cpus * 100} %` : ''}`],
      [
        'Memory',
        `${mem >= 1024 ? `${(mem / 1024).toFixed(1)} GiB` : `${Math.round(mem)} MiB`}${e?.memory ? ` of ${e.memory}` : ''}`,
      ],
    )
    html += this.facts(workload)
    html += `<div style="margin-top:4px;color:${COLORS.faint};font-size:11px">CPU and memory are simulated</div>`

    if (e?.warnings?.length)
      html +=
        this.section(`Warnings (${e.warnings.length})`) +
        e.warnings
          .map(
            (w) =>
              `<div style="display:flex;margin-top:6px;color:#e8d3a6;font-size:12px">${this.dot(COLORS.amber, 6)}` +
              `<span>${escapeHtml(w)}</span></div>`,
          )
          .join('')
    return html
  }

  private hostNetwork(env: Environment): string {
    const e = env.engine
    let html = ''
    const host: Array<[string, string]> = []
    if (e?.address) host.push(['Address', e.address])
    if (e?.ipForwarding !== undefined) host.push(['IPv4 forward', e.ipForwarding ? 'on' : 'off'])
    if (e?.firewall) host.push(['Firewall', e.firewall])
    if (e?.httpProxy) host.push(['HTTP proxy', e.httpProxy])
    if (e?.httpsProxy) host.push(['HTTPS proxy', e.httpsProxy])
    if (e?.noProxy) host.push(['No proxy', e.noProxy])
    if (host.length) html += this.facts(host)

    // what the outside world reaches, through the host gate
    const published = env.containers
      .flatMap((c) => c.ports.filter(isPublished).map((p) => ({ c, p })))
      .sort((a, b) => a.p.hostPort! - b.p.hostPort!)
    html += this.section(`Published ports (${published.length})`)
    html += published.length
      ? published
          .map(({ c, p }) =>
            this.link(
              c,
              c.name,
              `${p.hostIp ?? (p.local ? '127.0.0.1' : '0.0.0.0')}:${p.hostPort} → ${p.port}/${p.proto}`,
            ),
          )
          .join('')
      : `<div style="margin-top:6px;color:${COLORS.muted}">Nothing is published: no container is reachable from outside.</div>`

    // the streets first, the busiest on top; then host, none and the empty ones
    const networks = [...env.networks].sort(
      (a, b) =>
        Number(b.street) - Number(a.street) ||
        b.members.length - a.members.length ||
        a.name.localeCompare(b.name),
    )
    html += this.section(`Networks (${networks.length})`)
    for (const n of networks) {
      const tags = [
        n.internal && 'INTERNAL',
        n.ipv6 && 'IPV6',
        n.attachable && 'ATTACHABLE',
        n.scope && n.scope !== 'local' && n.scope.toUpperCase(),
      ].filter(Boolean)
      const details = [n.subnet, n.gateway && `gw ${n.gateway}`].filter(Boolean)
      if (!details.length) details.push('no subnet')
      const members = n.members.map((c) => c.name).join(', ')
      html +=
        `<div ${n.street ? `class="isocontainers-link" data-key="${escapeHtml(n.key)}"` : ''} ` +
        `title="${escapeHtml(members || 'no containers')}" ` +
        `style="margin-top:6px;padding:7px 10px;border-radius:8px;background:rgba(255,255,255,0.03);` +
        `border:1px solid rgba(255,255,255,0.06);${n.street ? 'cursor:pointer;' : 'opacity:0.7;'}min-width:0">` +
        `<div style="display:flex;align-items:center;min-width:0">${this.square(n.street ? n.accent : COLORS.faint)}` +
        `<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#cfe9db">${escapeHtml(n.name)}</span>` +
        `<span style="margin-left:auto;padding-left:8px;font:500 10px ${FONT.mono};color:${COLORS.faint};text-transform:uppercase" title="${n.members.length} containers">${escapeHtml(n.driver)} · ${n.members.length}</span></div>` +
        `<div style="margin-top:3px;font:500 10.5px ${FONT.mono};color:${COLORS.muted};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">` +
        `${escapeHtml(details.join(' · '))}${tags.length ? ` · <span style="color:${COLORS.amber}">${tags.join(' · ')}</span>` : ''}</div></div>`
    }
    return html
  }

  private networkInfo(n: Network): string {
    const rows: Array<[string, string]> = [
      ['Driver', n.driver],
      ['Host', n.env.name],
    ]
    if (n.subnet) rows.push(['Subnet', n.subnet])
    if (n.gateway) rows.push(['Gateway', n.gateway])
    rows.push(['Internal', n.internal ? 'yes, no route out' : 'no'])
    rows.push(['Packets', String(n.packets)])
    let html =
      `<div style="${MONO_LABEL}">Network · street</div>` +
      `<div style="font:600 19px/1.3 ${FONT.ui};margin-top:4px;word-break:break-word">${escapeHtml(n.name)}</div>` +
      this.chip(n.internal ? 'INTERNAL' : n.driver.toUpperCase(), n.accent, false) +
      this.facts(rows)
    if (n.note) html += `<div style="margin-top:10px;color:#c5cfcc">${escapeHtml(n.note)}</div>`
    html +=
      this.section(`Containers (${n.members.length})`) +
      n.members
        .map((c) => this.link(c, c.name, c.attachments.find((a) => a.network === n)?.ip ?? ''))
        .join('')
    return html
  }

  private volumeInfo(v: Volume): string {
    const rows: Array<[string, string]> = [
      ['Driver', v.driver],
      ['Host', v.env.name],
    ]
    rows.push(['Size', v.size ? `${v.size} · ${TANK_STYLES[v.sizeClass].label} class` : 'unknown'])
    if (v.mountpoint) rows.push(['Mountpoint', v.mountpoint])
    rows.push(['Writes', String(v.writes)], ['Reads', String(v.reads)])
    let html =
      `<div style="${MONO_LABEL}">Volume · tank</div>` +
      `<div style="font:600 19px/1.3 ${FONT.ui};margin-top:4px;word-break:break-all">${escapeHtml(v.name)}</div>` +
      this.chip(
        v.mounts.length ? `${v.mounts.length} MOUNT${v.mounts.length > 1 ? 'S' : ''}` : 'UNUSED',
        TANK_STYLES[v.sizeClass].color,
        false,
      ) +
      this.facts(rows)
    if (v.anonymous)
      html += `<div style="margin-top:10px;color:#c5cfcc">An anonymous volume, named by docker.</div>`
    if (v.note) html += `<div style="margin-top:10px;color:#c5cfcc">${escapeHtml(v.note)}</div>`
    if (v.mounts.length)
      html +=
        this.section(`Mounted by (${v.mounts.length})`) +
        v.mounts
          .map((m) =>
            this.link(m.container, m.container.name, `${m.target}${m.readOnly ? ' ro' : ''}`),
          )
          .join('')
    if (this.advice.some((a) => a.target === v)) html += this.adviceSection(v)
    return html
  }

  private updateHud() {
    if (!this.$hud) return
    const sim = this.sim
    const { model } = this.world
    const label = (text: string, color: string = COLORS.muted) =>
      `<span style="font:600 10.5px ${FONT.mono};letter-spacing:1.5px;color:${color}">${text}</span>`
    const up = model.containers.filter((c) => c.state === 'running').length
    const down = model.containers.length - up
    const status =
      `${this.dot(COLORS.green, 7, true)}${label(`${up} UP`, COLORS.green)}` +
      (down ? ` &nbsp;${label(`${down} DOWN`, COLORS.red)}` : '') +
      ` &nbsp;${label(`${sim.rps.toFixed(1)} REQ/S`)} &nbsp;${label(`${sim.totalRequests} REQUESTS`)}` +
      (sim.totalErrors ? ` &nbsp;${label(`${sim.totalErrors} FAILED`, COLORS.red)}` : '')
    const paused = sim.paused ? ` &nbsp;${label('PAUSED', COLORS.amber)}` : ''
    this.$hud.innerHTML =
      `<div style="display:flex;align-items:center;gap:16px;white-space:nowrap;overflow:hidden">` +
      `<div>${status}${paused} &nbsp;${label(`${sim.speed}×`)}</div>` +
      `<div style="margin-left:auto;color:${COLORS.faint};font-size:11.5px;overflow:hidden;text-overflow:ellipsis">` +
      `click a building, street or tank · drag to pan · wheel pan · ctrl+wheel zoom · 1-${this.options.samples.length} stacks · 0 live · ` +
      `A advisor · M flags · L host links · S stop/start · space pause · + / − speed · F fit · esc clear</div></div>`
  }
}
