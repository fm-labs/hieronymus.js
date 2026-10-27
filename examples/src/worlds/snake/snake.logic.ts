import type { Grid2DPosition, MoveDirection } from '@fmlabs/world'

/**
 * Pure snake game rules, independent of the engine (no rendering, no input, no timing).
 */

export type SnakeStatus = 'ready' | 'running' | 'paused' | 'gameover' | 'won'

export type SnakeState = {
  columns: number
  rows: number
  snake: Grid2DPosition[] // head first
  direction: MoveDirection
  // queued direction changes, applied one per step (allows quick double turns)
  directionQueue: MoveDirection[]
  food: Grid2DPosition | null
  score: number
  status: SnakeStatus
}

export type StepResult = 'moved' | 'ate' | 'died' | 'won' | 'idle'

export type RandomFn = () => number

const DIRECTION_VECTORS: Record<MoveDirection, Grid2DPosition> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
}

const OPPOSITE: Record<MoveDirection, MoveDirection> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

const MAX_QUEUED_DIRECTIONS = 2

export const INITIAL_LENGTH = 3

export function createSnakeState(
  columns: number,
  rows: number,
  random: RandomFn = Math.random,
): SnakeState {
  const headCol = Math.floor(columns / 2)
  const row = Math.floor(rows / 2)
  const snake: Grid2DPosition[] = []
  for (let i = 0; i < INITIAL_LENGTH; i++) {
    snake.push({ col: headCol - i, row })
  }

  const state: SnakeState = {
    columns,
    rows,
    snake,
    direction: 'right',
    directionQueue: [],
    food: null,
    score: 0,
    status: 'ready',
  }
  state.food = placeFood(state, random)
  return state
}

/**
 * Queue a direction change. Reversing into the snake's own neck and repeating the
 * current direction are ignored.
 */
export function queueDirection(state: SnakeState, direction: MoveDirection): void {
  const last = state.directionQueue[state.directionQueue.length - 1] ?? state.direction
  if (direction === last || direction === OPPOSITE[last]) return
  if (state.directionQueue.length >= MAX_QUEUED_DIRECTIONS) return
  state.directionQueue.push(direction)
}

/**
 * Advance the game by one step. Mutates the state.
 */
export function stepSnake(state: SnakeState, random: RandomFn = Math.random): StepResult {
  if (state.status !== 'running') return 'idle'

  const nextDirection = state.directionQueue.shift()
  if (nextDirection) state.direction = nextDirection

  const head = state.snake[0]
  const vector = DIRECTION_VECTORS[state.direction]
  const newHead = { col: head.col + vector.col, row: head.row + vector.row }

  // walls
  if (
    newHead.col < 0 ||
    newHead.row < 0 ||
    newHead.col >= state.columns ||
    newHead.row >= state.rows
  ) {
    state.status = 'gameover'
    return 'died'
  }

  const eats = !!state.food && samePos(newHead, state.food)

  // the tail moves away this step unless the snake grows, so it is not an obstacle
  const body = eats ? state.snake : state.snake.slice(0, -1)
  if (body.some((segment) => samePos(segment, newHead))) {
    state.status = 'gameover'
    return 'died'
  }

  state.snake.unshift(newHead)
  if (!eats) {
    state.snake.pop()
    return 'moved'
  }

  state.score++
  state.food = placeFood(state, random)
  if (!state.food) {
    state.status = 'won'
    return 'won'
  }
  return 'ate'
}

/**
 * Pick a random free cell for the food, or null if the board is full.
 */
export function placeFood(
  state: SnakeState,
  random: RandomFn = Math.random,
): Grid2DPosition | null {
  const occupied = new Set(state.snake.map((s) => s.row * state.columns + s.col))
  const free: Grid2DPosition[] = []
  for (let row = 0; row < state.rows; row++) {
    for (let col = 0; col < state.columns; col++) {
      if (!occupied.has(row * state.columns + col)) free.push({ col, row })
    }
  }
  if (free.length === 0) return null
  return free[Math.floor(random() * free.length)]
}

export function samePos(a: Grid2DPosition, b: Grid2DPosition): boolean {
  return a.col === b.col && a.row === b.row
}
