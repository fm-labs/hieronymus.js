import { describe, expect, it } from 'vitest'
import {
  FLOOR_PLAN,
  holdPercent,
  isGaming,
  OBJECT_TYPES,
  parseFloorPlan,
  playRound,
  ROOMS,
  roomAt,
  walkableMap,
} from '../examples/src/worlds/isocasino/isocasino.floor'

const plan = parseFloorPlan()
const isWalkable = walkableMap(FLOOR_PLAN)
const NEIGHBORS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
]

/** All walkable cells reachable from the first walkable cell */
function reachableCells(): Set<string> {
  const start = FLOOR_PLAN.flatMap((line, row) =>
    [...line].flatMap((_, col) => (isWalkable(col, row) ? [`${col},${row}`] : [])),
  )[0]
  const seen = new Set([start])
  const stack = [start]
  while (stack.length) {
    const [col, row] = stack.pop()!.split(',').map(Number)
    for (const [dc, dr] of NEIGHBORS) {
      const key = `${col + dc},${row + dr}`
      if (isWalkable(col + dc, row + dr) && !seen.has(key)) {
        seen.add(key)
        stack.push(key)
      }
    }
  }
  return seen
}

describe('isocasino floor plan', () => {
  it('is a rectangle made of known characters', () => {
    FLOOR_PLAN.forEach((line) => {
      expect(line).toHaveLength(FLOOR_PLAN[0].length)
      ;[...line].forEach((char) => expect(char === '.' || char in OBJECT_TYPES).toBe(true))
    })
  })

  it('connects all floor cells, so guests can reach every room', () => {
    const walkable = FLOOR_PLAN.join('')
      .split('')
      .filter((char) => char === '.').length
    expect(reachableCells().size).toBe(walkable)
  })

  it('can reach every machine and table from the floor', () => {
    for (const object of plan.objects.filter(isGaming)) {
      const reachable = NEIGHBORS.some(([dc, dr]) => isWalkable(object.col + dc, object.row + dr))
      expect(reachable, `${object.id} at ${object.col},${object.row}`).toBe(true)
    }
  })

  it('puts every non-wall cell into a room', () => {
    FLOOR_PLAN.forEach((line, row) =>
      [...line].forEach((char, col) => {
        if (char !== '#') expect(roomAt(col, row), `${col},${row}`).toBeDefined()
      }),
    )
  })

  it('has machines in every room except the lobby', () => {
    const rooms = new Set(plan.objects.filter(isGaming).map((o) => o.room))
    const bar = ['Bar & Lounge', 'Lobby']
    ROOMS.filter((room) => !bar.includes(room.name)).forEach((room) =>
      expect(rooms).toContain(room.name),
    )
  })

  it('gives every object a unique id', () => {
    const ids = plan.objects.map((o) => o.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(plan.objects.find((o) => o.char === 's')?.id).toBe('SL-001')
  })
})

describe('isocasino gaming', () => {
  it('takes the bet and pays twice the bet on a win', () => {
    const stats = { rounds: 0, coinIn: 0, coinOut: 0 }
    playRound(stats, OBJECT_TYPES.b, () => 0)
    expect(stats).toEqual({ rounds: 1, coinIn: 25, coinOut: 50 })
    playRound(stats, OBJECT_TYPES.b, () => 0.99)
    expect(stats).toEqual({ rounds: 2, coinIn: 50, coinOut: 50 })
    expect(holdPercent(stats)).toBe(0)
  })

  it('keeps about the house edge in the long run', () => {
    let seed = 7
    const random = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    const stats = { rounds: 0, coinIn: 0, coinOut: 0 }
    for (let i = 0; i < 200000; i++) playRound(stats, OBJECT_TYPES.s, random)
    expect(holdPercent(stats)).toBeCloseTo(8, 0)
  })

  it('reports no hold before the first round', () => {
    expect(holdPercent({ rounds: 0, coinIn: 0, coinOut: 0 })).toBe(0)
  })
})
