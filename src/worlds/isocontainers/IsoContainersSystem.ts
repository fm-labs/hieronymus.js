import type { IGame, IGameSystem } from '../../../lib/game.types'
import { AbstractGameSystem } from '../../../lib'
import { LOT, TANK_HEIGHT, isPublished, neighborhood } from './isocontainers.layout.ts'
import { ContainersSimulation } from './isocontainers.sim.ts'
import {
  KIND_LABELS,
  type Container,
  type ContainersSpec,
  type Entity,
  type Network,
  type Volume,
} from './isocontainers.types.ts'
import { COLORS, FONT, PALETTE, stateColor, stateText } from './isocontainers.draw.ts'
import type { ContainersWorld } from './isocontainers.world.ts'

export type IsoContainersSystemOptions = {
  /** The stacks that can be opened from the explorer */
  samples: ContainersSpec[]
  /** The id of the open stack ('custom' for one loaded from a URL) */
  current: string
  /** Where a custom stack came from */
  source?: string
  /** Select and fly to a container (or network, volume) at the start */
  select?: string
}

const LEFT = 300
const RIGHT = 350
const TOP = 120
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
 * selection, the explorer on the left, the info pane on the right, the title and the HUD.
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
  private $title?: HTMLDivElement
  private previousBackground = ''
  private previousCursor = ''
  private drag?: { x: number; y: number; ox: number; oy: number; moved: boolean }
  private glide?: { x: number; y: number; zoom: number }
  private lastCamera = { x: NaN, y: NaN, zoom: NaN }
  private backgroundKey = ''
  private refresh = 0

  constructor(game: IGame, world: ContainersWorld, options: IsoContainersSystemOptions) {
    super(game)
    this.world = world
    this.options = options
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
    const $c = this._game.$container
    this.previousBackground = $c.style.background
    this.previousCursor = $c.style.cursor
    this.$title = document.createElement('div')
    this.$title.style.cssText =
      `position:fixed;top:26px;left:${LEFT}px;right:20px;z-index:9;text-align:center;pointer-events:none;` +
      `font:500 34px/1.2 ${FONT.ui};letter-spacing:-0.5px;transition:right 0.3s ease`
    $c.appendChild(this.$title)
    this.$explorer = this.createPanel(
      `left:10px;top:10px;bottom:${BOTTOM + 10}px;width:${LEFT - 20}px;display:flex;flex-direction:column;padding:0`,
    )
    this.$info = this.createPanel(
      `right:10px;top:10px;width:${RIGHT - 20}px;max-height:calc(100vh - ${BOTTOM + 30}px);overflow-y:auto;` +
        'transform:translateX(110%);transition:transform 0.3s ease',
    )
    this.$hud = this.createPanel(`left:10px;bottom:10px;right:10px;padding:9px 14px`)
    this.renderTitle()
    this.renderExplorer()
    this.fitView(true)
    this.updateView()
    this.updateBackground()
    this.updateHud()
    const first = this.options.select && this.find(this.options.select)
    if (first) this.select(first, true)
  }

  public stop() {
    this._game.eventbus.off('keyboard.keydown', this.handleKeyDown)
    this._game.eventbus.off('mouse.mousedown', this.handleMouseDown)
    this._game.eventbus.off('mouse.mouseup', this.handleMouseUp)
    window.removeEventListener('mousemove', this.handleMouseMove)
    const $c = this._game.$container
    $c.style.background = this.previousBackground
    $c.style.cursor = this.previousCursor
    this.$explorer?.remove()
    this.$info?.remove()
    this.$hud?.remove()
    this.$title?.remove()
  }

  public async tick(deltaTime: number) {
    // cap the step, so a long frame (e.g. a background tab) doesn't skip ahead
    const seconds = Math.min(deltaTime, 100) / 1000
    this.world.scene.time += seconds
    this.sim.step(seconds)
    this.stepGlide(seconds)
    this.updateView()
    this.updateBackground()
    this.refresh -= seconds
    if (this.refresh <= 0) {
      this.refresh = 0.3
      this.updateHud()
      this.updateExplorerStates()
      // live values, but not under the pointer: a rebuilt button would swallow the click
      if (this.world.scene.selected && !this.$info?.matches(':hover')) this.renderInfo()
    }
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
    const right = this.world.scene.selected ? RIGHT : 10
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
    } else this.glide = { x, y, zoom: z }
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

  /** Zoom out and center, so all plates fit between the panels */
  private fitView(now = false) {
    const P = this.world.scene.projection
    const xs: number[] = []
    const ys: number[] = []
    for (const e of this.world.model.environments) {
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
    const zoom = Math.min(1.4, (f.w * 0.94) / (x1 - x0), (f.h * 0.94) / (y1 - y0))
    this.glideTo((x0 + x1) / 2, (y0 + y1) / 2, zoom, now)
  }

  private focusOn(e: Entity) {
    const P = this.world.scene.projection
    const [x, y] =
      e.type === 'container'
        ? P.at(e.col + e.w / 2, e.row + e.d / 2, e.height / 2)
        : e.type === 'volume'
          ? P.at(e.col, e.row, TANK_HEIGHT / 2)
          : P.at((e.col0 + e.col1) / 2, e.row)
    const zoom =
      e.type === 'network'
        ? Math.max(0.6, this._game.camera.zoom)
        : Math.max(this._game.camera.zoom, 1.1)
    this.glideTo(x, y, Math.min(1.8, zoom))
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
      for (const z of [TANK_HEIGHT, 0]) {
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
      return
    }
    const thing = this.pick(e.clientX, e.clientY)
    this.world.scene.hovered = thing
    this._game.$container.style.cursor = thing ? 'pointer' : ''
  }

  private handleMouseUp(e: MouseEvent) {
    const drag = this.drag
    this.drag = undefined
    if (!drag) return
    this._game.$container.style.cursor = ''
    if (drag.moved) return
    const thing = this.pick(e.clientX, e.clientY)
    this.select(thing && thing !== this.world.scene.selected ? thing : undefined)
  }

  private handleKeyDown(e: KeyboardEvent) {
    if ((e.target as HTMLElement | null)?.closest?.('select, input, textarea')) return
    const index = Number(e.key)
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
    else if (e.key === 'Escape') this.select(undefined)
    else return
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
    params.set('stack', id)
    params.delete('graph')
    params.delete('select')
    window.location.search = params.toString()
  }

  private select(thing: Entity | undefined, fly = false) {
    const scene = this.world.scene
    scene.selected = thing
    scene.focus = thing ? neighborhood(thing, this.world.model) : undefined
    if (this.$info) this.$info.style.transform = thing ? 'translateX(0)' : 'translateX(110%)'
    if (this.$title) this.$title.style.right = thing ? `${RIGHT}px` : '20px'
    if (thing && fly) this.focusOn(thing)
    this.renderInfo()
    this.highlightExplorer()
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

  private renderTitle() {
    const { model } = this.world
    if (!this.$title) return
    this.$title.innerHTML =
      `<div style="color:${COLORS.text}">${escapeHtml(model.title)}</div>` +
      `<div style="color:#76827f">${escapeHtml(model.subtitle)}</div>`
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
      `<div class="isocontainers-tree" style="overflow-y:auto;padding:4px 8px 12px;flex:1"></div>`

    $panel.querySelectorAll<HTMLDivElement>('.isocontainers-stack').forEach(($row) => {
      $row.onclick = () => this.open($row.dataset.id!)
    })
    const $tree = $panel.querySelector<HTMLDivElement>('.isocontainers-tree')!
    for (const env of model.environments) {
      const $env = document.createElement('div')
      $env.style.cssText = `${MONO_LABEL};color:${COLORS.text};padding:10px 8px 4px`
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
          this.dot(PALETTE.volume, 6),
          v.anonymous ? `${v.name.slice(0, 12)}…` : v.name,
          'volume',
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
      e.type === 'container' ? stateColor(e) : e.type === 'network' ? e.accent : PALETTE.volume
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

  private renderInfo() {
    const $info = this.$info
    const e = this.world.scene.selected
    if (!$info || !e) return
    let html =
      e.type === 'container'
        ? this.containerInfo(e)
        : e.type === 'network'
          ? this.networkInfo(e)
          : this.volumeInfo(e)
    html += `<div style="margin-top:14px;color:${COLORS.faint};font-size:11px">esc to close · click a name to jump</div>`
    $info.innerHTML = html
    $info.querySelectorAll<HTMLDivElement>('.isocontainers-link').forEach(($link) => {
      $link.onclick = () => this.select(this.world.model.byKey.get($link.dataset.key!), true)
    })
    const $toggle = $info.querySelector<HTMLButtonElement>('.isocontainers-toggle')
    if ($toggle && e.type === 'container') $toggle.onclick = () => this.toggle(e)
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
      `<div style="${MONO_LABEL}">${escapeHtml(KIND_LABELS[c.kind])} · container</div>` +
      `<div style="font:600 19px/1.3 ${FONT.ui};margin-top:4px;word-break:break-word">${escapeHtml(c.name)}</div>` +
      `<div style="display:flex;align-items:center;gap:8px">${this.chip(stateText(c), color, c.state === 'running')}` +
      `<button class="isocontainers-toggle" style="margin:8px 0 0 auto;padding:3px 12px;border-radius:6px;cursor:pointer;` +
      `font:600 10.5px ${FONT.mono};letter-spacing:1px;color:${COLORS.text};background:rgba(255,255,255,0.06);` +
      `border:1px solid rgba(255,255,255,0.14)">${up ? 'STOP' : 'START'} · S</button></div>` +
      this.facts(rows)
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
    if (v.size) rows.push(['Size', v.size])
    if (v.mountpoint) rows.push(['Mountpoint', v.mountpoint])
    rows.push(['Writes', String(v.writes)], ['Reads', String(v.reads)])
    let html =
      `<div style="${MONO_LABEL}">Volume · tank</div>` +
      `<div style="font:600 19px/1.3 ${FONT.ui};margin-top:4px;word-break:break-all">${escapeHtml(v.name)}</div>` +
      this.chip(
        v.mounts.length ? `${v.mounts.length} MOUNT${v.mounts.length > 1 ? 'S' : ''}` : 'UNUSED',
        PALETTE.volume,
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
      `click a building, street or tank · drag to pan · wheel pan · ctrl+wheel zoom · 1-${this.options.samples.length} stacks · ` +
      `S stop/start · space pause · + / − speed · F fit · esc clear</div></div>`
  }
}
