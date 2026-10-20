import { describe, expect, it } from 'vitest'
import {
  blockersOf,
  createVehicle,
  roadDirections,
  type RoadMap,
  type Vehicle,
} from '../src/worlds/isocity/isocity.traffic'
import {
  groundOf,
  LANDMARKS,
  parseViennaMap,
  placeAt,
  PROPS,
  stepViennaTraffic,
  VIENNA_MAP,
  viennaRoadMap,
  viennaTramMap,
} from '../src/worlds/isovienna/isovienna.map'

const map = parseViennaMap()
const isRoad = viennaRoadMap(VIENNA_MAP)
const isTrack = viennaTramMap(VIENNA_MAP)

const cellsOf = (test: RoadMap) =>
  VIENNA_MAP.flatMap((line, row) =>
    [...line].flatMap((_, col) => (test(col, row) ? [[col, row]] : [])),
  )

/** All cells reachable from the first one, following the road map */
const reachable = (test: RoadMap) => {
  const cells = cellsOf(test)
  const seen = new Set([cells[0].join()])
  const stack = [cells[0]]
  while (stack.length) {
    const [col, row] = stack.pop()!
    for (const d of roadDirections(test, col, row)) {
      const next = { N: [col, row - 1], E: [col + 1, row], S: [col, row + 1], W: [col - 1, row] }[d]
      if (!seen.has(next.join())) {
        seen.add(next.join())
        stack.push(next)
      }
    }
  }
  return { seen: seen.size, all: cells.length }
}

type Footprint = { name: string; c0: number; r0: number; c1: number; r1: number }

const footprints: Footprint[] = [
  ...map.landmarks.map((l) => ({
    name: l.name,
    c0: l.col,
    r0: l.row,
    c1: l.col + l.cols - 1,
    r1: l.row + l.rows - 1,
  })),
  ...map.props.map((p) => ({
    name: `${p.name} ${p.col},${p.row}`,
    c0: p.col,
    r0: p.row,
    c1: p.col,
    r1: p.row,
  })),
]

describe('isovienna map', () => {
  it('is a rectangle of known characters', () => {
    expect(VIENNA_MAP.every((line) => line.length === VIENNA_MAP[0].length)).toBe(true)
    const known = new Set([
      '#',
      '=',
      '%',
      '~',
      '.',
      ',',
      ...Object.keys(LANDMARKS),
      ...Object.keys(PROPS),
    ])
    expect(
      VIENNA_MAP.join('')
        .split('')
        .filter((char) => !known.has(char)),
    ).toEqual([])
  })

  it('has every landmark once, each filling a rectangle', () => {
    expect(map.landmarks.map((l) => l.char).sort()).toEqual(Object.keys(LANDMARKS).sort())
    for (const l of map.landmarks) {
      for (let row = l.row; row < l.row + l.rows; row++) {
        expect(VIENNA_MAP[row].slice(l.col, l.col + l.cols), l.name).toBe(l.char.repeat(l.cols))
      }
    }
  })

  it('connects all roads', () => {
    const { seen, all } = reachable(isRoad)
    expect(seen).toBe(all)
  })

  it('has a closed loop of tram tracks around the old town', () => {
    const { seen, all } = reachable(isTrack)
    expect(seen).toBe(all)
    // every track cell has exactly two neighbors, so a tram never has to choose or turn back
    for (const [col, row] of cellsOf(isTrack)) {
      expect(roadDirections(isTrack, col, row).length, `${col},${row}`).toBe(2)
    }
    // Stephansdom is inside the Ring
    const stephansdom = map.landmarks.find((l) => l.kind === 'stephansdom')!
    const tracks = cellsOf(isTrack)
    const cols = tracks.map(([c]) => c)
    const rows = tracks.map(([, r]) => r)
    expect(stephansdom.col).toBeGreaterThan(Math.min(...cols))
    expect(stephansdom.col + stephansdom.cols).toBeLessThanOrEqual(Math.max(...cols))
    expect(stephansdom.row).toBeGreaterThan(Math.min(...rows))
    expect(stephansdom.row + stephansdom.rows).toBeLessThanOrEqual(Math.max(...rows))
  })

  it('crosses the canal only on bridges', () => {
    VIENNA_MAP.forEach((line, row) =>
      [...line].forEach((char, col) => {
        if (char !== '%') return
        expect(groundOf(VIENNA_MAP, col, row)).toBe('bridge')
        expect(isRoad(col, row)).toBe(true)
      }),
    )
    expect(VIENNA_MAP.join('').split('%').length - 1).toBeGreaterThanOrEqual(4)
  })

  it('puts every landmark next to a road', () => {
    for (const l of map.landmarks) {
      const around = [
        ...[...Array(l.rows)].flatMap((_, i) => [
          [l.col - 1, l.row + i],
          [l.col + l.cols, l.row + i],
        ]),
        ...[...Array(l.cols)].flatMap((_, i) => [
          [l.col + i, l.row - 1],
          [l.col + i, l.row + l.rows],
        ]),
      ]
      expect(
        around.some(([col, row]) => isRoad(col, row)),
        l.name,
      ).toBe(true)
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
    expect(groundOf(VIENNA_MAP, 3, 10)).toBe('road')
    expect(groundOf(VIENNA_MAP, 8, 10)).toBe('ring')
    expect(groundOf(VIENNA_MAP, 12, 5)).toBe('bridge')
    expect(groundOf(VIENNA_MAP, 5, 5)).toBe('water')
    expect(groundOf(VIENNA_MAP, 17, 11)).toBe('plaza')
    expect(groundOf(VIENNA_MAP, 10, 9)).toBe('pavement')
    // a house stands on the pavement, a tree on the lawn
    expect(groundOf(VIENNA_MAP, 9, 8)).toBe('pavement')
    expect(groundOf(VIENNA_MAP, 1, 8)).toBe('lawn')
  })

  it('finds the landmark or prop on a cell', () => {
    expect(placeAt(map, 18, 12)?.name).toBe('Stephansdom')
    expect(placeAt(map, 20, 1)?.name).toContain('Riesenrad')
    expect(placeAt(map, 18, 8)?.name).toBe('U-Bahn station')
    expect(placeAt(map, 8, 10)).toBeUndefined()
  })
})

describe('isovienna traffic', () => {
  it('keeps the trams on the Ring and everything moving', () => {
    let seed = 11
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    const roads = cellsOf(isRoad)
    const tracks = cellsOf(isTrack)
    const trams: Vehicle[] = Array.from({ length: 4 }, (_, i) => {
      const [col, row] = tracks[Math.floor((i * tracks.length) / 4)]
      return createVehicle(i + 1, isTrack, col, row, random, { kind: 'bus', color: '', speed: 0.9 })
    })
    const cars: Vehicle[] = Array.from({ length: 70 }, (_, i) => {
      const [col, row] = roads[Math.floor((i * roads.length) / 70)]
      return createVehicle(i + 10, isRoad, col, row, random, {
        kind: 'car',
        color: '',
        speed: i % 5 === 0 ? 0.6 : 1.4,
      })
    })
    const vehicles = [...trams, ...cars]
    const roadOf = (v: Vehicle) => (trams.includes(v) ? isTrack : isRoad)
    const waiting = new Map<number, number>()
    let longestWait = 0
    for (let step = 0; step < 6000; step++) {
      const before = vehicles.map((v) => v.col * 1000 + v.row + v.progress)
      stepViennaTraffic(vehicles, roadOf, 0.05, random)
      vehicles.forEach((v, i) => {
        const moved = v.col * 1000 + v.row + v.progress !== before[i]
        const wait = moved ? 0 : (waiting.get(v.id) ?? 0) + 0.05
        waiting.set(v.id, wait)
        longestWait = Math.max(longestWait, wait)
      })
      expect(trams.every((t) => isTrack(t.col, t.row))).toBe(true)
    }
    expect(longestWait).toBeLessThan(10)
    expect(cars.every((v) => isRoad(v.col, v.row))).toBe(true)
    expect(vehicles.filter((v) => blockersOf(v, vehicles).length > 0).length).toBeLessThan(74)
  })
})
