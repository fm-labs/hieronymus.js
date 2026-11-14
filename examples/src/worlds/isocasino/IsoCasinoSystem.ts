import type { IGame, IGameSystem } from '@fmlabs/hieronymus'
import { AbstractGameSystem } from '@fmlabs/hieronymus'
import {
  createVehicle,
  DIRECTION_VECTORS,
  DIRECTIONS,
  stepTraffic,
  stepVehicle,
  vehiclePosition,
  type GridPoint,
  type Vehicle,
} from '../isocity/isocity.traffic.ts'
import { IsoCasinoGuestComponent } from './IsoCasinoGuestComponent.ts'
import type { IsoCasinoObjectComponent } from './IsoCasinoObjectComponent.ts'
import {
  holdPercent,
  isGaming,
  playRound,
  walkableMap,
  type FloorObject,
  type MachineStats,
} from './isocasino.floor.ts'
import type { CasinoWorld } from './isocasino.world.ts'

export type IsoCasinoSystemOptions = {
  guestLayer: number
  /** Guests at the start */
  guests?: number
  maxGuests?: number
  /** The chance that a guest passing a free machine or table sits down to play */
  playChance?: number
}

type Machine = {
  object: FloorObject
  component: IsoCasinoObjectComponent
  stats: MachineStats
  /** The guest playing, if any */
  guestId?: number
  jackpot?: number
}

type Guest = {
  vehicle: Vehicle
  component: IsoCasinoGuestComponent
  componentId: number
  /** The cell the guest arrived at last, to notice when it reaches the next one */
  cell: string
  /** Playing at a machine; `side` points from the guest towards the machine */
  playing?: { machine: Machine; secondsLeft: number; nextRound: number; side: GridPoint }
  /** How long the guest has been waiting behind others */
  stuckSeconds: number
  /** While > 0, the guest squeezes past the others instead of waiting */
  squeezeSeconds: number
}

const SHIRTS = [
  '#e53935',
  '#1e88e5',
  '#fdd835',
  '#43a047',
  '#fafafa',
  '#212121',
  '#8e24aa',
  '#fb8c00',
]
const SKINS = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac']
const ROUND_SECONDS = 1.5
/** Guests waiting this long squeeze past the others, so crowds at crossings never lock up */
const MAX_WAIT_SECONDS = 2
const SQUEEZE_SECONDS = 1
/** How far a playing guest steps aside towards the machine, in cells */
const STEP_ASIDE = 0.3
const JACKPOT_START = 25000
/** The share of each bet on a progressive slot that goes into its jackpot */
const JACKPOT_CONTRIBUTION = 0.5

const money = (value: number) =>
  `${value < 0 ? '−' : ''}$${Math.abs(Math.round(value)).toLocaleString('en-US')}`

const pickFrom = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)]

/**
 * Runs the casino floor: guests walk the aisles and sit down at free machines and tables to play,
 * every machine keeps its stats, and the floor manager panel shows the totals and the selected machine.
 *
 * Mouse: click a machine or table to select it. Keys: + / - add or remove a guest, space pauses.
 */
export class IsoCasinoSystem extends AbstractGameSystem implements IGameSystem {
  public name = 'IsoCasinoSystem'

  private readonly world: CasinoWorld
  private readonly options: Required<IsoCasinoSystemOptions>
  private readonly isWalkable: (col: number, row: number) => boolean
  /** Machines and tables by cell ('col,row') */
  private readonly machines = new Map<string, Machine>()
  private readonly guests: Guest[] = []
  private nextGuestId = 1
  private paused = false
  private selected?: FloorObject
  private hudTimer = 0
  private $hud?: HTMLDivElement
  private $info?: HTMLDivElement

  constructor(game: IGame, world: CasinoWorld, options: IsoCasinoSystemOptions) {
    super(game)
    this.world = world
    this.options = { guests: 30, maxGuests: 120, playChance: 0.35, ...options }
    this.isWalkable = walkableMap(world.plan.cells)
    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.handleMouseDown = this.handleMouseDown.bind(this)

    for (const object of world.plan.objects) {
      if (!isGaming(object)) continue
      const machine: Machine = {
        object,
        component: world.components.get(object.id)!,
        stats: { rounds: 0, coinIn: 0, coinOut: 0 },
      }
      if (object.type.kind === 'progressive') machine.jackpot = JACKPOT_START + Math.random() * 5000
      this.machines.set(`${object.col},${object.row}`, machine)
    }
  }

  public onLoad() {
    for (let i = 0; i < this.options.guests; i++) this.addGuest(false)
  }

  public start() {
    this._game.eventbus.on('keyboard.keydown', this.handleKeyDown)
    this._game.eventbus.on('mouse.mousedown', this.handleMouseDown)
    this.$hud = this.createPanel('top:10px')
    this.$info = this.createPanel('top:150px')
    this.updateHud()
  }

  public stop() {
    this._game.eventbus.off('keyboard.keydown', this.handleKeyDown)
    this._game.eventbus.off('mouse.mousedown', this.handleMouseDown)
    this.$hud?.remove()
    this.$info?.remove()
  }

  public async tick(deltaTime: number) {
    // cap the step, so a long frame (e.g. a background tab) doesn't teleport the guests
    const seconds = this.paused ? 0 : Math.min(deltaTime, 100) / 1000

    if (seconds > 0) {
      this.walk(seconds)
      this.guests.forEach((guest) => this.updateGuest(guest, seconds))
      this.machines.forEach((machine) => {
        if (machine.jackpot === undefined) return
        // the jackpot grows slowly by itself, and faster while someone is playing
        machine.jackpot += seconds * 2
        machine.component.properties.jackpot = machine.jackpot
      })
    }
    this.guests.forEach((guest) => this.syncGuest(guest))

    this.hudTimer -= deltaTime / 1000
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.5
      this.updateHud()
    }
  }

  /**
   * Move the walking guests. Playing guests have stepped aside and don't block anyone.
   * Guests keep their distance like the cars in 'isocity', but a guest waiting too long squeezes past:
   * in open areas a ring of guests could otherwise wait for each other forever.
   */
  private walk(seconds: number) {
    const walking = this.guests.filter((guest) => !guest.playing)
    const before = new Map(walking.map((guest) => [guest, this.progressKey(guest.vehicle)]))
    const squeezing = walking.filter((guest) => guest.squeezeSeconds > 0)
    stepTraffic(
      walking.filter((guest) => guest.squeezeSeconds <= 0).map((guest) => guest.vehicle),
      this.isWalkable,
      seconds,
      Math.random,
    )
    squeezing.forEach((guest) => {
      stepVehicle(guest.vehicle, this.isWalkable, seconds, Math.random)
      guest.squeezeSeconds -= seconds
    })
    for (const guest of walking) {
      if (squeezing.includes(guest)) continue
      const moved = before.get(guest) !== this.progressKey(guest.vehicle)
      guest.stuckSeconds = moved ? 0 : guest.stuckSeconds + seconds
      if (guest.stuckSeconds > MAX_WAIT_SECONDS) {
        guest.stuckSeconds = 0
        guest.squeezeSeconds = SQUEEZE_SECONDS
      }
    }
  }

  private progressKey(vehicle: Vehicle) {
    return `${vehicle.col},${vehicle.row},${vehicle.progress}`
  }

  private updateGuest(guest: Guest, seconds: number) {
    const { vehicle } = guest

    if (guest.playing) {
      const playing = guest.playing
      playing.secondsLeft -= seconds
      playing.nextRound -= seconds
      if (playing.nextRound <= 0) {
        playing.nextRound += ROUND_SECONDS
        this.playOneRound(playing.machine)
      }
      if (playing.secondsLeft <= 0) this.stopPlaying(guest)
      return
    }

    // just arrived at a new cell: maybe sit down at a free machine or table next to it
    const cell = `${vehicle.col},${vehicle.row}`
    if (cell === guest.cell) return
    guest.cell = cell
    if (Math.random() >= this.options.playChance) return
    const free = DIRECTIONS.map((d) => {
      const side = DIRECTION_VECTORS[d]
      const machine = this.machines.get(`${vehicle.col + side.col},${vehicle.row + side.row}`)
      return { machine, side }
    }).filter(
      (option): option is { machine: Machine; side: GridPoint } =>
        !!option.machine && option.machine.guestId === undefined,
    )
    if (free.length) {
      const { machine, side } = pickFrom(free)
      this.startPlaying(guest, machine, side)
    }
  }

  private startPlaying(guest: Guest, machine: Machine, side: GridPoint) {
    machine.guestId = guest.vehicle.id
    machine.component.properties.active = true
    const tables = machine.object.type.category === 'table'
    guest.playing = {
      machine,
      // tables keep guests longer than slots
      secondsLeft: (tables ? 10 : 5) + Math.random() * 10,
      nextRound: ROUND_SECONDS,
      side,
    }
  }

  private stopPlaying(guest: Guest) {
    if (!guest.playing) return
    const { machine } = guest.playing
    machine.guestId = undefined
    machine.component.properties.active = false
    guest.playing = undefined
    guest.stuckSeconds = 0
  }

  private playOneRound(machine: Machine) {
    const before = machine.stats.coinOut
    playRound(machine.stats, machine.object.type, Math.random)
    if (machine.jackpot === undefined) return
    machine.jackpot += (machine.object.type.bet ?? 0) * JACKPOT_CONTRIBUTION
    // a tiny chance to hit the progressive jackpot
    if (machine.stats.coinOut === before && Math.random() < 0.002) {
      machine.stats.coinOut += machine.jackpot
      machine.jackpot = JACKPOT_START
    }
  }

  private syncGuest(guest: Guest) {
    // like the machines, the component sits at the top corner of a cell centered on the guest
    const p = vehiclePosition(guest.vehicle)
    const side = guest.playing?.side ?? { col: 0, row: 0 }
    const screen = this.world.tileMap.projection.mapGridToScreen(
      p.col - 0.5 + side.col * STEP_ASIDE,
      p.row - 0.5 + side.row * STEP_ASIDE,
    )
    guest.component.setPosition(screen.x, screen.y)
  }

  /** Add a guest at the entrance, or (at the start) anywhere on the floor */
  private addGuest(atEntrance: boolean) {
    if (this.guests.length >= this.options.maxGuests) return
    const cell = this.findFreeCell(atEntrance)
    if (!cell) return

    const id = this.nextGuestId++
    const vehicle = createVehicle(id, this.isWalkable, cell.col, cell.row, Math.random, {
      kind: 'car',
      color: pickFrom(SHIRTS),
      speed: 0.8 + Math.random() * 0.5,
    })
    const component = new IsoCasinoGuestComponent({
      tileSize: this.world.tileMap.tileWidth,
      shirt: vehicle.color,
      skin: pickFrom(SKINS),
    })
    const componentId = this.world.tileMap.addObjectAtGridPos(
      this.options.guestLayer,
      cell.col,
      cell.row,
      component,
    )
    const guest: Guest = {
      vehicle,
      component,
      componentId,
      cell: `${cell.col},${cell.row}`,
      stuckSeconds: 0,
      squeezeSeconds: 0,
    }
    this.syncGuest(guest)
    this.guests.push(guest)
  }

  private removeGuest() {
    const guest = this.guests.pop()
    if (!guest) return
    this.stopPlaying(guest)
    this.world.tileMap.removeObject(this.options.guestLayer, guest.componentId)
  }

  /** A random walkable cell without a guest on it or right next to it */
  private findFreeCell(atEntrance: boolean): { col: number; row: number } | undefined {
    const { columns, rows } = this.world.plan
    const cells: Array<{ col: number; row: number }> = []
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        if (!this.isWalkable(col, row)) continue
        // the entrance is the opening in the front wall
        if (atEntrance && row !== rows - 1) continue
        const taken = this.guests.some(({ vehicle }) => {
          const p = vehiclePosition(vehicle)
          return Math.abs(p.col - (col + 0.5)) < 1 && Math.abs(p.row - (row + 0.5)) < 1
        })
        if (!taken) cells.push({ col, row })
      }
    }
    return cells.length ? pickFrom(cells) : undefined
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === '+' || e.key === '=') this.addGuest(true)
    else if (e.key === '-') this.removeGuest()
    else if (e.code === 'Space') this.paused = !this.paused
    else return
    this.updateHud()
  }

  private handleMouseDown(e: MouseEvent) {
    // ignore clicks on the panels
    if ((e.target as HTMLElement | null)?.closest?.('.isocasino-panel')) return

    // screen → world: the TileMapSystem draws with translate(-offset), then scale(zoom)
    const rect = this._game.$container.getBoundingClientRect()
    const { offset, zoom } = this._game.camera
    const worldX = (e.clientX - rect.left + offset.x) / zoom
    const worldY = (e.clientY - rect.top + offset.y) / zoom
    const { col, row } = this.world.tileMap.projection.mapScreenToGrid(worldX, worldY)

    this.selected = this.world.plan.objects.find((o) => o.col === col && o.row === row)
    const selection = this.world.selection
    selection.properties.visible = !!this.selected
    if (this.selected) {
      const screen = this.world.tileMap.projection.mapGridToScreen(col, row)
      selection.setPosition(screen.x, screen.y)
    }
    this.updateHud()
  }

  private createPanel(position: string): HTMLDivElement {
    const $panel = document.createElement('div')
    $panel.className = 'isocasino-panel'
    $panel.style.cssText =
      `position:absolute;right:10px;${position};z-index:10;width:240px;padding:8px 12px;` +
      'background:rgba(20,12,24,0.82);color:#f5e9d0;font:12px/1.5 Arial;border-radius:6px;' +
      'border:1px solid rgba(212,175,55,0.5)'
    this._game.$container.appendChild($panel)
    return $panel
  }

  private updateHud() {
    if (!this.$hud || !this.$info) return
    const machines = [...this.machines.values()]
    const inUse = machines.filter((m) => m.guestId !== undefined).length
    const coinIn = machines.reduce((sum, m) => sum + m.stats.coinIn, 0)
    const coinOut = machines.reduce((sum, m) => sum + m.stats.coinOut, 0)
    const state = this.paused ? ' <span style="color:#ffca28">(paused)</span>' : ''

    this.$hud.innerHTML =
      `<b style="color:#d4af37">FLOOR MANAGER</b>${state}<br>` +
      `Guests: ${this.guests.length} · playing: ${inUse}<br>` +
      `Machines & tables in use: ${inUse} / ${machines.length}<br>` +
      `Coin in: ${money(coinIn)} · paid out: ${money(coinOut)}<br>` +
      `House win: <b>${money(coinIn - coinOut)}</b><br>` +
      '<span style="opacity:0.7">click a machine · + / − guests · space pause<br>' +
      'WASD / wheel pan · ctrl+wheel zoom</span>'

    const object = this.selected
    this.$info.style.display = object ? 'block' : 'none'
    if (!object) return
    const machine = this.machines.get(`${object.col},${object.row}`)
    let details = ''
    if (machine) {
      const { stats } = machine
      const status =
        machine.guestId !== undefined ? '<span style="color:#69f0ae">in use</span>' : 'idle'
      details =
        `Status: ${status}<br>` +
        `Bet: ${money(object.type.bet ?? 0)} · house edge ${((object.type.houseEdge ?? 0) * 100).toFixed(1)}%<br>` +
        `Rounds: ${stats.rounds}<br>` +
        `Coin in: ${money(stats.coinIn)} · out: ${money(stats.coinOut)}<br>` +
        `Hold: ${holdPercent(stats).toFixed(1)}%` +
        (machine.jackpot !== undefined
          ? `<br>Jackpot: <b style="color:#ffd600">${money(machine.jackpot)}</b>`
          : '')
    } else {
      details = 'Inventory'
    }
    this.$info.innerHTML =
      `<b style="color:#d4af37">${object.id}</b> · ${object.type.label}<br>` +
      `<span style="opacity:0.7">${object.room} · cell ${object.col}, ${object.row}</span><br>${details}`
  }
}
