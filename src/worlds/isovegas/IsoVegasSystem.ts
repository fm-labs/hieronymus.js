import type { IGame, IGameSystem } from '../../../lib/game.types'
import { AbstractGameSystem } from '../../../lib'
import {
  createVehicle,
  stepTraffic,
  vehiclePosition,
  type RoadMap,
  type Vehicle,
} from '../isocity/isocity.traffic.ts'
import { IsoVegasVehicleComponent, type VegasVehicleKind } from './IsoVegasVehicleComponent.ts'
import { mix } from './isovegas.draw.ts'
import {
  DAY_SECONDS,
  formatClock,
  nightAmount,
  placeAt,
  vegasRoadMap,
  type Landmark,
  type Prop,
} from './isovegas.map.ts'
import type { VegasWorld } from './isovegas.world.ts'

export type IsoVegasSystemOptions = {
  vehicleLayer: number
  /** Vehicles at the start */
  vehicles?: number
  maxVehicles?: number
}

const CAR_COLORS = ['#e53935', '#1e88e5', '#fafafa', '#212121', '#8e24aa', '#43a047', '#90a4ae']

const SKY = {
  day: ['#9fd3f0', '#f3e2c3'],
  night: ['#05061a', '#2a1648'],
}

type Traffic = { vehicle: Vehicle; component: IsoVegasVehicleComponent; id: number }

/**
 * Runs the Strip: the clock with day and night, the traffic, and the landmark info.
 * Keys: + / − add or remove a vehicle, N switches between day and night, space pauses.
 * Click a landmark (or pick one from the list) to see what it is.
 */
export class IsoVegasSystem extends AbstractGameSystem implements IGameSystem {
  public name = 'IsoVegasSystem'

  private readonly world: VegasWorld
  private readonly isRoad: RoadMap
  private readonly options: Required<IsoVegasSystemOptions>
  private readonly traffic: Traffic[] = []
  private nextId = 1
  private paused = false
  private selected?: Landmark | Prop
  private skyNight = -1
  private $hud?: HTMLDivElement
  private $info?: HTMLDivElement
  private $list?: HTMLDivElement
  private previousBackground = ''

  constructor(game: IGame, world: VegasWorld, options: IsoVegasSystemOptions) {
    super(game)
    this.world = world
    this.isRoad = vegasRoadMap(world.map.cells)
    this.options = { vehicles: 28, maxVehicles: 80, ...options }
    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.handleMouseDown = this.handleMouseDown.bind(this)
  }

  public onLoad() {
    for (let i = 0; i < this.options.vehicles; i++) this.addVehicle()
  }

  public start() {
    this._game.eventbus.on('keyboard.keydown', this.handleKeyDown)
    this._game.eventbus.on('mouse.mousedown', this.handleMouseDown)
    this.previousBackground = this._game.$container.style.background
    this.$hud = this.createPanel('left:10px;bottom:10px;width:auto')
    this.$info = this.createPanel('right:10px;top:10px;width:240px')
    this.$list = this.createPanel('right:10px;bottom:10px;width:160px')
    this.renderList()
    this.fitView()
    this.updateSky()
    this.updateHud()
  }

  public stop() {
    this._game.eventbus.off('keyboard.keydown', this.handleKeyDown)
    this._game.eventbus.off('mouse.mousedown', this.handleMouseDown)
    this._game.$container.style.background = this.previousBackground
    this.$hud?.remove()
    this.$info?.remove()
    this.$list?.remove()
  }

  public async tick(deltaTime: number) {
    // cap the step, so a long frame (e.g. a background tab) doesn't teleport the vehicles
    const seconds = Math.min(deltaTime, 100) / 1000
    const { scene } = this.world
    scene.time += seconds
    if (!this.paused) {
      const clock = Math.floor(scene.hours * 6)
      scene.hours = (scene.hours + (seconds / DAY_SECONDS) * 24) % 24
      stepTraffic(
        this.traffic.map((t) => t.vehicle),
        this.isRoad,
        seconds,
        Math.random,
      )
      // the clock in the HUD shows 10 minute steps
      if (Math.floor(scene.hours * 6) !== clock) this.updateHud()
    }
    scene.night = nightAmount(scene.hours)
    this.updateSky()
    this.traffic.forEach(({ vehicle, component }) => this.syncComponent(vehicle, component))
  }

  private syncComponent(vehicle: Vehicle, component: IsoVegasVehicleComponent) {
    const p = vehiclePosition(vehicle)
    const screen = this.world.tileMap.projection.mapGridToScreen(p.col - 0.5, p.row - 0.5)
    component.setPosition(screen.x, screen.y)
    component.properties.direction = vehicle.direction
  }

  private addVehicle() {
    if (this.traffic.length >= this.options.maxVehicles) return
    const cell = this.findFreeRoadCell()
    if (!cell) return

    const id = this.nextId++
    const kind: VegasVehicleKind =
      id % 7 === 0 ? 'bus' : id % 5 === 0 ? 'limo' : id % 3 === 0 ? 'taxi' : 'car'
    const color = {
      bus: '#c62828',
      limo: id % 2 ? '#f5f5f5' : '#212121',
      taxi: '#fbc02d',
      car: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
    }[kind]
    const vehicle = createVehicle(id, this.isRoad, cell.col, cell.row, Math.random, {
      kind: kind === 'bus' ? 'bus' : 'car',
      color,
      speed: kind === 'bus' ? 0.9 : kind === 'limo' ? 1.0 : 1.2 + Math.random() * 0.7,
    })
    const component = new IsoVegasVehicleComponent({
      tileSize: this.world.tileMap.tileWidth,
      kind,
      color,
      direction: vehicle.direction,
      scene: this.world.scene,
    })
    const componentId = this.world.tileMap.addObjectAtGridPos(
      this.options.vehicleLayer,
      cell.col,
      cell.row,
      component,
    )
    this.syncComponent(vehicle, component)
    this.traffic.push({ vehicle, component, id: componentId })
  }

  private removeVehicle() {
    const removed = this.traffic.pop()
    if (removed) this.world.tileMap.removeObject(this.options.vehicleLayer, removed.id)
  }

  /** A random road cell without a vehicle on it or right next to it */
  private findFreeRoadCell(): { col: number; row: number } | undefined {
    const { columns, rows } = this.world.map
    const cells: Array<{ col: number; row: number }> = []
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        if (!this.isRoad(col, row)) continue
        const taken = this.traffic.some(({ vehicle }) => {
          const p = vehiclePosition(vehicle)
          return Math.abs(p.col - (col + 0.5)) < 1 && Math.abs(p.row - (row + 0.5)) < 1
        })
        if (!taken) cells.push({ col, row })
      }
    }
    return cells[Math.floor(Math.random() * cells.length)]
  }

  /** The sky behind the map: blue by day, deep purple at night */
  private updateSky() {
    const night = Math.round(this.world.scene.night * 50) / 50
    if (night === this.skyNight) return
    this.skyNight = night
    const top = mix(SKY.day[0], SKY.night[0], night)
    const bottom = mix(SKY.day[1], SKY.night[1], night)
    this._game.$container.style.background = `linear-gradient(${top}, ${bottom})`
  }

  /** Zoom out and center, so the whole Strip is visible */
  private fitView() {
    const { tileMap, map } = this.world
    const projection = tileMap.projection
    const left = projection.mapGridToScreen(0, map.rows).x
    const right = projection.mapGridToScreen(map.columns, 0).x
    // tall towers stick out above the map
    const top = projection.mapGridToScreen(0, 0).y - 200
    const bottom = projection.mapGridToScreen(map.columns, map.rows).y + 40
    const width = this._game.$container.offsetWidth || window.innerWidth
    const height = this._game.$container.offsetHeight || window.innerHeight
    const zoom = Math.max(0.5, Math.min(1, width / (right - left), height / (bottom - top)))
    this._game.camera.zoom = zoom
    this._game.camera.offset = {
      x: ((left + right) / 2) * zoom - width / 2,
      y: ((top + bottom) / 2) * zoom - height / 2,
    }
  }

  private centerOn(col: number, row: number) {
    const { zoom } = this._game.camera
    const screen = this.world.tileMap.projection.mapGridToScreen(col, row)
    const width = this._game.$container.offsetWidth || window.innerWidth
    const height = this._game.$container.offsetHeight || window.innerHeight
    this._game.camera.offset = {
      x: screen.x * zoom - width / 2,
      // a bit higher, so the towers are in view
      y: (screen.y - 60) * zoom - height / 2,
    }
  }

  private select(place: Landmark | Prop | undefined) {
    this.selected = place
    const { selection, tileMap } = this.world
    selection.properties.visible = !!place
    if (place) {
      const screen = tileMap.projection.mapGridToScreen(place.col, place.row)
      selection.setPosition(screen.x, screen.y)
      selection.properties.cols = 'cols' in place ? place.cols : 1
      selection.properties.rows = 'rows' in place ? place.rows : 1
    }
    this.updateHud()
  }

  private handleKeyDown(e: KeyboardEvent) {
    const { scene } = this.world
    if (e.key === '+' || e.key === '=') this.addVehicle()
    else if (e.key === '-') this.removeVehicle()
    else if (e.code === 'Space') this.paused = !this.paused
    else if (e.key === 'n' || e.key === 'N') scene.hours = scene.night > 0.5 ? 12 : 21
    else if (e.key === 'Escape') this.select(undefined)
    else return
    this.updateHud()
  }

  private handleMouseDown(e: MouseEvent) {
    // ignore clicks on the panels
    if ((e.target as HTMLElement | null)?.closest?.('.isovegas-panel')) return

    // screen → world: the TileMapSystem draws with translate(-offset), then scale(zoom)
    const rect = this._game.$container.getBoundingClientRect()
    const { offset, zoom } = this._game.camera
    const worldX = (e.clientX - rect.left + offset.x) / zoom
    const worldY = (e.clientY - rect.top + offset.y) / zoom
    const { col, row } = this.world.tileMap.projection.mapScreenToGrid(worldX, worldY)
    this.select(placeAt(this.world.map, col, row))
  }

  private createPanel(position: string): HTMLDivElement {
    const $panel = document.createElement('div')
    $panel.className = 'isovegas-panel'
    $panel.style.cssText =
      `position:absolute;${position};z-index:10;padding:8px 12px;` +
      'background:rgba(24,10,40,0.8);color:#fdf2dc;font:12px/1.5 Arial;border-radius:8px;' +
      'border:1px solid rgba(255,79,163,0.55);box-shadow:0 0 12px rgba(255,79,163,0.25)'
    this._game.$container.appendChild($panel)
    return $panel
  }

  private renderList() {
    if (!this.$list) return
    this.$list.innerHTML = '<b style="color:#ff4fa3">THE STRIP</b><br>'
    // north to south, as you drive down the Strip
    const landmarks = [...this.world.map.landmarks].sort((a, b) => a.row - b.row || a.col - b.col)
    for (const landmark of landmarks) {
      const $item = document.createElement('div')
      $item.textContent = landmark.name
      $item.style.cssText = 'cursor:pointer;opacity:0.85'
      $item.onmouseenter = () => ($item.style.color = '#ffd36b')
      $item.onmouseleave = () => ($item.style.color = '')
      $item.onclick = () => {
        this.select(landmark)
        this.centerOn(landmark.col + landmark.cols / 2, landmark.row + landmark.rows / 2)
      }
      this.$list.appendChild($item)
    }
  }

  private updateHud() {
    if (!this.$hud || !this.$info) return
    const { scene } = this.world
    const icon = scene.night > 0.5 ? '🌙' : '☀️'
    const state = this.paused ? ' <span style="color:#ffca28">(paused)</span>' : ''
    this.$hud.innerHTML =
      `<b style="color:#ff4fa3">LAS VEGAS</b> · ${icon} ${formatClock(scene.hours)}${state}` +
      ` · ${this.traffic.length} vehicles<br>` +
      '<span style="opacity:0.7">click a landmark · N day / night · + / − traffic · space pause · ' +
      'WASD / wheel pan · ctrl+wheel zoom</span>'

    const place = this.selected
    this.$info.style.display = place ? 'block' : 'none'
    if (!place) return
    this.$info.innerHTML =
      `<b style="color:#ffd36b">${place.name}</b><br>${place.fact}<br>` +
      `<span style="opacity:0.6">cell ${place.col}, ${place.row} · esc to close</span>`
  }
}
