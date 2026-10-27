import { describe, expect, it } from 'vitest'
import {
  roadDirections,
  stepTraffic,
  createVehicle,
  blockersOf,
} from '../examples/src/worlds/isocity/isocity.traffic'
import {
  formatClock,
  groundOf,
  LANDMARKS,
  nightAmount,
  parseVegasMap,
  placeAt,
  PROPS,
  VEGAS_MAP,
  vegasRoadMap,
} from '../examples/src/worlds/isovegas/isovegas.map'

const map = parseVegasMap()
const isRoad = vegasRoadMap(VEGAS_MAP)

type Footprint = { name: string; c0: number; r0: number; c1: number; r1: number }

const footprints: Footprint[] = [
  ...map.landmarks.map((l) => ({
    name: l.name,
    c0: l.col,
    r0: l.row,
    c1: l.col + l.cols - 1,
    r1: l.row + l.rows - 1,
  })),
  ...map.props.map((p) => ({ name: p.name, c0: p.col, r0: p.row, c1: p.col, r1: p.row })),
]

describe('isovegas map', () => {
  it('is a rectangle of known characters', () => {
    expect(VEGAS_MAP.every((line) => line.length === VEGAS_MAP[0].length)).toBe(true)
    const known = new Set(['#', '.', ':', ...Object.keys(LANDMARKS), ...Object.keys(PROPS)])
    expect(
      VEGAS_MAP.join('')
        .split('')
        .filter((char) => !known.has(char)),
    ).toEqual([])
  })

  it('has every landmark once, each filling a rectangle', () => {
    expect(map.landmarks.map((l) => l.char).sort()).toEqual(Object.keys(LANDMARKS).sort())
    for (const l of map.landmarks) {
      for (let row = l.row; row < l.row + l.rows; row++) {
        expect(VEGAS_MAP[row].slice(l.col, l.col + l.cols)).toBe(l.char.repeat(l.cols))
      }
    }
  })

  it('connects all roads', () => {
    const roads = VEGAS_MAP.flatMap((line, row) =>
      [...line].flatMap((_, col) => (isRoad(col, row) ? [[col, row]] : [])),
    )
    const seen = new Set([roads[0].join()])
    const stack = [roads[0]]
    while (stack.length) {
      const [col, row] = stack.pop()!
      for (const d of roadDirections(isRoad, col, row)) {
        const next = { N: [col, row - 1], E: [col + 1, row], S: [col, row + 1], W: [col - 1, row] }[
          d
        ]
        if (!seen.has(next.join())) {
          seen.add(next.join())
          stack.push(next)
        }
      }
    }
    expect(seen.size).toBe(roads.length)
  })

  it('puts every landmark next to a road', () => {
    for (const l of map.landmarks) {
      const nextToRoad = [...Array(l.rows)].some(
        (_, i) => isRoad(l.col - 1, l.row + i) || isRoad(l.col + l.cols, l.row + i),
      )
      expect(nextToRoad, l.name).toBe(true)
    }
  })

  it('draws everything standing right in front of something after it', () => {
    // landmarks are depth-sorted by their front cell, so a neighbor in front must have a later front cell
    const overlaps = (a0: number, a1: number, b0: number, b1: number) => a0 <= b1 && b0 <= a1
    for (const a of footprints) {
      for (const b of footprints) {
        const inFront =
          (b.c0 === a.c1 + 1 && overlaps(a.r0, a.r1, b.r0, b.r1)) ||
          (b.r0 === a.r1 + 1 && overlaps(a.c0, a.c1, b.c0, b.c1))
        if (inFront)
          expect(b.c1 + b.r1, `${b.name} in front of ${a.name}`).toBeGreaterThan(a.c1 + a.r1)
      }
    }
  })

  it('knows the ground of every cell', () => {
    expect(groundOf(VEGAS_MAP, 10, 3)).toBe('road')
    expect(groundOf(VEGAS_MAP, 11, 3)).toBe('median')
    expect(groundOf(VEGAS_MAP, 11, 38)).toBe('median')
    expect(groundOf(VEGAS_MAP, 4, 4)).toBe('plaza')
    expect(groundOf(VEGAS_MAP, 0, 3)).toBe('desert')
  })

  it('finds the landmark or prop on a cell', () => {
    expect(placeAt(map, 5, 26)?.name).toBe('Bellagio')
    expect(placeAt(map, 11, 38)?.name).toContain('Welcome')
    expect(placeAt(map, 10, 3)).toBeUndefined()
  })

  it('keeps the traffic moving', () => {
    let seed = 7
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    const roads = VEGAS_MAP.flatMap((line, row) =>
      [...line].flatMap((_, col) => (isRoad(col, row) ? [[col, row]] : [])),
    )
    const vehicles = Array.from({ length: 80 }, (_, i) => {
      const [col, row] = roads[Math.floor((i * roads.length) / 80)]
      return createVehicle(i + 1, isRoad, col, row, random, { kind: 'car', color: '', speed: 1.5 })
    })
    const waiting = new Map<number, number>()
    let longestWait = 0
    for (let step = 0; step < 6000; step++) {
      const before = vehicles.map((v) => v.col * 1000 + v.row + v.progress)
      stepTraffic(vehicles, isRoad, 0.05, random)
      vehicles.forEach((v, i) => {
        const moved = v.col * 1000 + v.row + v.progress !== before[i]
        const wait = moved ? 0 : (waiting.get(v.id) ?? 0) + 0.05
        waiting.set(v.id, wait)
        longestWait = Math.max(longestWait, wait)
      })
    }
    expect(longestWait).toBeLessThan(10)
    expect(vehicles.every((v) => isRoad(v.col, v.row))).toBe(true)
    // nobody is stuck right now
    expect(vehicles.filter((v) => blockersOf(v, vehicles).length > 0).length).toBeLessThan(80)
  })
})

describe('isovegas clock', () => {
  it('is dark at night and bright by day, with a smooth dusk', () => {
    expect(nightAmount(12)).toBe(0)
    expect(nightAmount(0)).toBe(1)
    expect(nightAmount(23)).toBe(1)
    expect(nightAmount(19)).toBeCloseTo(0.5)
    expect(nightAmount(6)).toBeCloseTo(0.5)
    expect(nightAmount(18.5)).toBeLessThan(nightAmount(19.5))
    expect(nightAmount(36)).toBe(0)
  })

  it('formats the time of day', () => {
    expect(formatClock(18.5)).toBe('18:30')
    expect(formatClock(0)).toBe('00:00')
    expect(formatClock(24.25)).toBe('00:15')
  })
})
