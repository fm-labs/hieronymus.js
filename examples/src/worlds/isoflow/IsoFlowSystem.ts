import type { IGame, IGameSystem } from '@fmlabs/world'
import { AbstractGameSystem } from '@fmlabs/world'
import { lineage } from './isoflow.layout.ts'
import { FlowSimulation } from './isoflow.sim.ts'
import { KIND_LABELS, type FlowNode, type FlowSpec } from './isoflow.types.ts'
import { CARD_Z, COLORS, FONT, stateColor } from './isoflow.draw.ts'
import type { FlowWorld } from './isoflow.world.ts'

export type IsoFlowSystemOptions = {
  /** The workflows that can be opened from the explorer */
  samples: FlowSpec[]
  /** The id of the open workflow ('custom' for one loaded from a URL) */
  current: string
  /** Where a custom workflow came from */
  source?: string
  /** Select and fly to a node at the start */
  select?: string
  /** The name in the explorer */
  brand: string
}

const LEFT = 300
const RIGHT = 340
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
 * Runs the workflow world: the simulation, the camera (drag to pan, fly to a card), hover and
 * selection, the explorer on the left, the info pane on the right, the title and the HUD.
 * Keys: 1-9 open a workflow, space pause, R restart the run, + / − speed, F fit, Esc clear.
 */
export class IsoFlowSystem extends AbstractGameSystem implements IGameSystem {
  public name = 'IsoFlowSystem'

  private readonly world: FlowWorld
  private readonly options: IsoFlowSystemOptions
  private readonly sim: FlowSimulation
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

  constructor(game: IGame, world: FlowWorld, options: IsoFlowSystemOptions) {
    super(game)
    this.world = world
    this.options = options
    this.sim = new FlowSimulation(world.model)
    this.sim.changed = () => this.updateHud()
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
    const first = this.options.select && this.world.model.byId.get(this.options.select)
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
    // cap the step, so a long frame (e.g. a background tab) doesn't skip through the run
    const seconds = Math.min(deltaTime, 100) / 1000
    this.world.scene.time += seconds
    this.sim.step(seconds)
    this.stepGlide(seconds)
    this.updateView()
    this.updateBackground()
    this.refresh -= seconds
    if (this.refresh <= 0) {
      this.refresh = 0.25
      this.updateHud()
      this.updateExplorerStates()
      // live values, but not under the pointer: a rebuilt link would swallow the click
      if (this.world.scene.selected && !this.$info?.matches(':hover')) this.renderInfo()
    }
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

  /** Zoom out and center, so the whole graph fits between the panels */
  private fitView(now = false) {
    const { model } = this.world
    const xs: number[] = []
    const ys: number[] = []
    const add = (c: number, r: number, z: number) => {
      const [x, y] = this.world.scene.projection.at(c, r, z)
      xs.push(x)
      ys.push(y)
    }
    for (const n of model.nodes) {
      add(n.col, n.row - 0.6, CARD_Z)
      add(n.col + n.w, n.row, CARD_Z)
      add(n.col, n.row + n.h, CARD_Z)
      add(n.col + n.w + 0.4, n.row + n.h + 0.4, 0)
    }
    for (const g of model.groups) {
      add(g.col, g.row + g.rows, 0)
      add(g.col + g.cols, g.row, 0)
      add(g.col + g.cols, g.row + g.rows, 0)
    }
    if (!xs.length) return
    const [x0, x1] = [Math.min(...xs), Math.max(...xs)]
    const [y0, y1] = [Math.min(...ys), Math.max(...ys)]
    const f = this.freeArea()
    const zoom = Math.min(1.5, (f.w * 0.92) / (x1 - x0), (f.h * 0.92) / (y1 - y0))
    this.glideTo((x0 + x1) / 2, (y0 + y1) / 2, zoom, now)
  }

  private focus(node: FlowNode) {
    const [x, y] = this.world.scene.projection.at(
      node.col + node.w / 2,
      node.row + node.h / 2,
      CARD_Z,
    )
    this.glideTo(x, y, Math.min(1.6, Math.max(this._game.camera.zoom, 1.05)))
  }

  /** The dot grid moves and scales with the camera, so the floor feels attached to the graph */
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
    return !!(e.target as HTMLElement | null)?.closest?.('.isoflow-panel')
  }

  /** The card under a screen point: the front-most one wins */
  private pick(clientX: number, clientY: number): FlowNode | undefined {
    const rect = this._game.$container.getBoundingClientRect()
    const { offset, zoom } = this._game.camera
    const x = (clientX - rect.left + offset.x) / zoom
    // on the plane of the cards
    const y = (clientY - rect.top + offset.y) / zoom + CARD_Z * this.world.scene.projection.zScale
    const [col, row] = this.world.scene.projection.toGrid(x, y)
    let best: FlowNode | undefined
    for (const n of this.world.model.nodes) {
      const inside =
        col >= n.col - 0.1 &&
        col <= n.col + n.w + 0.1 &&
        row >= n.row - 0.45 &&
        row <= n.row + n.h + 0.1
      if (inside && (!best || n.col + n.row > best.col + best.row)) best = n
    }
    return best
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
      this.world.scene.hovered = undefined
      return
    }
    const node = this.pick(e.clientX, e.clientY)
    this.world.scene.hovered = node
    this._game.$container.style.cursor = node ? 'pointer' : ''
  }

  private handleMouseUp(e: MouseEvent) {
    const drag = this.drag
    this.drag = undefined
    if (!drag) return
    this._game.$container.style.cursor = ''
    if (drag.moved) return
    const node = this.pick(e.clientX, e.clientY)
    this.select(node && node !== this.world.scene.selected ? node : undefined)
  }

  private handleKeyDown(e: KeyboardEvent) {
    if ((e.target as HTMLElement | null)?.closest?.('select, input, textarea')) return
    const index = Number(e.key)
    if (index >= 1 && index <= this.options.samples.length)
      return this.open(this.options.samples[index - 1].id!)
    if (e.code === 'Space') {
      this.sim.paused = !this.sim.paused
      e.preventDefault()
    } else if (e.key === 'r' || e.key === 'R') this.sim.restart()
    else if (e.key === '+' || e.key === '=')
      this.speedIndex = Math.min(SPEEDS.length - 1, this.speedIndex + 1)
    else if (e.key === '-') this.speedIndex = Math.max(0, this.speedIndex - 1)
    else if (e.key === 'f' || e.key === 'F') this.fitView()
    else if (e.key === 'Escape') this.select(undefined)
    else return
    this.sim.speed = SPEEDS[this.speedIndex]
    this.updateHud()
  }

  private open(id: string) {
    if (id === this.options.current) return
    const params = new URLSearchParams(window.location.search)
    params.set('flow', id)
    params.delete('graph')
    params.delete('select')
    window.location.search = params.toString()
  }

  private select(node: FlowNode | undefined, fly = false) {
    const scene = this.world.scene
    scene.selected = node
    scene.lineage = node ? lineage(node) : undefined
    if (this.$info) this.$info.style.transform = node ? 'translateX(0)' : 'translateX(110%)'
    if (this.$title) this.$title.style.right = node ? `${RIGHT}px` : '20px'
    if (node && fly) this.focus(node)
    this.renderInfo()
    this.highlightExplorer()
  }

  // ---- panels ----

  private createPanel(position: string): HTMLDivElement {
    const $panel = document.createElement('div')
    // the panel class makes the system ignore clicks on it
    $panel.className = 'isoflow-panel'
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
      `${glow ? `box-shadow:0 0 8px ${color};` : ''}margin-right:8px;vertical-align:middle"></span>`
    )
  }

  private renderExplorer() {
    const $panel = this.$explorer
    if (!$panel) return
    const { model } = this.world
    const items = this.options.samples.map((s, i) => ({ id: s.id!, key: String(i + 1), spec: s }))
    if (this.options.current === 'custom') items.push({ id: 'custom', key: '·', spec: model.spec })
    const flows = items
      .map(({ id, key, spec }) => {
        const active = id === this.options.current
        return (
          `<div class="isoflow-flow" data-id="${id}" style="display:flex;gap:10px;padding:7px 10px;margin:2px 0;` +
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
      `<div style="${MONO_LABEL};color:${COLORS.text}">${this.dot(COLORS.green, 7, true)}${escapeHtml(this.options.brand)}</div>` +
      `<div style="color:${COLORS.muted};margin-top:4px">Workflows, DAGs and node-edge graphs</div></div>` +
      `<div style="padding:10px 8px 6px"><div style="${MONO_LABEL};padding:0 8px 4px">Workflows</div>${flows}</div>` +
      `<div style="display:flex;gap:6px;padding:10px 16px;border-top:1px solid rgba(255,255,255,0.06);border-bottom:1px solid rgba(255,255,255,0.06)">` +
      `${stat(model.nodes.length, 'nodes')}${stat(model.edges.length, 'edges')}${stat(model.depth, 'layers')}` +
      `${stat(model.mode === 'stream' ? 'live' : 'DAG', 'mode')}</div>` +
      `<div style="${MONO_LABEL};padding:10px 16px 2px">Nodes</div>` +
      `<div class="isoflow-nodes" style="overflow-y:auto;padding:2px 8px 12px;flex:1"></div>`

    $panel.querySelectorAll<HTMLDivElement>('.isoflow-flow').forEach(($row) => {
      $row.onclick = () => this.open($row.dataset.id!)
    })
    const $nodes = $panel.querySelector<HTMLDivElement>('.isoflow-nodes')!
    const sorted = [...model.nodes].sort((a, b) => a.layer - b.layer || a.row - b.row)
    for (const n of sorted) {
      const $row = document.createElement('div')
      $row.dataset.id = n.id
      $row.style.cssText =
        'display:flex;align-items:center;padding:4px 8px;border-radius:6px;cursor:pointer;white-space:nowrap'
      $row.innerHTML =
        `<span class="isoflow-state" style="display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:9px;flex:none"></span>` +
        `<span style="overflow:hidden;text-overflow:ellipsis">${escapeHtml(n.label)}</span>` +
        `<span style="margin-left:auto;padding-left:8px;font:500 10px ${FONT.mono};color:${COLORS.faint};text-transform:uppercase">${escapeHtml(n.caption)}</span>`
      $row.onmouseenter = () => {
        this.world.scene.hovered = n
        if (!$row.dataset.active) $row.style.background = 'rgba(255,255,255,0.05)'
      }
      $row.onmouseleave = () => {
        if (this.world.scene.hovered === n) this.world.scene.hovered = undefined
        $row.style.background = $row.dataset.active ? 'rgba(62,224,127,0.12)' : ''
      }
      $row.onclick = () => this.select(n, true)
      $nodes.appendChild($row)
    }
    this.updateExplorerStates()
  }

  private updateExplorerStates() {
    this.$explorer?.querySelectorAll<HTMLDivElement>('.isoflow-nodes > div').forEach(($row) => {
      const n = this.world.model.byId.get($row.dataset.id!)
      const $dot = $row.querySelector<HTMLSpanElement>('.isoflow-state')
      if (!n || !$dot) return
      const color = stateColor(n)
      const busy = n.state === 'running'
      $dot.style.background = color
      $dot.style.boxShadow = busy ? `0 0 8px ${color}` : 'none'
    })
  }

  private highlightExplorer() {
    const id = this.world.scene.selected?.id
    this.$explorer?.querySelectorAll<HTMLDivElement>('.isoflow-nodes > div').forEach(($row) => {
      const active = $row.dataset.id === id
      $row.dataset.active = active ? '1' : ''
      $row.style.background = active ? 'rgba(62,224,127,0.12)' : ''
      if (active) $row.scrollIntoView({ block: 'nearest' })
    })
  }

  private renderInfo() {
    const $info = this.$info
    const n = this.world.scene.selected
    if (!$info || !n) return
    const { model } = this.world
    const section = (title: string) => `<div style="${MONO_LABEL};margin-top:14px">${title}</div>`
    const facts = (rows: Array<[string, string]>) =>
      '<table style="width:100%;border-collapse:collapse;margin-top:6px">' +
      rows
        .map(
          ([k, v]) =>
            `<tr><td style="color:${COLORS.muted};padding:2px 10px 2px 0;white-space:nowrap">${k}</td>` +
            `<td style="text-align:right">${escapeHtml(v)}</td></tr>`,
        )
        .join('') +
      '</table>'
    const link = (other: FlowNode, label?: string) =>
      `<div class="isoflow-link" data-id="${escapeHtml(other.id)}" style="display:flex;align-items:center;padding:3px 0;cursor:pointer;color:#cfe9db">` +
      `${this.dot(stateColor(other), 6)}${escapeHtml(other.label)}` +
      (label
        ? `<span style="margin-left:auto;font:500 10px ${FONT.mono};color:${COLORS.faint}">${escapeHtml(label.toUpperCase())}</span>`
        : '') +
      '</div>'

    const color = stateColor(n)
    const upstream = n.in.filter((e) => !e.back)
    const downstream = n.out.filter((e) => !e.back)
    const ancestors = [...(this.world.scene.lineage ?? [])].filter((m) => m !== n)
    const rows: Array<[string, string]> = [
      ['Kind', KIND_LABELS[n.kind]],
      ['Layer', `${n.layer + 1} of ${model.depth}`],
    ]
    if (model.mode === 'batch') {
      rows.push(['Duration', `~${n.duration.toFixed(1)} s`])
      if (n.failRate) rows.push(['Fails', `${Math.round(n.failRate * 100)}% of runs`])
      if (n.state === 'success' || n.state === 'failed')
        rows.push(['Last run', `${n.elapsed.toFixed(2)} s`])
    } else rows.push(['Events', String(n.count)])
    rows.push(['In lineage', `${ancestors.length} nodes`])
    if (n.group) rows.push(['Group', model.groups.find((g) => g.key === n.group)?.label ?? n.group])

    let html =
      `<div style="${MONO_LABEL}">${escapeHtml(n.caption)}</div>` +
      `<div style="font:600 19px/1.3 ${FONT.ui};margin-top:4px;word-break:break-word">${escapeHtml(n.label)}</div>` +
      `<div style="display:inline-flex;align-items:center;margin-top:8px;padding:2px 10px 2px 8px;border-radius:20px;` +
      `border:1px solid ${color}55;background:${color}14;font:600 10.5px ${FONT.mono};letter-spacing:1px;color:${color}">` +
      `${this.dot(color, 6, n.state === 'running' || n.state === 'live')}${n.state.toUpperCase()}` +
      (n.state === 'running' ? ` ${Math.round(n.progress * 100)}%` : '') +
      '</div>' +
      facts(rows)
    if (n.note) html += `<div style="margin-top:10px;color:#c5cfcc">${escapeHtml(n.note)}</div>`
    if (n.lines.length) {
      html +=
        section(n.kind === 'client' && model.mode === 'stream' ? 'Messages' : 'Details') +
        `<pre style="margin:6px 0 0;padding:8px 10px;border-radius:8px;background:rgba(255,255,255,0.04);` +
        `border:1px solid rgba(255,255,255,0.06);font:12px/1.5 ${FONT.mono};color:#b9c6c2;white-space:pre-wrap">` +
        `${escapeHtml(n.lines.join('\n'))}</pre>`
    }
    if (upstream.length)
      html +=
        section(`Upstream (${upstream.length})`) +
        upstream.map((e) => link(e.from, e.label)).join('')
    if (downstream.length)
      html +=
        section(`Downstream (${downstream.length})`) +
        downstream.map((e) => link(e.to, e.label)).join('')
    html += `<div style="margin-top:14px;color:${COLORS.faint};font-size:11px">esc to close · click a node to jump</div>`
    $info.innerHTML = html
    $info.querySelectorAll<HTMLDivElement>('.isoflow-link').forEach(($link) => {
      $link.onclick = () => this.select(model.byId.get($link.dataset.id!), true)
    })
  }

  private updateHud() {
    if (!this.$hud) return
    const sim = this.sim
    const { model } = this.world
    const label = (text: string, color: string = COLORS.muted) =>
      `<span style="font:600 10.5px ${FONT.mono};letter-spacing:1.5px;color:${color}">${text}</span>`
    let status: string
    if (model.mode === 'stream') {
      const events = model.nodes.reduce((sum, n) => sum + (n.in.length ? 0 : n.count), 0)
      status = `${this.dot(COLORS.green, 7, true)}${label('LIVE', COLORS.green)} &nbsp;${label(`${events} EVENTS SENT`)}`
    } else {
      const color =
        sim.status === 'running'
          ? COLORS.green
          : sim.status === 'failed'
            ? COLORS.red
            : COLORS.greenSoft
      const done = model.nodes.filter((n) => n.state === 'success').length
      const text =
        sim.status === 'running'
          ? `RUN #${sim.run} · ${done}/${model.nodes.length} DONE · ${sim.runTime.toFixed(1)}s`
          : `RUN #${sim.run} ${sim.status.toUpperCase()} · NEXT RUN SOON`
      const history = sim.history
        .slice(-16)
        .map(
          (r) =>
            `<span title="${r}" style="display:inline-block;width:6px;height:12px;margin-right:2px;border-radius:2px;` +
            `background:${r === 'success' ? COLORS.green : COLORS.red};opacity:0.8;vertical-align:middle"></span>`,
        )
        .join('')
      status = `${this.dot(color, 7, sim.status === 'running')}${label(text, color)}${history ? `&nbsp;&nbsp;${history}` : ''}`
    }
    const paused = sim.paused ? ` &nbsp;${label('PAUSED', COLORS.amber)}` : ''
    this.$hud.innerHTML =
      `<div style="display:flex;align-items:center;gap:16px;white-space:nowrap;overflow:hidden">` +
      `<div>${status}${paused} &nbsp;${label(`${sim.speed}×`)}</div>` +
      `<div style="margin-left:auto;color:${COLORS.faint};font-size:11.5px;overflow:hidden;text-overflow:ellipsis">` +
      `click a node · drag to pan · wheel pan · ctrl+wheel zoom · 1-${this.options.samples.length} workflows · ` +
      `space pause · R restart · + / − speed · F fit · esc clear</div></div>`
  }
}
