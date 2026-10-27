import { describe, expect, it } from 'vitest'
import {
  BUILDING,
  createRandom,
  generateIslandMap,
  MAX_GRID_SIZE,
  MIN_GRID_SIZE,
  parseIslandMap,
  WATER,
  type IslandMap,
} from '../examples/src/worlds/isoislands/isoislands.generator'

/** Land cells grouped into islands (cells touching, also diagonally, belong to the same island) */
function landRegions(map: IslandMap): Array<Array<[number, number]>> {
  const seen = new Set<string>()
  const regions: Array<Array<[number, number]>> = []
  for (let row = 0; row < map.rows; row++) {
    for (let col = 0; col < map.columns; col++) {
      if (map.cells[row][col] === WATER || seen.has(`${col},${row}`)) continue
      const region: Array<[number, number]> = []
      const stack: Array<[number, number]> = [[col, row]]
      seen.add(`${col},${row}`)
      while (stack.length) {
        const [c, r] = stack.pop()!
        region.push([c, r])
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const key = `${c + dc},${r + dr}`
            const char = map.cells[r + dr]?.[c + dc]
            if (char === undefined || char === WATER || seen.has(key)) continue
            seen.add(key)
            stack.push([c + dc, r + dr])
          }
        }
      }
      regions.push(region)
    }
  }
  return regions
}

const sizes: Array<[number, number]> = [
  [12, 12],
  [24, 24],
  [40, 16],
  [16, 40],
  [64, 64],
]

describe('isoislands generator', () => {
  it('creates a deterministic random sequence for a seed', () => {
    const a = createRandom(42)
    const b = createRandom(42)
    const values = Array.from({ length: 5 }, () => a())
    expect(Array.from({ length: 5 }, () => b())).toEqual(values)
    values.forEach((value) => expect(value).toBeGreaterThanOrEqual(0))
    values.forEach((value) => expect(value).toBeLessThan(1))
  })

  it('creates the same map for the same seed', () => {
    const options = { columns: 30, rows: 20, seed: 1234 }
    expect(generateIslandMap(options)).toEqual(generateIslandMap(options))
    expect(generateIslandMap({ ...options, seed: 1235 }).cells).not.toEqual(
      generateIslandMap(options).cells,
    )
  })

  it('creates a grid of the requested size', () => {
    for (const [columns, rows] of sizes) {
      const map = generateIslandMap({ columns, rows, seed: 7 })
      expect(map.columns).toBe(columns)
      expect(map.rows).toBe(rows)
      expect(map.cells).toHaveLength(rows)
      map.cells.forEach((line) => expect(line).toHaveLength(columns))
    }
  })

  it('clamps the grid size', () => {
    const small = generateIslandMap({ columns: 3, rows: 0, seed: 1 })
    expect([small.columns, small.rows]).toEqual([MIN_GRID_SIZE, MIN_GRID_SIZE])
    const large = generateIslandMap({ columns: 1000, rows: 500, seed: 1 })
    expect([large.columns, large.rows]).toEqual([MAX_GRID_SIZE, MAX_GRID_SIZE])
  })

  it('places separate islands with exactly one building each', () => {
    for (const [columns, rows] of sizes) {
      for (let seed = 0; seed < 20; seed++) {
        const map = generateIslandMap({ columns, rows, seed })
        const regions = landRegions(map)
        expect(map.islands.length).toBeGreaterThan(0)
        expect(regions).toHaveLength(map.islands.length)
        expect(map.buildings).toHaveLength(map.islands.length)
        for (const region of regions) {
          const buildings = region.filter(([c, r]) => map.cells[r][c] === BUILDING)
          expect(buildings).toHaveLength(1)
        }
        for (const building of map.buildings) {
          expect(map.cells[building.row][building.col]).toBe(BUILDING)
          expect(building.height).toBeGreaterThan(0)
        }
      }
    }
  })

  it('keeps water along the map edge', () => {
    for (let seed = 0; seed < 20; seed++) {
      const map = generateIslandMap({ columns: 20, rows: 20, seed })
      for (let i = 0; i < 20; i++) {
        for (const [col, row] of [
          [i, 0],
          [i, 19],
          [0, i],
          [19, i],
        ]) {
          expect(map.cells[row][col]).toBe(WATER)
        }
      }
    }
  })

  it('places fewer islands when they do not fit', () => {
    const map = generateIslandMap({ columns: 12, rows: 12, seed: 3, islandCount: 50 })
    expect(map.islands.length).toBeGreaterThan(0)
    expect(map.islands.length).toBeLessThan(50)
  })

  it('parses a hand-drawn map', () => {
    const map = parseIslandMap(['~~~~', '~.B~', '~~~~'])
    expect([map.columns, map.rows]).toEqual([4, 3])
    expect(map.buildings).toEqual([{ col: 2, row: 1, height: 32 }])
  })
})
