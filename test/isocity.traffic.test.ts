import { describe, expect, it } from 'vitest'
import {
  chooseDirection,
  createVehicle,
  isBlocked,
  LANE_OFFSET,
  roadDirections,
  stepTraffic,
  stepVehicle,
  vehiclePosition,
  type RoadMap,
  type Vehicle,
} from '../examples/src/worlds/isocity/isocity.traffic'

/** '#' is road, anything else is not */
const roadMap =
  (lines: string[]): RoadMap =>
  (col, row) =>
    lines[row]?.[col] === '#'

// a ring road around a 3x3 block, with a dead end sticking out at the top right
const RING = roadMap(['......#', '.######', '.#...#.', '.#...#.', '.#...#.', '.#####.'])

const first = () => 0
const last = () => 0.999

const car = (overrides: Partial<Vehicle>): Vehicle => ({
  id: 1,
  kind: 'car',
  color: 'red',
  col: 1,
  row: 1,
  direction: 'E',
  previousDirection: 'E',
  progress: 0,
  speed: 1,
  ...overrides,
})

describe('isocity traffic', () => {
  it('finds the connected roads of a cell', () => {
    expect(roadDirections(RING, 1, 1)).toEqual(['E', 'S'])
    expect(roadDirections(RING, 5, 1)).toEqual(['E', 'S', 'W'])
    expect(roadDirections(RING, 3, 3)).toEqual([])
  })

  it('never turns back while there is another way', () => {
    // at the top left corner, arriving westbound: only south is left
    expect(chooseDirection(RING, 1, 1, 'W', first)).toBe('S')
    expect(chooseDirection(RING, 1, 1, 'W', last)).toBe('S')
    // at the junction, arriving eastbound: east or south
    expect(chooseDirection(RING, 5, 1, 'E', first)).toBe('E')
    expect(chooseDirection(RING, 5, 1, 'E', last)).toBe('S')
  })

  it('turns back at a dead end', () => {
    expect(chooseDirection(RING, 6, 0, 'N', first)).toBe('S')
    expect(chooseDirection(RING, 6, 0, 'N', last)).toBe('S')
  })

  it('drives on the right-hand lane', () => {
    // eastbound: the right-hand side is south (+row)
    expect(vehiclePosition(car({ direction: 'E', previousDirection: 'E' }))).toEqual({
      col: 1.5,
      row: 1.5 + LANE_OFFSET,
    })
    // northbound: the right-hand side is east (+col)
    const north = vehiclePosition(car({ direction: 'N', previousDirection: 'N', progress: 0.5 }))
    expect(north.col).toBeCloseTo(1.5 + LANE_OFFSET)
    expect(north.row).toBeCloseTo(1)
  })

  it('moves to the next cell and picks a new direction there', () => {
    const vehicle = stepVehicle(car({ col: 4, row: 1, speed: 2 }), RING, 0.75, first)
    expect([vehicle.col, vehicle.row]).toEqual([5, 1])
    expect(vehicle.progress).toBeCloseTo(0.5)
    expect(vehicle.previousDirection).toBe('E')
    expect(vehicle.direction).toBe('E')
  })

  it('stays on the road', () => {
    let seed = 1
    const random = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    const vehicle = createVehicle(1, RING, 1, 3, random, { kind: 'car', color: 'red', speed: 3 })
    for (let i = 0; i < 2000; i++) {
      stepVehicle(vehicle, RING, 0.1, random)
      expect(RING(vehicle.col, vehicle.row)).toBe(true)
      const v = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }[vehicle.direction]
      expect(RING(vehicle.col + v[0], vehicle.row + v[1])).toBe(true)
    }
  })

  it('waits behind a vehicle in the same lane', () => {
    const back = car({ id: 1, col: 2, progress: 0 })
    const front = car({ id: 2, col: 2, progress: 0.5 })
    expect(isBlocked(back, [back, front])).toBe(true)
    expect(isBlocked(front, [back, front])).toBe(false)

    stepTraffic([back, front], RING, 0.1, first)
    expect(back.progress).toBe(0)
    expect(front.progress).toBeCloseTo(0.6)
  })

  it('passes oncoming vehicles in the other lane', () => {
    const east = car({ id: 1, col: 2, direction: 'E', previousDirection: 'E' })
    const west = car({ id: 2, col: 3, direction: 'W', previousDirection: 'W' })
    expect(isBlocked(east, [east, west])).toBe(false)
    expect(isBlocked(west, [east, west])).toBe(false)
  })
})

describe('isocity example map', async () => {
  const { CITY_MAP, cityRoadMap } = await import('../examples/src/worlds/isocity/isocity.world')
  const isRoad = cityRoadMap(CITY_MAP)

  it('is a rectangle', () => {
    CITY_MAP.forEach((line) => expect(line).toHaveLength(CITY_MAP[0].length))
  })

  it('has one connected road network', () => {
    const roads = CITY_MAP.flatMap((line, row) =>
      [...line].flatMap((_, col) => (isRoad(col, row) ? [`${col},${row}`] : [])),
    )
    const [start] = roads
    const seen = new Set([start])
    const stack = [start]
    while (stack.length) {
      const [col, row] = stack.pop()!.split(',').map(Number)
      for (const d of roadDirections(isRoad, col, row)) {
        const v = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }[d]
        const key = `${col + v[0]},${row + v[1]}`
        if (!seen.has(key)) {
          seen.add(key)
          stack.push(key)
        }
      }
    }
    expect(seen.size).toBe(roads.length)
  })
})

describe('isocity traffic jams', () => {
  it('lets a vehicle turning back at a dead end pass an oncoming one', () => {
    // just turned back at the dead end, still crossing over into the northbound lane
    const back = car({
      id: 1,
      col: 6,
      row: 0,
      direction: 'S',
      previousDirection: 'N',
      progress: 0.05,
    })
    const oncoming = car({
      id: 2,
      col: 6,
      row: 1,
      direction: 'N',
      previousDirection: 'E',
      progress: 0.1,
    })
    expect(isBlocked(back, [back, oncoming])).toBe(false)
    expect(isBlocked(oncoming, [back, oncoming])).toBe(false)
  })

  it('lets the lower id go first when two vehicles block each other', () => {
    // a crossing: each one is just ahead of the other in its own lane
    const a = car({ id: 1, col: 2, row: 1, direction: 'E', previousDirection: 'E', progress: 0.72 })
    const b = car({ id: 2, col: 3, row: 1, direction: 'S', previousDirection: 'S', progress: 0.08 })
    expect(isBlocked(a, [a, b])).toBe(true)
    expect(isBlocked(b, [a, b])).toBe(true)

    stepTraffic([a, b], RING, 0.1, first)
    expect(a.progress).toBeCloseTo(0.82)
    expect(b.progress).toBeCloseTo(0.08)
  })
})
