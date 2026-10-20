import type { IGame, IGameSystem } from '../../../lib/game.types'
import { AbstractGameSystem } from '../../../lib'
import { IsoSoccerBallComponent } from './IsoSoccerBallComponent.ts'
import { IsoSoccerPlayerComponent } from './IsoSoccerPlayerComponent.ts'
import { noise } from './isosoccer.draw.ts'
import {
  createMatch,
  matchMinute,
  stepMatch,
  TEAM_NAMES,
  type Control,
  type Match,
  type Vec,
} from './isosoccer.match.ts'
import { MAP_COLUMNS, MAP_ROWS, MARGIN } from './isosoccer.stadium.ts'
import type { SoccerWorld } from './isosoccer.world.ts'

export type IsoSoccerSystemOptions = {
  moverLayer: number
}

const SKINS = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac']

/** Screen directions of the arrow keys, in grid cells: up on screen is towards smaller cols and rows */
const ARROWS: Record<string, Vec> = {
  ArrowUp: { x: -1, y: -1 },
  ArrowDown: { x: 1, y: 1 },
  ArrowLeft: { x: -1, y: 1 },
  ArrowRight: { x: 1, y: -1 },
}

const HUD_STYLE =
  'position:absolute;z-index:10;padding:6px 10px;background:rgba(0,0,0,0.6);color:white;' +
  'font:12px Arial;border-radius:4px;pointer-events:none'

/**
 * Runs the match: steps the simulation, reads the keyboard for the controlled player,
 * keeps the player and ball components in sync, moves the TV camera and draws the scoreboard.
 *
 * Arrow keys take over the red team (the player nearest to the ball), X passes, space shoots
 * (or tackles without the ball), Q switches player, C hands back to the computer, P pauses,
 * F toggles the TV camera.
 */
export class IsoSoccerSystem extends AbstractGameSystem implements IGameSystem {
  public name = 'IsoSoccerSystem'

  private readonly world: SoccerWorld
  private readonly options: IsoSoccerSystemOptions
  private match: Match = createMatch()
  private players: IsoSoccerPlayerComponent[] = []
  private ball?: IsoSoccerBallComponent
  private spin = 0

  /** null: the computer plays both teams */
  private controlled: number | null = null
  private human = false
  private readonly keys = new Set<string>()
  private action: Control['action'] = null
  private lastOwner: number | null = null
  private lastScore = 0
  private paused = false
  private follow = true
  private hudTimer = 0
  private previousBackground = ''
  private $score?: HTMLDivElement
  private $help?: HTMLDivElement
  private $log?: HTMLDivElement

  constructor(game: IGame, world: SoccerWorld, options: IsoSoccerSystemOptions) {
    super(game)
    this.world = world
    this.options = options
    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.handleKeyUp = this.handleKeyUp.bind(this)
  }

  public onLoad() {
    const { tileMap } = this.world
    for (const p of this.match.players) {
      const component = new IsoSoccerPlayerComponent({
        tileSize: tileMap.tileWidth,
        team: p.team,
        number: p.number,
        keeper: p.role === 'GK',
        facing: p.facing,
        stride: 0,
        selected: false,
        skin: SKINS[Math.floor(noise(p.id, p.number, 5) * SKINS.length)],
      })
      tileMap.addObjectAtGridPos(this.options.moverLayer, 0, 0, component)
      this.players.push(component)
    }
    this.ball = new IsoSoccerBallComponent({ tileSize: tileMap.tileWidth, z: 0, spin: 0 })
    tileMap.addObjectAtGridPos(this.options.moverLayer, 0, 0, this.ball)
    this.sync()
  }

  public start() {
    this._game.eventbus.on('keyboard.keydown', this.handleKeyDown)
    this._game.eventbus.on('keyboard.keyup', this.handleKeyUp)
    const $container = this._game.$container
    this.previousBackground = $container.style.background
    $container.style.background = 'radial-gradient(ellipse at 50% 40%, #2f4a37, #121c16)'

    this.$score = this.panel(
      'isosoccerScore',
      'left:50%;top:10px;transform:translateX(-50%);font-size:15px;text-align:center',
    )
    this.$help = this.panel('isosoccerHelp', 'left:10px;bottom:10px;line-height:1.5')
    this.$log = this.panel('isosoccerLog', 'right:10px;top:10px;min-width:180px;line-height:1.5')

    this.camera(1, 1)
    this.updateHud()
  }

  public stop() {
    this._game.eventbus.off('keyboard.keydown', this.handleKeyDown)
    this._game.eventbus.off('keyboard.keyup', this.handleKeyUp)
    this._game.$container.style.background = this.previousBackground
    this.$score?.remove()
    this.$help?.remove()
    this.$log?.remove()
  }

  public async tick(deltaTime: number) {
    // cap the step, so a long frame (e.g. a background tab) doesn't teleport the players
    const seconds = Math.min(deltaTime, 100) / 1000
    const { scene } = this.world
    scene.time += seconds
    scene.cheer = Math.max(0, scene.cheer - seconds * 0.25)

    if (!this.paused && seconds > 0) {
      this.chooseControlled()
      // two half steps keep fast balls from skipping past the players
      const control = this.control()
      stepMatch(this.match, seconds / 2, Math.random, control)
      stepMatch(this.match, seconds / 2, Math.random, control && { ...control, action: null })
      this.action = null
      const goals = this.match.score[0] + this.match.score[1]
      if (goals > this.lastScore) scene.cheer = 1
      this.lastScore = goals
    }
    this.sync()
    if (this.follow) this.camera(Math.min(1, seconds * 2.5), this._game.camera.zoom)

    this.hudTimer -= seconds
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.25
      this.updateHud()
    }
  }

  /** The player at the keyboard plays the red player with the ball, or the one closest to it */
  private chooseControlled() {
    if (!this.human) {
      this.controlled = null
      return
    }
    const { ball, players, receiver } = this.match
    const owner = ball.owner === null ? null : players[ball.owner]
    if (owner && owner.team === 0) this.controlled = owner.id
    else if (receiver !== null && players[receiver].team === 0) this.controlled = receiver
    else if (this.controlled === null || this.lastOwner !== ball.owner)
      this.controlled = this.nearestToBall()
    this.lastOwner = ball.owner
  }

  private nearestToBall(): number {
    const { ball, players } = this.match
    let best = players.find((p) => p.team === 0 && p.role !== 'GK')!
    for (const p of players) {
      if (p.team !== 0 || p.role === 'GK') continue
      if (Math.hypot(p.x - ball.x, p.y - ball.y) < Math.hypot(best.x - ball.x, best.y - ball.y))
        best = p
    }
    return best.id
  }

  private control(): Control | null {
    if (this.controlled === null) return null
    const move = { x: 0, y: 0 }
    for (const key of this.keys) {
      move.x += ARROWS[key].x
      move.y += ARROWS[key].y
    }
    return { playerId: this.controlled, move, action: this.action }
  }

  /** Copy the match state to the components */
  private sync() {
    const { tileMap } = this.world
    const projection = tileMap.projection
    this.match.players.forEach((p, i) => {
      const component = this.players[i]
      // the top corner of a cell centered on the player, like the buildings
      const screen = projection.mapGridToScreen(MARGIN + p.x - 0.5, MARGIN + p.y - 0.5)
      component.setPosition(screen.x, screen.y)
      component.properties.facing = p.facing
      component.properties.stride = p.stride
      component.properties.selected = p.id === this.controlled
    })
    if (this.ball) {
      const { ball } = this.match
      const screen = projection.mapGridToScreen(MARGIN + ball.x - 0.5, MARGIN + ball.y - 0.5)
      // a little in front of whoever has it, so it sorts after the player
      this.ball.setPosition(screen.x, screen.y + 0.01)
      this.spin += Math.hypot(ball.vx, ball.vy) * 0.016
      this.ball.properties.z = ball.z
      this.ball.properties.spin = this.spin
    }
  }

  /**
   * Move the camera towards the ball (`t` = 1 jumps there), like a TV camera that doesn't follow every touch.
   * Without follow mode the whole stadium is shown.
   */
  private camera(t: number, zoom: number) {
    const projection = this.world.tileMap.projection
    const width = this._game.$container.offsetWidth || window.innerWidth
    const height = this._game.$container.offsetHeight || window.innerHeight
    if (!this.follow) {
      const left = projection.mapGridToScreen(0, MAP_ROWS).x
      const right = projection.mapGridToScreen(MAP_COLUMNS, 0).x
      const top = projection.mapGridToScreen(0, 0).y - 160
      const bottom = projection.mapGridToScreen(MAP_COLUMNS, MAP_ROWS).y
      const fit = Math.max(0.3, Math.min(1, width / (right - left), height / (bottom - top)))
      this._game.camera.zoom = fit
      this._game.camera.offset = {
        x: ((left + right) / 2) * fit - width / 2,
        y: ((top + bottom) / 2) * fit - height / 2,
      }
      return
    }
    const { ball } = this.match
    const focus = projection.mapGridToScreen(MARGIN + ball.x, MARGIN + ball.y)
    const target = { x: focus.x * zoom - width / 2, y: (focus.y - 20) * zoom - height / 2 }
    const offset = this._game.camera.offset
    this._game.camera.zoom = zoom
    this._game.camera.offset = {
      x: offset.x + (target.x - offset.x) * t,
      y: offset.y + (target.y - offset.y) * t,
    }
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (ARROWS[e.key]) {
      // keep the page from scrolling
      e.preventDefault()
      this.keys.add(e.key)
      if (!this.human) {
        this.human = true
        this.controlled = null
      }
    } else if (e.code === 'Space') {
      e.preventDefault()
      this.action = 'shoot'
    } else if (e.code === 'KeyX') this.action = 'pass'
    else if (e.code === 'KeyQ' && this.human) this.controlled = this.nearestToBall()
    else if (e.code === 'KeyC') this.human = false
    else if (e.code === 'KeyP') this.paused = !this.paused
    else if (e.code === 'KeyF') {
      this.follow = !this.follow
      if (this.follow) this._game.camera.zoom = 1
      this.camera(1, 1)
    } else if (e.code === 'KeyR') {
      this.match = createMatch()
      this.lastScore = 0
    } else return
    this.updateHud()
  }

  private handleKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.key)
  }

  private panel(id: string, css: string) {
    const $panel = document.createElement('div')
    $panel.id = id
    $panel.style.cssText = HUD_STYLE + ';' + css
    this._game.$container.appendChild($panel)
    return $panel
  }

  private updateHud() {
    const { match } = this
    if (this.$score) {
      const phase = {
        kickoff: 'Kickoff',
        play: '',
        restart: match.restartKind.replace(/^./, (c) => c.toUpperCase()),
        goal: '<b style="color:#ffeb3b">GOAL!</b>',
        fulltime: 'Full time',
      }[match.phase]
      const paused = this.paused ? ' · <span style="color:#ffca28">paused</span>' : ''
      this.$score.innerHTML =
        `<span style="color:#ff6b6b">●</span> <b>${TEAM_NAMES[0]}</b> ` +
        `<b style="font-size:20px;padding:0 8px">${match.score[0]} : ${match.score[1]}</b> ` +
        `<b>${TEAM_NAMES[1]}</b> <span style="color:#6b9bff">●</span><br>` +
        `<span style="opacity:0.8">${matchMinute(match)}'${phase ? ' · ' + phase : ''}${paused}</span>`
    }
    if (this.$help) {
      const mode = this.human
        ? `You play <b style="color:#ff6b6b">${TEAM_NAMES[0]}</b>: arrows run · X pass · space shoot / tackle · Q switch · C computer`
        : `Computer vs computer · press an <b>arrow key</b> to play <b style="color:#ff6b6b">${TEAM_NAMES[0]}</b>`
      const { shots, passes, completed } = match.stats
      this.$help.innerHTML =
        `${mode}<br>` +
        `P pause · R restart · F ${this.follow ? 'whole stadium' : 'TV camera'} · ` +
        `${this.follow ? '' : 'WASD / wheel pan · '}ctrl+wheel zoom<br>` +
        `<span style="opacity:0.75">shots ${shots[0]}–${shots[1]} · passes ${completed[0]}/${passes[0]} – ${completed[1]}/${passes[1]}</span>`
    }
    if (this.$log) {
      this.$log.innerHTML = match.log.length
        ? match.log.map((line) => `<div>${line}</div>`).join('')
        : '<span style="opacity:0.7">Match report</span>'
    }
  }
}
