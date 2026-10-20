import type { IGame, IGameSystem, ITileMap } from '../../../lib/game.types'
import { AbstractGameSystem } from '../../../lib'
import { IsoCityVehicleComponent } from './IsoCityVehicleComponent.ts'
import {
  createVehicle,
  stepTraffic,
  vehiclePosition,
  type RoadMap,
  type Vehicle,
} from './isocity.traffic.ts'

export type IsoCitySystemOptions = {
  vehicleLayer: number
  isRoad: RoadMap
  /** Vehicles at the start, every 6th one is a bus */
  vehicles?: number
  maxVehicles?: number
}

const CAR_COLORS = [
  '#e53935',
  '#1e88e5',
  '#fdd835',
  '#43a047',
  '#fafafa',
  '#212121',
  '#8e24aa',
  '#fb8c00',
]
const BUS_COLOR = '#fbc02d'

/**
 * Drives the traffic: moves the vehicles along the roads and keeps their components in sync.
 * Keys: + adds a vehicle, - removes one, space pauses the traffic.
 */
export class IsoCitySystem extends AbstractGameSystem implements IGameSystem {
  public name = 'IsoCitySystem'

  private readonly tileMap: ITileMap
  private readonly options: Required<IsoCitySystemOptions>
  private readonly vehicles: Array<{
    vehicle: Vehicle
    component: IsoCityVehicleComponent
    id: number
  }> = []
  private nextId = 1
  private paused = false
  private $hud?: HTMLDivElement

  constructor(game: IGame, tileMap: ITileMap, options: IsoCitySystemOptions) {
    super(game)
    this.tileMap = tileMap
    this.options = { vehicles: 16, maxVehicles: 60, ...options }
    this.handleKeyDown = this.handleKeyDown.bind(this)
  }

  public onLoad() {
    for (let i = 0; i < this.options.vehicles; i++) this.addVehicle()
  }

  public start() {
    this._game.eventbus.on('keyboard.keydown', this.handleKeyDown)
    this.$hud = document.createElement('div')
    this.$hud.id = 'isocityHud'
    this.$hud.style.cssText =
      'position:absolute;left:10px;bottom:10px;z-index:10;padding:6px 10px;' +
      'background:rgba(0,0,0,0.5);color:white;font:12px Arial;border-radius:4px'
    this._game.$container.appendChild(this.$hud)
    this.updateHud()
  }

  public stop() {
    this._game.eventbus.off('keyboard.keydown', this.handleKeyDown)
    this.$hud?.remove()
  }

  public async tick(deltaTime: number) {
    if (!this.paused) {
      // cap the step, so a long frame (e.g. a background tab) doesn't teleport the vehicles
      const seconds = Math.min(deltaTime, 100) / 1000
      stepTraffic(
        this.vehicles.map((v) => v.vehicle),
        this.options.isRoad,
        seconds,
        Math.random,
      )
    }
    this.vehicles.forEach(({ vehicle, component }) => this.syncComponent(vehicle, component))
  }

  private syncComponent(vehicle: Vehicle, component: IsoCityVehicleComponent) {
    // the component sits at the top corner of a cell centered on the vehicle, like the buildings
    const p = vehiclePosition(vehicle)
    const screen = this.tileMap.projection.mapGridToScreen(p.col - 0.5, p.row - 0.5)
    component.setPosition(screen.x, screen.y)
    component.properties.direction = vehicle.direction
  }

  private addVehicle() {
    if (this.vehicles.length >= this.options.maxVehicles) return
    const cell = this.findFreeRoadCell()
    if (!cell) return

    const id = this.nextId++
    const isBus = id % 6 === 0
    const vehicle = createVehicle(id, this.options.isRoad, cell.col, cell.row, Math.random, {
      kind: isBus ? 'bus' : 'car',
      color: isBus ? BUS_COLOR : CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
      speed: isBus ? 1 : 1.3 + Math.random() * 0.7,
    })
    const component = new IsoCityVehicleComponent({
      tileSize: this.tileMap.tileWidth,
      kind: vehicle.kind,
      color: vehicle.color,
      direction: vehicle.direction,
    })
    const componentId = this.tileMap.addObjectAtGridPos(
      this.options.vehicleLayer,
      cell.col,
      cell.row,
      component,
    )
    this.syncComponent(vehicle, component)
    this.vehicles.push({ vehicle, component, id: componentId })
  }

  private removeVehicle() {
    const removed = this.vehicles.pop()
    if (removed) this.tileMap.removeObject(this.options.vehicleLayer, removed.id)
  }

  /** A random road cell without a vehicle on it or right next to it */
  private findFreeRoadCell(): { col: number; row: number } | undefined {
    const cells: Array<{ col: number; row: number }> = []
    for (let row = 0; row < this.tileMap.rows; row++) {
      for (let col = 0; col < this.tileMap.columns; col++) {
        if (!this.options.isRoad(col, row)) continue
        const taken = this.vehicles.some(({ vehicle }) => {
          const p = vehiclePosition(vehicle)
          return Math.abs(p.col - (col + 0.5)) < 1 && Math.abs(p.row - (row + 0.5)) < 1
        })
        if (!taken) cells.push({ col, row })
      }
    }
    return cells[Math.floor(Math.random() * cells.length)]
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === '+' || e.key === '=') this.addVehicle()
    else if (e.key === '-') this.removeVehicle()
    else if (e.code === 'Space') this.paused = !this.paused
    else return
    this.updateHud()
  }

  private updateHud() {
    if (!this.$hud) return
    const state = this.paused ? ' (paused)' : ''
    this.$hud.innerHTML =
      `${this.vehicles.length} vehicles${state}<br>` +
      '+ / − add or remove · space pause · WASD / wheel pan · ctrl+wheel zoom'
  }
}
