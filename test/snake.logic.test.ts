import { describe, expect, it } from 'vitest'
import {
  createSnakeState,
  INITIAL_LENGTH,
  placeFood,
  queueDirection,
  stepSnake,
  type SnakeState,
} from '../src/worlds/snake/snake.logic'

const first = () => 0

function runningState(columns = 10, rows = 10): SnakeState {
  const state = createSnakeState(columns, rows, first)
  state.status = 'running'
  return state
}

describe('snake logic', () => {
  it('creates a centered snake heading right', () => {
    const state = createSnakeState(10, 10, first)
    expect(state.snake).toStrictEqual([
      { col: 5, row: 5 },
      { col: 4, row: 5 },
      { col: 3, row: 5 },
    ])
    expect(state.direction).toBe('right')
    expect(state.status).toBe('ready')
    expect(state.food).toStrictEqual({ col: 0, row: 0 })
  })

  it('does not move unless running', () => {
    const state = createSnakeState(10, 10, first)
    expect(stepSnake(state)).toBe('idle')
    expect(state.snake[0]).toStrictEqual({ col: 5, row: 5 })
  })

  it('moves one cell per step and keeps its length', () => {
    const state = runningState()
    expect(stepSnake(state, first)).toBe('moved')
    expect(state.snake[0]).toStrictEqual({ col: 6, row: 5 })
    expect(state.snake).toHaveLength(INITIAL_LENGTH)
  })

  it('ignores reversing and repeated directions', () => {
    const state = runningState()
    queueDirection(state, 'left')
    queueDirection(state, 'right')
    expect(state.directionQueue).toStrictEqual([])
    queueDirection(state, 'up')
    queueDirection(state, 'down') // reverse of the queued 'up'
    expect(state.directionQueue).toStrictEqual(['up'])
  })

  it('applies one queued turn per step', () => {
    const state = runningState()
    queueDirection(state, 'up')
    queueDirection(state, 'left')
    stepSnake(state, first)
    expect(state.snake[0]).toStrictEqual({ col: 5, row: 4 })
    stepSnake(state, first)
    expect(state.snake[0]).toStrictEqual({ col: 4, row: 4 })
  })

  it('grows and scores when eating', () => {
    const state = runningState()
    state.food = { col: 6, row: 5 }
    expect(stepSnake(state, first)).toBe('ate')
    expect(state.score).toBe(1)
    expect(state.snake).toHaveLength(INITIAL_LENGTH + 1)
    expect(state.snake.some((s) => s.col === state.food!.col && s.row === state.food!.row)).toBe(
      false,
    )
  })

  it('dies when hitting a wall', () => {
    const state = runningState()
    state.food = null
    for (let i = 0; i < 4; i++) expect(stepSnake(state)).toBe('moved')
    expect(stepSnake(state)).toBe('died')
    expect(state.status).toBe('gameover')
  })

  it('dies when hitting itself', () => {
    const state = runningState()
    state.food = null
    state.snake = [
      { col: 5, row: 5 },
      { col: 4, row: 5 },
      { col: 4, row: 6 },
      { col: 5, row: 6 },
      { col: 6, row: 6 },
    ]
    state.direction = 'up'
    queueDirection(state, 'left')
    expect(stepSnake(state)).toBe('died') // 4,5 is a body segment
    expect(state.status).toBe('gameover')
  })

  it('may move into the cell the tail is leaving', () => {
    const state = runningState()
    state.food = null
    state.snake = [
      { col: 5, row: 5 },
      { col: 5, row: 6 },
      { col: 4, row: 6 },
      { col: 4, row: 5 },
    ]
    state.direction = 'up'
    queueDirection(state, 'left')
    expect(stepSnake(state)).toBe('moved')
    expect(state.snake[0]).toStrictEqual({ col: 4, row: 5 })
  })

  it('wins when the board is full', () => {
    const state = runningState(2, 2)
    state.snake = [
      { col: 0, row: 1 },
      { col: 0, row: 0 },
      { col: 1, row: 0 },
    ]
    state.direction = 'right'
    state.food = { col: 1, row: 1 }
    expect(stepSnake(state)).toBe('won')
    expect(state.status).toBe('won')
    expect(placeFood(state)).toBeNull()
  })
})
