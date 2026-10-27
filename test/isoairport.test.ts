import { describe, expect, it } from 'vitest'
import { roadDirections } from '../examples/src/worlds/isocity/isocity.traffic'
import {
  AIRPORT_MAP,
  airportRoadMap,
  BUILDINGS,
  groundOf,
  parseAirportMap,
  placeAt,
  PROPS,
} from '../examples/src/worlds/isoairport/isoairport.map'
import {
  distanceToPolyline,
  GATES,
  onRunway,
  pointAt,
  roundCorners,
  createPath,
  RUNWAYS,
  runwayLength,
  TAXIWAY_WIDTH,
  TAXIWAYS,
  taxiInPath,
  taxiOutPath,
  vec,
  type Vec,
} from '../examples/src/worlds/isoairport/isoairport.airside'
import {
  createTraffic,
  stepAirport,
  type Flight,
} from '../examples/src/worlds/isoairport/isoairport.flights'

const map = parseAirportMap()
const isRoad = airportRoadMap(AIRPORT_MAP)

const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646

/** Sample points of a cell, including its corners */
const cellSamples = (col: number, row: number): Vec[] =>
  [0, 0.25, 0.5, 0.75, 1].flatMap((a) => [0, 0.25, 0.5, 0.75, 1].map((b) => vec(col + a, row + b)))

type Footprint = { name: string; c0: number; r0: number; c1: number; r1: number }

const footprints: Footprint[] = [
  ...map.pieces.map((b) => ({
    name: `${b.name} (${b.pieceCol}, ${b.pieceRow})`,
    c0: b.pieceCol,
    r0: b.pieceRow,
    c1: b.pieceCol + b.pieceCols - 1,
    r1: b.pieceRow + b.pieceRows - 1,
  })),
  ...map.props.map((p) => ({ name: p.name, c0: p.col, r0: p.row, c1: p.col, r1: p.row })),
]

describe('isoairport map', () => {
  it('is a rectangle of known characters', () => {
    expect(AIRPORT_MAP.every((line) => line.length === AIRPORT_MAP[0].length)).toBe(true)
    const known = new Set([
      '.',
      '#',
      '_',
      ',',
      '=',
      '~',
      ...Object.keys(BUILDINGS),
      ...Object.keys(PROPS),
    ])
    expect(
      AIRPORT_MAP.join('')
        .split('')
        .filter((char) => !known.has(char)),
    ).toEqual([])
  })

  it('has every building once, each filling a rectangle', () => {
    expect(map.buildings.map((b) => b.char).sort()).toEqual(Object.keys(BUILDINGS).sort())
    for (const b of map.buildings) {
      for (let row = b.row; row < b.row + b.rows; row++) {
        expect(AIRPORT_MAP[row].slice(b.col, b.col + b.cols), b.name).toBe(b.char.repeat(b.cols))
      }
    }
  })

  it('cuts the concourses into slices', () => {
    expect(map.pieces.filter((p) => p.char === 'P').map((p) => p.pieceCols)).toEqual(
      Array(12).fill(1),
    )
    expect(map.pieces.filter((p) => p.char === 'Q').length).toBe(12)
    expect(map.pieces.filter((p) => p.char === 'T').length).toBe(1)
  })

  it('connects all roads', () => {
    const roads = AIRPORT_MAP.flatMap((line, row) =>
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

  it('draws everything standing right in front of something after it', () => {
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
    expect(groundOf(AIRPORT_MAP, 2, 2)).toBe('road')
    expect(groundOf(AIRPORT_MAP, 20, 17)).toBe('apron')
    expect(groundOf(AIRPORT_MAP, 22, 22)).toBe('water')
    expect(groundOf(AIRPORT_MAP, 15, 5)).toBe('parking')
    expect(groundOf(AIRPORT_MAP, 30, 30)).toBe('grass')
    expect(groundOf(AIRPORT_MAP, 21, 19)).toBe('apron')
  })

  it('finds the building or prop on a cell', () => {
    expect(placeAt(map, 24, 25)?.name).toBe('Control tower')
    expect(placeAt(map, 20, 14)?.name).toBe('Concourse A')
    expect(placeAt(map, 32, 32)?.name).toBe('Windsock')
    expect(placeAt(map, 30, 25)).toBeUndefined()
  })
})

describe('isoairport airside', () => {
  // everything that is built, paved or planted
  const builtCells = AIRPORT_MAP.flatMap((line, row) =>
    [...line].flatMap((char, col) => (char === '.' ? [] : [{ col, row, char }])),
  )

  it('keeps the runways and their approaches clear', () => {
    for (const runway of RUNWAYS) {
      // the runway, and 6 cells beyond each end for the approach lights
      const line = [onRunway(runway, -6), onRunway(runway, runwayLength(runway) + 6)]
      for (const { col, row, char } of builtCells) {
        const closest = Math.min(...cellSamples(col, row).map((p) => distanceToPolyline(p, line)))
        expect(closest, `'${char}' at ${col}, ${row} on runway ${runway.name}`).toBeGreaterThan(
          runway.width / 2,
        )
      }
    }
  })

  it('keeps the taxiways clear', () => {
    for (const { name, points } of TAXIWAYS) {
      for (const { col, row, char } of builtCells) {
        // taxiways may cross the apron
        if (char === '=') continue
        const closest = Math.min(...cellSamples(col, row).map((p) => distanceToPolyline(p, points)))
        expect(closest, `'${char}' at ${col}, ${row} on taxiway ${name}`).toBeGreaterThan(
          TAXIWAY_WIDTH / 2,
        )
      }
    }
  })

  it('parks the planes on the apron, in front of their concourse', () => {
    for (const gate of GATES) {
      const { col, row } = gate.stand
      expect(groundOf(AIRPORT_MAP, Math.floor(col), Math.floor(row)), gate.name).toBe('apron')
      const wall = sub2(gate.stand, gate.heading, -1.3)
      expect(placeAt(map, Math.floor(wall.col), Math.floor(wall.row))?.name, gate.name).toMatch(
        /Concourse/,
      )
    }
  })

  it('routes every gate from the runway and back', () => {
    for (const gate of GATES) {
      const taxiIn = taxiInPath(gate)
      expect(pointAt(taxiIn, taxiIn.total).position).toEqual(gate.stand)
      const taxiOut = taxiOutPath(gate)
      expect(pointAt(taxiOut, 0).position).toEqual(gate.pushEnd)
    }
  })

  it('rounds corners without moving the end points', () => {
    const points = roundCorners([vec(0, 0), vec(4, 0), vec(4, 4)])
    expect(points[0]).toEqual(vec(0, 0))
    expect(points[points.length - 1]).toEqual(vec(4, 4))
    const path = createPath(points)
    // a bit shorter than the corner
    expect(path.total).toBeLessThan(8)
    expect(path.total).toBeGreaterThan(7.5)
  })
})

const sub2 = (a: Vec, b: Vec, k: number) => vec(a.col - b.col * k, a.row - b.row * k)

describe('isoairport flights', () => {
  it('lands, parks and departs planes without collisions or deadlocks', () => {
    const random = seeded(11)
    const traffic = createTraffic(random, { parked: 6 })
    const dt = 0.05
    let longestWait = 0
    let closest = Infinity
    const ground = (f: Flight) => f.altitude <= 0 && f.phase !== 'approach'
    // 30 minutes
    for (let step = 0; step < (30 * 60) / dt; step++) {
      stepAirport(traffic, dt, random)
      for (const f of traffic.flights) longestWait = Math.max(longestWait, f.waited)
      const onGround = traffic.flights.filter(ground)
      for (let i = 0; i < onGround.length; i++) {
        for (let j = i + 1; j < onGround.length; j++) {
          const a = onGround[i].position
          const b = onGround[j].position
          closest = Math.min(closest, Math.hypot(a.col - b.col, a.row - b.row))
        }
      }
    }
    expect(longestWait).toBeLessThan(30)
    // the longest plane is 1.6 cells, two of them nose to tail never get closer than that
    expect(closest).toBeGreaterThan(1.6)
    expect(traffic.arrivals).toBeGreaterThan(40)
    expect(traffic.departures).toBeGreaterThan(40)
    // nobody holds a gate twice
    const ids = traffic.gates.filter(Boolean)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
