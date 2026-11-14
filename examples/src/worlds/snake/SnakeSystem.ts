import type {
  IGame,
  IGameComponent,
  IGameSystem,
  ITileMap,
  MoveDirection,
} from '@fmlabs/hieronymus'
import { AbstractGameSystem } from '@fmlabs/hieronymus'
import { createSnakeState, queueDirection, stepSnake, type SnakeState } from './snake.logic.ts'

export type SnakeCellKind = 'head' | 'body' | 'food'

/** A component that renders one snake segment or the food; the system keeps these properties up to date. */
export type SnakeCell = IGameComponent & {
  properties: { kind: SnakeCellKind; color?: string; direction?: MoveDirection }
}

export type SnakeSystemOptions = {
  foodLayer: number
  snakeLayer: number
  createCell: (kind: SnakeCellKind, color: string) => SnakeCell
  highScoreKey?: string
  initialStepMs?: number
  minStepMs?: number
  speedupPerFoodMs?: number
}

const KEY_DIRECTIONS: Record<string, MoveDirection> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
}

// skip huge catch-up bursts, e.g. after the tab was in the background
const MAX_DELTA_MS = 250

const HEAD_COLOR = '#cddc39'
const BODY_COLOR = '#8bc34a'
const FOOD_COLOR = '#ff5252'

/**
 * Runs the snake game: fixed-step movement, keyboard control, and syncing the game state
 * into components on the tile map, which the TileMapSystem then draws.
 */
export class SnakeSystem extends AbstractGameSystem implements IGameSystem {
  public name = 'SnakeSystem'

  private readonly tileMap: ITileMap
  private readonly options: Required<SnakeSystemOptions>
  private readonly hud: HTMLDivElement

  private state: SnakeState
  private accumulator = 0
  private highScore = 0

  private segmentIds: number[] = []
  private foodId: number | null = null

  constructor(game: IGame, tileMap: ITileMap, options: SnakeSystemOptions) {
    super(game)
    this.tileMap = tileMap
    this.options = {
      highScoreKey: 'world.snake.highscore',
      initialStepMs: 150,
      minStepMs: 60,
      speedupPerFoodMs: 3,
      ...options,
    }
    this.state = createSnakeState(tileMap.columns, tileMap.rows)

    this.hud = document.createElement('div')
    this.hud.id = 'snakeHud'
    Object.assign(this.hud.style, {
      position: 'absolute',
      top: '12px',
      left: '0',
      right: '0',
      textAlign: 'center',
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#e8f5e9',
      pointerEvents: 'none',
      zIndex: '1000',
    })

    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.handleResize = this.handleResize.bind(this)
  }

  public onLoad() {
    this.highScore = loadHighScore(this.options.highScoreKey)
    this._game.$container.appendChild(this.hud)
    // subscribe early: the InputSystem fires the initial resize when it starts
    this._game.eventbus.on('resize', this.handleResize)
  }

  public onUnload() {
    this._game.eventbus.off('resize', this.handleResize)
    this.hud.remove()
  }

  public start() {
    this._game.eventbus.on('keyboard.keydown', this.handleKeyDown)
    this.centerBoard(this._game.width, this._game.height)
    this.syncComponents()
    this.renderHud()
  }

  public stop() {
    this._game.eventbus.off('keyboard.keydown', this.handleKeyDown)
  }

  public async tick(deltaTime: number) {
    if (this.state.status !== 'running') return

    this.accumulator += Math.min(deltaTime, MAX_DELTA_MS)
    let changed = false
    while (this.state.status === 'running' && this.accumulator >= this.stepMs()) {
      this.accumulator -= this.stepMs()
      const result = stepSnake(this.state)
      changed = true
      if (result === 'died' || result === 'won') this.onGameEnd()
    }

    if (changed) {
      this.syncComponents()
      this.renderHud()
    }
  }

  private stepMs(): number {
    const { initialStepMs, minStepMs, speedupPerFoodMs } = this.options
    return Math.max(minStepMs, initialStepMs - this.state.score * speedupPerFoodMs)
  }

  private handleKeyDown(e: KeyboardEvent) {
    const direction = KEY_DIRECTIONS[e.code]
    if (direction) {
      e.preventDefault()
      if (this.state.status === 'ready') this.state.status = 'running'
      if (this.state.status === 'running') queueDirection(this.state, direction)
      this.renderHud()
      return
    }

    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault()
      switch (this.state.status) {
        case 'ready':
          this.state.status = 'running'
          break
        case 'running':
          this.state.status = 'paused'
          break
        case 'paused':
          this.state.status = 'running'
          break
        case 'gameover':
        case 'won':
          this.restart()
          break
      }
      this.renderHud()
    } else if (e.code === 'KeyR') {
      this.restart()
      this.renderHud()
    }
  }

  private restart() {
    this.state = createSnakeState(this.tileMap.columns, this.tileMap.rows)
    this.accumulator = 0
    this.syncComponents()
  }

  private onGameEnd() {
    if (this.state.score > this.highScore) {
      this.highScore = this.state.score
      saveHighScore(this.options.highScoreKey, this.highScore)
    }
  }

  /**
   * Mirror the game state into components on the snake and food layers.
   * Segment components are reused; only the difference in length is added or removed.
   */
  private syncComponents() {
    const { snakeLayer, foodLayer, createCell } = this.options
    const snake = this.state.snake

    while (this.segmentIds.length < snake.length) {
      const segment = snake[this.segmentIds.length]
      const component = createCell('body', BODY_COLOR)
      this.segmentIds.push(
        this.tileMap.addObjectAtGridPos(snakeLayer, segment.col, segment.row, component),
      )
    }
    while (this.segmentIds.length > snake.length) {
      this.tileMap.removeObject(snakeLayer, this.segmentIds.pop()!)
    }

    snake.forEach((segment, idx) => {
      const component = this.tileMap.components.get(this.segmentIds[idx]) as SnakeCell
      const { x, y } = this.tileMap.projection.mapGridToScreen(segment.col, segment.row)
      component.setPosition(x, y)
      const isHead = idx === 0
      component.properties.kind = isHead ? 'head' : 'body'
      component.properties.color = isHead ? HEAD_COLOR : BODY_COLOR
      component.properties.direction = this.state.direction
    })

    const food = this.state.food
    if (food && this.foodId === null) {
      const component = createCell('food', FOOD_COLOR)
      this.foodId = this.tileMap.addObjectAtGridPos(foodLayer, food.col, food.row, component)
    } else if (food && this.foodId !== null) {
      const { x, y } = this.tileMap.projection.mapGridToScreen(food.col, food.row)
      this.tileMap.components.get(this.foodId)!.setPosition(x, y)
    } else if (!food && this.foodId !== null) {
      this.tileMap.removeObject(foodLayer, this.foodId)
      this.foodId = null
    }
  }

  private handleResize(event: { width: number; height: number }) {
    this.centerBoard(event.width, event.height)
  }

  /**
   * Scale the board down to fit the screen if needed and center it.
   * The bounds come from the projected board corners, so this works for any projection.
   */
  private centerBoard(width: number, height: number) {
    const { columns, rows, projection } = this.tileMap
    const corners = [
      projection.mapGridToScreen(0, 0),
      projection.mapGridToScreen(columns, 0),
      projection.mapGridToScreen(0, rows),
      projection.mapGridToScreen(columns, rows),
    ]
    const minX = Math.min(...corners.map((c) => c.x))
    const maxX = Math.max(...corners.map((c) => c.x))
    const minY = Math.min(...corners.map((c) => c.y))
    const maxY = Math.max(...corners.map((c) => c.y))
    const boardWidth = maxX - minX
    const boardHeight = maxY - minY

    const margin = 96
    const zoom = Math.max(
      0.25,
      Math.min(1, (width - margin) / boardWidth, (height - margin) / boardHeight),
    )
    // the TileMapSystem draws with translate(-offset) and then scale(zoom)
    this._game.camera.zoom = zoom
    this._game.camera.offset.x = minX * zoom - (width - boardWidth * zoom) / 2
    this._game.camera.offset.y = minY * zoom - (height - boardHeight * zoom) / 2
  }

  private renderHud() {
    const { score, status } = this.state
    let message = ''
    switch (status) {
      case 'ready':
        message = 'Press an arrow key or SPACE to start'
        break
      case 'paused':
        message = 'Paused – SPACE to resume'
        break
      case 'gameover':
        message = 'Game over – SPACE to play again'
        break
      case 'won':
        message = 'You win! – SPACE to play again'
        break
    }
    this.hud.innerHTML = `
<div>SCORE ${score} &nbsp; HIGH ${Math.max(score, this.highScore)}</div>
<div style="margin-top:6px;color:#cddc39">${message}</div>`
  }
}

function loadHighScore(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0
  } catch {
    return 0
  }
}

function saveHighScore(key: string, score: number) {
  try {
    localStorage.setItem(key, String(score))
  } catch {
    // ignore, the high score is a convenience only
  }
}
