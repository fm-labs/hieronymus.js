import type { IGame, IGameSystem } from '@fmlabs/hieronimo'
import { AbstractGameSystem } from '@fmlabs/hieronimo'
import {
  createVehicle,
  stepTraffic,
  vehiclePosition,
  type RoadMap,
  type Vehicle,
} from '../isocity/isocity.traffic.ts'
import { mix } from '../isovegas/isovegas.draw.ts'
import { DAY_SECONDS, formatClock, nightAmount } from '../isovegas/isovegas.map.ts'
import {
  IsoVegasVehicleComponent,
  type VegasVehicleKind,
} from '../isovegas/IsoVegasVehicleComponent.ts'
import { GATES } from './isoairport.airside.ts'
import {
  createTraffic,
  flightStatus,
  isArriving,
  stepAirport,
  type AirportTraffic,
  type Flight,
} from './isoairport.flights.ts'
import { airportRoadMap, placeAt, type Building, type Prop } from './isoairport.map.ts'
import type { AirportWorld } from './isoairport.world.ts'
import { IsoAirportPlaneComponent } from './IsoAirportPlaneComponent.ts'

export type IsoAirportSystemOptions = {
  /** Planes on the ground, and cars */
  vehicleLayer: number
  /** Planes in the air */
  skyLayer: number
  /** Cars at the start */
  cars?: number
  maxCars?: number
}

const CAR_COLORS = ['#e53935', '#1e88e5', '#fafafa', '#212121', '#8e24aa', '#43a047', '#90a4ae']

const SKY = {
  day: ['#8fc8ee', '#e3f1f7'],
  night: ['#060a1f', '#1d2747'],
}

type Plane = { component: IsoAirportPlaneComponent; layer: number; id: number }
type Car = { vehicle: Vehicle; component: IsoVegasVehicleComponent; id: number }

/**
 * Runs the airport: the clock with day and night, the flights, the cars on the landside roads,
 * the flight board, and the info about what is clicked.
 * Keys: + / − add or remove a car, N switches between day and night, F follows the selected plane,
 * space pauses, Esc clears the selection.
 */
export class IsoAirportSystem extends AbstractGameSystem implements IGameSystem {
  public name = 'IsoAirportSystem'

  private readonly world: AirportWorld
  private readonly isRoad: RoadMap
  private readonly options: Required<IsoAirportSystemOptions>
  private readonly traffic: AirportTraffic
  private readonly planes = new Map<number, Plane>()
  private readonly cars: Car[] = []
  private nextCarId = 1
  private paused = false
  private following = false
  private selectedPlace?: Building | Prop
  private selectedFlight?: number
  private skyNight = -1
  private boardTimer = 0
  private $hud?: HTMLDivElement
  private $info?: HTMLDivElement
  private $board?: HTMLDivElement
  private previousBackground = ''

  constructor(game: IGame, world: AirportWorld, options: IsoAirportSystemOptions) {
    super(game)
    this.world = world
    this.isRoad = airportRoadMap(world.map.cells)
    this.options = { cars: 18, maxCars: 50, ...options }
    this.traffic = createTraffic(Math.random, { parked: 5 })
    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.handleMouseDown = this.handleMouseDown.bind(this)
  }

  public onLoad() {
    for (let i = 0; i < this.options.cars; i++) this.addCar()
    this.syncPlanes()
  }

  public start() {
    this._game.eventbus.on('keyboard.keydown', this.handleKeyDown)
    this._game.eventbus.on('mouse.mousedown', this.handleMouseDown)
    this.previousBackground = this._game.$container.style.background
    this.$hud = this.createPanel('left:10px;bottom:10px;width:auto')
    this.$info = this.createPanel('right:10px;top:10px;width:250px')
    this.$board = this.createPanel('right:10px;bottom:10px;width:300px')
    this.fitView()
    this.updateSky()
    this.updateHud()
    this.renderBoard()
  }

  public stop() {
    this._game.eventbus.off('keyboard.keydown', this.handleKeyDown)
    this._game.eventbus.off('mouse.mousedown', this.handleMouseDown)
    this._game.$container.style.background = this.previousBackground
    this.$hud?.remove()
    this.$info?.remove()
    this.$board?.remove()
  }

  public async tick(deltaTime: number) {
    // cap the step, so a long frame (e.g. a background tab) doesn't teleport the planes
    const seconds = Math.min(deltaTime, 100) / 1000
    const { scene } = this.world
    scene.time += seconds
    if (!this.paused) {
      const clock = Math.floor(scene.hours * 6)
      scene.hours = (scene.hours + (seconds / DAY_SECONDS) * 24) % 24
      stepAirport(this.traffic, seconds, Math.random)
      stepTraffic(
        this.cars.map((c) => c.vehicle),
        this.isRoad,
        seconds,
        Math.random,
      )
      if (Math.floor(scene.hours * 6) !== clock) this.updateHud()
    }
    scene.night = nightAmount(scene.hours)
    this.updateSky()
    this.syncPlanes()
    this.cars.forEach(({ vehicle, component }) => this.syncCar(vehicle, component))
    if (this.following) this.followSelected()

    // the board changes a few times a second, not every frame
    this.boardTimer -= seconds
    if (this.boardTimer <= 0) {
      this.boardTimer = 0.25
      this.renderBoard()
      if (this.selectedFlight) this.updateHud()
    }
  }

  /** Create, move and remove the plane components of the flights */
  private syncPlanes() {
    const { tileMap, scene } = this.world
    const flights = new Map(this.traffic.flights.map((f) => [f.id, f]))
    for (const [id, plane] of this.planes) {
      if (flights.has(id)) continue
      tileMap.removeObject(plane.layer, plane.id)
      this.planes.delete(id)
      if (this.selectedFlight === id) this.selectFlight(undefined)
    }
    for (const flight of this.traffic.flights) {
      let plane = this.planes.get(flight.id)
      // in the air, planes are drawn above all buildings
      const layer = flight.altitude > 0 ? this.options.skyLayer : this.options.vehicleLayer
      if (!plane || plane.layer !== layer) {
        const component =
          plane?.component ??
          new IsoAirportPlaneComponent({
            tileSize: tileMap.tileWidth,
            kind: flight.type,
            color: flight.airline.color,
            tail: flight.airline.tail,
            heading: flight.heading,
            altitude: flight.altitude,
            phase: flight.phase,
            seed: flight.id,
            selected: false,
            scene,
          })
        if (plane) tileMap.removeObject(plane.layer, plane.id)
        const id = tileMap.addObjectAtGridPos(layer, 0, 0, component)
        plane = { component, layer, id }
        this.planes.set(flight.id, plane)
      }
      const screen = tileMap.projection.mapGridToScreen(
        flight.position.col - 0.5,
        flight.position.row - 0.5,
      )
      const props = plane.component.properties
      plane.component.setPosition(screen.x, screen.y)
      props.heading = flight.heading
      props.altitude = flight.altitude
      props.phase = flight.phase
      props.selected = this.selectedFlight === flight.id
    }
    scene.docked = GATES.map((_, gate) =>
      this.traffic.flights.some((f) => f.gate === gate && f.phase === 'atGate'),
    )
  }

  private syncCar(vehicle: Vehicle, component: IsoVegasVehicleComponent) {
    const p = vehiclePosition(vehicle)
    const screen = this.world.tileMap.projection.mapGridToScreen(p.col - 0.5, p.row - 0.5)
    component.setPosition(screen.x, screen.y)
    component.properties.direction = vehicle.direction
  }

  private addCar() {
    if (this.cars.length >= this.options.maxCars) return
    const cell = this.findFreeRoadCell()
    if (!cell) return
    const id = this.nextCarId++
    const kind: VegasVehicleKind = id % 6 === 0 ? 'bus' : id % 3 === 0 ? 'taxi' : 'car'
    const color = {
      bus: '#1565c0',
      limo: '#212121',
      taxi: '#fbc02d',
      car: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
    }[kind]
    const vehicle = createVehicle(id, this.isRoad, cell.col, cell.row, Math.random, {
      kind: kind === 'bus' ? 'bus' : 'car',
      color,
      speed: kind === 'bus' ? 0.9 : 1.2 + Math.random() * 0.6,
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
    this.syncCar(vehicle, component)
    this.cars.push({ vehicle, component, id: componentId })
  }

  private removeCar() {
    const removed = this.cars.pop()
    if (removed) this.world.tileMap.removeObject(this.options.vehicleLayer, removed.id)
  }

  /** A random road cell without a car on it or right next to it */
  private findFreeRoadCell(): { col: number; row: number } | undefined {
    const { columns, rows } = this.world.map
    const cells: Array<{ col: number; row: number }> = []
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        if (!this.isRoad(col, row)) continue
        const taken = this.cars.some(({ vehicle }) => {
          const p = vehiclePosition(vehicle)
          return Math.abs(p.col - (col + 0.5)) < 1 && Math.abs(p.row - (row + 0.5)) < 1
        })
        if (!taken) cells.push({ col, row })
      }
    }
    return cells[Math.floor(Math.random() * cells.length)]
  }

  private updateSky() {
    const night = Math.round(this.world.scene.night * 50) / 50
    if (night === this.skyNight) return
    this.skyNight = night
    const top = mix(SKY.day[0], SKY.night[0], night)
    const bottom = mix(SKY.day[1], SKY.night[1], night)
    this._game.$container.style.background = `linear-gradient(${top}, ${bottom})`
  }

  private get viewport() {
    return {
      width: this._game.$container.offsetWidth || window.innerWidth,
      height: this._game.$container.offsetHeight || window.innerHeight,
    }
  }

  /** Zoom out and center, so the whole airport is visible */
  private fitView() {
    const { tileMap, map } = this.world
    const projection = tileMap.projection
    const left = projection.mapGridToScreen(0, map.rows).x
    const right = projection.mapGridToScreen(map.columns, 0).x
    // the hotel and the tower stick out above the map
    const top = projection.mapGridToScreen(0, 0).y - 160
    const bottom = projection.mapGridToScreen(map.columns, map.rows).y + 20
    const { width, height } = this.viewport
    const zoom = Math.max(0.5, Math.min(1, width / (right - left), height / (bottom - top)))
    this._game.camera.zoom = zoom
    this._game.camera.offset = {
      x: ((left + right) / 2) * zoom - width / 2,
      y: ((top + bottom) / 2) * zoom - height / 2,
    }
  }

  /** Center the camera on a screen point of the world */
  private centerOnScreen(x: number, y: number) {
    const { zoom } = this._game.camera
    const { width, height } = this.viewport
    this._game.camera.offset = { x: x * zoom - width / 2, y: y * zoom - height / 2 }
  }

  private planeScreenPoint(flight: Flight) {
    const screen = this.world.tileMap.projection.mapGridToScreen(
      flight.position.col,
      flight.position.row,
    )
    return { x: screen.x, y: screen.y - flight.altitude }
  }

  private followSelected() {
    const flight = this.traffic.flights.find((f) => f.id === this.selectedFlight)
    if (!flight) return
    const { x, y } = this.planeScreenPoint(flight)
    this.centerOnScreen(x, y)
  }

  private selectPlace(place: Building | Prop | undefined) {
    this.selectedPlace = place
    this.selectedFlight = undefined
    this.following = false
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

  private selectFlight(id: number | undefined) {
    this.selectPlace(undefined)
    this.selectedFlight = id
    this.updateHud()
  }

  private handleKeyDown(e: KeyboardEvent) {
    const { scene } = this.world
    if (e.key === '+' || e.key === '=') this.addCar()
    else if (e.key === '-') this.removeCar()
    else if (e.code === 'Space') this.paused = !this.paused
    else if (e.key === 'n' || e.key === 'N') scene.hours = scene.night > 0.5 ? 12 : 22
    else if ((e.key === 'f' || e.key === 'F') && this.selectedFlight)
      this.following = !this.following
    else if (e.key === 'Escape') this.selectPlace(undefined)
    else return
    this.updateHud()
  }

  private handleMouseDown(e: MouseEvent) {
    // ignore clicks on the panels
    if ((e.target as HTMLElement | null)?.closest?.('.isoairport-panel')) return

    // screen → world: the TileMapSystem draws with translate(-offset), then scale(zoom)
    const rect = this._game.$container.getBoundingClientRect()
    const { offset, zoom } = this._game.camera
    const worldX = (e.clientX - rect.left + offset.x) / zoom
    const worldY = (e.clientY - rect.top + offset.y) / zoom

    // planes first: they are picked where they are drawn, also up in the air
    let closest: Flight | undefined
    let best = 30
    for (const flight of this.traffic.flights) {
      const { x, y } = this.planeScreenPoint(flight)
      const d = Math.hypot(x - worldX, y - 6 - worldY)
      if (d < best) {
        best = d
        closest = flight
      }
    }
    if (closest) return this.selectFlight(closest.id)

    const { col, row } = this.world.tileMap.projection.mapScreenToGrid(worldX, worldY)
    this.selectPlace(placeAt(this.world.map, col, row))
  }

  private createPanel(position: string): HTMLDivElement {
    const $panel = document.createElement('div')
    $panel.className = 'isoairport-panel'
    $panel.style.cssText =
      `position:absolute;${position};z-index:10;padding:8px 12px;` +
      'background:rgba(12,22,40,0.85);color:#e8eef5;font:12px/1.5 Arial;border-radius:6px;' +
      'border:1px solid rgba(253,216,53,0.45)'
    this._game.$container.appendChild($panel)
    return $panel
  }

  /** The flight board: every flight with its status, click one to select it */
  private renderBoard() {
    if (!this.$board) return
    const order = [
      'approach',
      'landing',
      'taxiIn',
      'atGate',
      'pushback',
      'taxiOut',
      'holding',
      'lineup',
      'takeoff',
    ]
    const flights = [...this.traffic.flights].sort(
      (a, b) => order.indexOf(a.phase) - order.indexOf(b.phase) || a.id - b.id,
    )
    const rows = flights
      .map((f) => {
        const selected = f.id === this.selectedFlight
        const place = isArriving(f) ? `from ${f.origin}` : `to ${f.destination}`
        return (
          `<tr data-flight="${f.id}" style="cursor:pointer;${selected ? 'color:#fdd835' : ''}">` +
          `<td style="padding-right:8px;font-family:monospace;color:${selected ? '#fdd835' : '#ffe082'}">${f.code}</td>` +
          `<td style="padding-right:8px">${place}</td>` +
          `<td style="opacity:0.8">${flightStatus(f)}</td></tr>`
        )
      })
      .join('')
    this.$board.innerHTML =
      '<b style="color:#fdd835">FLIGHTS</b>' +
      ` <span style="opacity:0.6">· ${this.traffic.arrivals} landed · ${this.traffic.departures} departed</span>` +
      `<table style="border-collapse:collapse;margin-top:4px;width:100%">${rows}</table>`
    this.$board.querySelectorAll<HTMLTableRowElement>('tr[data-flight]').forEach(($row) => {
      $row.onclick = () => {
        const id = Number($row.dataset.flight)
        this.selectFlight(id)
        this.following = true
        this.followSelected()
        this.updateHud()
      }
    })
  }

  private updateHud() {
    if (!this.$hud || !this.$info) return
    const { scene } = this.world
    const icon = scene.night > 0.5 ? '🌙' : '☀️'
    const state = this.paused ? ' <span style="color:#fdd835">(paused)</span>' : ''
    this.$hud.innerHTML =
      `<b style="color:#fdd835">ISO INTERNATIONAL</b> · ${icon} ${formatClock(scene.hours)}${state}` +
      ` · ${this.traffic.flights.length} flights · ${this.cars.length} cars<br>` +
      '<span style="opacity:0.7">click a plane or building · F follow plane · N day / night · ' +
      '+ / − cars · space pause · WASD / wheel pan · ctrl+wheel zoom</span>'

    const flight = this.traffic.flights.find((f) => f.id === this.selectedFlight)
    const place = this.selectedPlace
    this.$info.style.display = flight || place ? 'block' : 'none'
    if (flight) {
      const type = {
        narrow: 'Narrow-body jet',
        wide: 'Wide-body jet',
        jumbo: 'Jumbo jet',
        regional: 'Turboprop',
      }[flight.type]
      this.$info.innerHTML =
        `<b style="color:#fdd835">${flight.code}</b> · ${flight.airline.name}<br>` +
        `${type}, ${flight.origin} → ${flight.destination}<br>` +
        `${flightStatus(flight)}` +
        (flight.altitude > 0 ? ` · ${Math.round(flight.altitude * 15)} ft` : '') +
        (flight.speed > 0 ? ` · ${Math.round(flight.speed * 40)} kt` : '') +
        `<br><span style="opacity:0.6">${this.following ? 'following · ' : 'F to follow · '}esc to close</span>`
    } else if (place) {
      this.$info.innerHTML =
        `<b style="color:#fdd835">${place.name}</b><br>${place.fact}<br>` +
        `<span style="opacity:0.6">cell ${place.col}, ${place.row} · esc to close</span>`
    }
  }
}
