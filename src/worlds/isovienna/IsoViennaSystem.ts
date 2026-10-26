import type { IGame, IGameSystem } from '../../../lib/game.types'
import { AbstractGameSystem } from '../../../lib'
import {
  createVehicle,
  vehiclePosition,
  type RoadMap,
  type Vehicle,
} from '../isocity/isocity.traffic.ts'
import { IsoViennaBoatComponent } from './IsoViennaBoatComponent.ts'
import { IsoViennaSidePane } from './IsoViennaSidePane.ts'
import { IsoViennaVehicleComponent, type ViennaVehicleKind } from './IsoViennaVehicleComponent.ts'
import { mix } from './isovienna.draw.ts'
import {
  DAY_SECONDS,
  formatClock,
  nightAmount,
  placeAt,
  stepViennaTraffic,
  viennaRoadMap,
  viennaTramMap,
  type Landmark,
  type Prop,
} from './isovienna.map.ts'
import type { ViennaWorld } from './isovienna.world.ts'

export type IsoViennaSystemOptions = {
  vehicleLayer: number
  /** Cars, buses and fiakers at the start */
  vehicles?: number
  maxVehicles?: number
  /** Trams on the Ring */
  trams?: number
}

const CAR_COLORS = ['#e53935', '#1e88e5', '#fafafa', '#212121', '#7cb342', '#90a4ae', '#6d4c41']

const SKY = {
  day: ['#a9d4f2', '#f6ead6'],
  winter: ['#c4d0dc', '#eef1f4'],
  night: ['#081030', '#2b2f52'],
}

type Traffic = {
  vehicle: Vehicle
  component: IsoViennaVehicleComponent
  id: number
  tram: boolean
}

type Boat = { col: number; row: number; east: boolean; component: IsoViennaBoatComponent }

/** Cells per second */
const BOAT_SPEED = 0.45

/**
 * Runs Vienna: the clock with day and night, summer and winter, the traffic with trams on the Ring,
 * the boats on the Danube Canal, and the info about the sights.
 * Keys: + / − add or remove a vehicle, N day / night, X summer / winter, space pauses.
 */
export class IsoViennaSystem extends AbstractGameSystem implements IGameSystem {
  public name = 'IsoViennaSystem'

  private readonly world: ViennaWorld
  private readonly isRoad: RoadMap
  private readonly isTrack: RoadMap
  private readonly options: Required<IsoViennaSystemOptions>
  private readonly traffic: Traffic[] = []
  private readonly boats: Boat[] = []
  private readonly bridges: number[] = []
  private nextId = 1
  private paused = false
  private selected?: Landmark | Prop
  private sky = ''
  private $hud?: HTMLDivElement
  private pane?: IsoViennaSidePane
  private $list?: HTMLDivElement
  private previousBackground = ''
  private previousOverflow = ''
  /** Where the camera glides to, after a sight was chosen */
  private cameraTarget?: { x: number; y: number }

  constructor(game: IGame, world: ViennaWorld, options: IsoViennaSystemOptions) {
    super(game)
    this.world = world
    this.isRoad = viennaRoadMap(world.map.cells)
    this.isTrack = viennaTramMap(world.map.cells)
    this.options = { vehicles: 30, maxVehicles: 80, trams: 4, ...options }
    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.handleMouseDown = this.handleMouseDown.bind(this)
    this.handleDoubleClick = this.handleDoubleClick.bind(this)
  }

  public onLoad() {
    for (let i = 0; i < this.options.trams; i++) this.addTram(i / this.options.trams)
    for (let i = 0; i < this.options.vehicles; i++) this.addVehicle()
    this.addBoats()
  }

  public start() {
    this._game.eventbus.on('keyboard.keydown', this.handleKeyDown)
    this._game.eventbus.on('mouse.mousedown', this.handleMouseDown)
    this._game.eventbus.on('mouse.dblclick', this.handleDoubleClick)
    this.previousBackground = this._game.$container.style.background
    this.previousOverflow = this._game.$container.style.overflow
    this._game.$container.style.overflow = 'hidden'
    this.$hud = this.createPanel('left:10px;bottom:10px;width:auto;transition:left 0.3s ease')
    this.pane = new IsoViennaSidePane(this._game.$container, this.world.tileMap.tileWidth, () =>
      this.select(undefined),
    )
    this.$list = this.createPanel('right:10px;bottom:10px;width:170px')
    this.renderList()
    this.fitView()
    this.updateSky()
    this.updateHud()
  }

  public stop() {
    this._game.eventbus.off('keyboard.keydown', this.handleKeyDown)
    this._game.eventbus.off('mouse.mousedown', this.handleMouseDown)
    this._game.eventbus.off('mouse.dblclick', this.handleDoubleClick)
    this._game.$container.style.background = this.previousBackground
    this._game.$container.style.overflow = this.previousOverflow
    this.$hud?.remove()
    this.pane?.remove()
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
      const trams = new Set(this.traffic.filter((t) => t.tram).map((t) => t.vehicle))
      stepViennaTraffic(
        this.traffic.map((t) => t.vehicle),
        (vehicle) => (trams.has(vehicle) ? this.isTrack : this.isRoad),
        seconds,
        Math.random,
      )
      this.moveBoats(seconds)
      // the clock in the HUD shows 10 minute steps
      if (Math.floor(scene.hours * 6) !== clock) this.updateHud()
    }
    scene.night = nightAmount(scene.hours)
    this.updateSky()
    this.moveCamera(seconds)
    this.traffic.forEach(({ vehicle, component }) => this.syncComponent(vehicle, component))
  }

  private syncComponent(vehicle: Vehicle, component: IsoViennaVehicleComponent) {
    const p = vehiclePosition(vehicle)
    const screen = this.world.tileMap.projection.mapGridToScreen(p.col - 0.5, p.row - 0.5)
    component.setPosition(screen.x, screen.y)
    component.properties.direction = vehicle.direction
  }

  private addTraffic(vehicle: Vehicle, kind: ViennaVehicleKind, tram: boolean) {
    const component = new IsoViennaVehicleComponent({
      tileSize: this.world.tileMap.tileWidth,
      kind,
      color: vehicle.color,
      direction: vehicle.direction,
      scene: this.world.scene,
    })
    const id = this.world.tileMap.addObjectAtGridPos(
      this.options.vehicleLayer,
      vehicle.col,
      vehicle.row,
      component,
    )
    this.syncComponent(vehicle, component)
    this.traffic.push({ vehicle, component, id, tram })
  }

  /** A tram on the Ring, `at` = 0..1 around the loop */
  private addTram(at: number) {
    const cells = this.ringCells()
    const cell = cells[Math.floor(at * cells.length)]
    if (!cell) return
    const vehicle = createVehicle(this.nextId++, this.isTrack, cell.col, cell.row, Math.random, {
      kind: 'bus',
      color: '#d32f2f',
      speed: 0.9,
    })
    this.addTraffic(vehicle, 'tram', true)
  }

  private addVehicle() {
    if (this.traffic.length >= this.options.maxVehicles) return
    const cell = this.findFreeRoadCell()
    if (!cell) return

    const id = this.nextId++
    const kind: ViennaVehicleKind =
      id % 7 === 0 ? 'bus' : id % 5 === 0 ? 'fiaker' : id % 4 === 0 ? 'taxi' : 'car'
    const color = {
      bus: '#c62828',
      fiaker: '#1f1f1f',
      taxi: '#212121',
      tram: '#d32f2f',
      car: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
    }[kind]
    const vehicle = createVehicle(id, this.isRoad, cell.col, cell.row, Math.random, {
      kind: kind === 'bus' ? 'bus' : 'car',
      color,
      speed: kind === 'bus' ? 0.9 : kind === 'fiaker' ? 0.6 : 1.1 + Math.random() * 0.6,
    })
    this.addTraffic(vehicle, kind, false)
  }

  private removeVehicle() {
    // the trams keep running
    const cars = this.traffic.filter((t) => !t.tram)
    const index = this.traffic.lastIndexOf(cars[cars.length - 1])
    if (index < 0) return
    const [removed] = this.traffic.splice(index, 1)
    this.world.tileMap.removeObject(this.options.vehicleLayer, removed.id)
  }

  /** The cells of the Ring, in the order a tram drives around it */
  private ringCells(): Array<{ col: number; row: number }> {
    const { cells } = this.world.map
    const start = cells.flatMap((line, row) =>
      [...line].flatMap((_, col) => (this.isTrack(col, row) ? [{ col, row }] : [])),
    )[0]
    if (!start) return []
    const loop = [start]
    const seen = new Set([`${start.col},${start.row}`])
    for (;;) {
      const { col, row } = loop[loop.length - 1]
      const next = [
        { col: col + 1, row },
        { col, row: row + 1 },
        { col: col - 1, row },
        { col, row: row - 1 },
      ].find((c) => this.isTrack(c.col, c.row) && !seen.has(`${c.col},${c.row}`))
      if (!next) return loop
      seen.add(`${next.col},${next.row}`)
      loop.push(next)
    }
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

  /** Two boats on the canal, one going each way */
  private addBoats() {
    const { cells, columns } = this.world.map
    const waterRows = cells.flatMap((line, row) => (line.includes('~') ? [row] : []))
    if (!waterRows.length) return
    const row = waterRows[0]
    for (let col = 0; col < columns; col++) {
      if (cells[row][col] === '%') this.bridges.push(col + 0.5)
    }
    const middle = (waterRows[0] + waterRows[waterRows.length - 1] + 1) / 2
    for (const [east, col] of [
      [true, 6],
      [false, 22],
    ] as Array<[boolean, number]>) {
      const component = new IsoViennaBoatComponent({
        tileSize: this.world.tileMap.tileWidth,
        east,
        opacity: 1,
        scene: this.world.scene,
      })
      this.world.tileMap.addObjectAtGridPos(this.options.vehicleLayer, col, row, component)
      const boat = { col, row: middle + (east ? 0.35 : -0.35), east, component }
      this.boats.push(boat)
      this.moveBoat(boat, 0)
    }
  }

  private moveBoats(seconds: number) {
    this.boats.forEach((boat) => this.moveBoat(boat, seconds))
  }

  private moveBoat(boat: Boat, seconds: number) {
    const { columns } = this.world.map
    boat.col += (boat.east ? 1 : -1) * BOAT_SPEED * seconds
    // around again, from the other end of the canal
    if (boat.col > columns + 1) boat.col = -1
    if (boat.col < -1) boat.col = columns + 1
    // the boat disappears under the bridges
    const distance = Math.min(...this.bridges.map((b) => Math.abs(b - boat.col)), 9)
    const edge = Math.min(boat.col + 0.5, columns + 0.5 - boat.col)
    boat.component.properties.opacity = Math.max(0, Math.min(1, (distance - 0.3) / 0.4, edge))
    const screen = this.world.tileMap.projection.mapGridToScreen(boat.col - 0.5, boat.row - 0.5)
    boat.component.setPosition(screen.x, screen.y)
  }

  /** The sky behind the map: blue by day, grey in winter, deep blue at night */
  private updateSky() {
    const { night, winter } = this.world.scene
    const n = Math.round(night * 50) / 50
    const day = winter ? SKY.winter : SKY.day
    const sky = `linear-gradient(${mix(day[0], SKY.night[0], n)}, ${mix(day[1], SKY.night[1], n)})`
    if (sky === this.sky) return
    this.sky = sky
    this._game.$container.style.background = sky
  }

  /** Zoom out and center, so the whole city is visible */
  private fitView() {
    const { tileMap, map } = this.world
    const projection = tileMap.projection
    const left = projection.mapGridToScreen(0, map.rows).x
    const right = projection.mapGridToScreen(map.columns, 0).x
    // the Donauturm sticks out above the map
    const top = projection.mapGridToScreen(0, 0).y - 160
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

  /** Glide the camera, so the middle of the place ends up in the middle of the screen */
  private centerOn(place: Landmark | Prop) {
    const cols = 'cols' in place ? place.cols : 1
    const rows = 'rows' in place ? place.rows : 1
    const screen = this.world.tileMap.projection.mapGridToScreen(
      place.col + cols / 2,
      place.row + rows / 2,
    )
    const { zoom } = this._game.camera
    const width = this._game.$container.offsetWidth || window.innerWidth
    const height = this._game.$container.offsetHeight || window.innerHeight
    // the middle of what the side pane leaves free
    const pane = this.pane?.width ?? 0
    this.cameraTarget = {
      x: screen.x * zoom - (pane + (width - pane) / 2),
      // a bit higher, so the towers are in view
      y: (screen.y - 30) * zoom - height / 2,
    }
  }

  private moveCamera(seconds: number) {
    const target = this.cameraTarget
    if (!target) return
    const { offset } = this._game.camera
    const dx = target.x - offset.x
    const dy = target.y - offset.y
    if (Math.hypot(dx, dy) < 1) {
      this._game.camera.offset = { ...target }
      this.cameraTarget = undefined
      return
    }
    // ease out: cover most of the remaining way in a fraction of a second
    const step = 1 - Math.exp(-seconds * 8)
    this._game.camera.offset = { x: offset.x + dx * step, y: offset.y + dy * step }
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
    else if (e.key === 'x' || e.key === 'X') scene.winter = !scene.winter
    else if (e.key === 'Escape') this.select(undefined)
    else return
    this.updateSky()
    this.updateHud()
  }

  private handleMouseDown(e: MouseEvent) {
    if (this.isOnPanel(e)) return
    // a click stops the camera gliding, e.g. to grab the map
    this.cameraTarget = undefined
    this.select(this.placeUnder(e))
  }

  /** Double click a sight to bring it to the middle of the screen */
  private handleDoubleClick(e: MouseEvent) {
    if (this.isOnPanel(e)) return
    const place = this.placeUnder(e)
    if (!place) return
    this.select(place)
    this.centerOn(place)
  }

  private isOnPanel(e: MouseEvent) {
    return !!(e.target as HTMLElement | null)?.closest?.('.isovienna-panel')
  }

  private placeUnder(e: MouseEvent): Landmark | Prop | undefined {
    // screen → world: the TileMapSystem draws with translate(-offset), then scale(zoom)
    const rect = this._game.$container.getBoundingClientRect()
    const { offset, zoom } = this._game.camera
    const worldX = (e.clientX - rect.left + offset.x) / zoom
    const worldY = (e.clientY - rect.top + offset.y) / zoom
    const { col, row } = this.world.tileMap.projection.mapScreenToGrid(worldX, worldY)
    return placeAt(this.world.map, col, row)
  }

  private createPanel(position: string): HTMLDivElement {
    const $panel = document.createElement('div')
    $panel.className = 'isovienna-panel'
    $panel.style.cssText =
      `position:fixed;${position};z-index:10;padding:8px 12px;` +
      'background:rgba(251,247,238,0.93);color:#3b2f27;font:12px/1.5 Georgia,serif;border-radius:6px;' +
      'border:1px solid #c9a043;box-shadow:0 2px 10px rgba(40,25,10,0.25)'
    this._game.$container.appendChild($panel)
    return $panel
  }

  private renderList() {
    if (!this.$list) return
    this.$list.innerHTML = '<b style="color:#c8102e;letter-spacing:1px">SIGHTS</b><br>'
    // north to south
    const landmarks = [...this.world.map.landmarks].sort((a, b) => a.row - b.row || a.col - b.col)
    for (const landmark of landmarks) {
      const $item = document.createElement('div')
      $item.textContent = landmark.name
      $item.style.cssText = 'cursor:pointer'
      $item.onmouseenter = () => ($item.style.color = '#c8102e')
      $item.onmouseleave = () => ($item.style.color = '')
      $item.onclick = () => {
        this.select(landmark)
        this.centerOn(landmark)
      }
      this.$list.appendChild($item)
    }
  }

  private updateHud() {
    if (!this.$hud) return
    const { scene } = this.world
    const icon = scene.night > 0.5 ? '🌙' : scene.winter ? '❄️' : '☀️'
    const state = this.paused ? ' <span style="color:#c8102e">(paused)</span>' : ''
    const trams = this.traffic.filter((t) => t.tram).length
    this.$hud.innerHTML =
      `<b style="color:#c8102e;letter-spacing:1px">WIEN</b> · ${icon} ${formatClock(scene.hours)}${state}` +
      ` · ${this.traffic.length - trams} vehicles, ${trams} trams<br>` +
      '<span style="opacity:0.7">click a sight · double click to center · N day / night · X summer / winter · + / − traffic · ' +
      'space pause · WASD / wheel pan · ctrl+wheel zoom</span>'
    if (this.selected) this.pane?.show(this.selected, scene)
    else this.pane?.hide()
    // the HUD moves out of the way of the side pane
    this.$hud.style.left = `${(this.pane?.width ?? 0) + 10}px`
  }
}
