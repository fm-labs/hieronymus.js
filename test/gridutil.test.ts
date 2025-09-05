import { assert, expect, test, describe, it } from 'vitest'
import {
  isometricScreenToGrid,
  isometricGridToScreen,
  orthogonalScreenToGrid,
  orthogonalGridToScreen,
  findCellNeighbors,
} from '../lib/utils/gridutil'

test('orthogonalGridToScreen', () => {
  expect(orthogonalGridToScreen(0, 0, 32)).toStrictEqual({ x: 0, y: 0 })
  expect(orthogonalGridToScreen(1, 0, 32)).toStrictEqual({ x: 32, y: 0 })
  expect(orthogonalGridToScreen(0, 1, 32)).toStrictEqual({ x: 0, y: 32 })
  expect(orthogonalGridToScreen(1, 1, 32)).toStrictEqual({ x: 32, y: 32 })
  expect(orthogonalGridToScreen(2, 2, 32)).toStrictEqual({ x: 64, y: 64 })
})

test('orthogonalScreenToGrid', () => {
  expect(orthogonalScreenToGrid(0, 0, 32)).toStrictEqual({ col: 0, row: 0 })
  expect(orthogonalScreenToGrid(31, 31, 32)).toStrictEqual({ col: 0, row: 0 })
  expect(orthogonalScreenToGrid(32, 32, 32)).toStrictEqual({ col: 1, row: 1 })
  expect(orthogonalScreenToGrid(0, 32, 32)).toStrictEqual({ col: 0, row: 1 })
  expect(orthogonalScreenToGrid(32, 0, 32)).toStrictEqual({ col: 1, row: 0 })
})

test('isometricGridToScreen', () => {
  expect(isometricGridToScreen(0, 0, 128)).toStrictEqual({ x: 0, y: 0 })
  expect(isometricGridToScreen(0, 1, 128)).toStrictEqual({ x: -64, y: 32 })
  expect(isometricGridToScreen(1, 0, 128)).toStrictEqual({ x: 64, y: 32 })
  expect(isometricGridToScreen(1, 1, 128)).toStrictEqual({ x: 0, y: 64 })
  expect(isometricGridToScreen(2, 2, 128)).toStrictEqual({ x: 0, y: 128 })

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const { x, y } = isometricGridToScreen(i, j, 128)
      const { col, row } = isometricScreenToGrid(x, y, 128)
      expect(col).toBe(i)
      expect(row).toBe(j)

      const screenPos2 = isometricScreenToGrid(x + 1, y + 1, 128)
      expect(screenPos2.col).toBe(i)
      expect(screenPos2.row).toBe(j)

      // const screenPos3 = getIsometricGridPosition(x, y + 62, 128)
      // expect(screenPos3.col).toBe(i)
      // expect(screenPos3.row).toBe(j)
    }
  }
})

describe('findCellNeighbors', () => {
  it('returns all 8 neighbors for a center cell in a 3x3 grid', () => {
    const neighbors = findCellNeighbors(1, 1, 3, 3, 1)
    expect(neighbors).toHaveLength(8)
    expect(neighbors).toEqual(
      expect.arrayContaining([
        [0, 0],
        [1, 0],
        [2, 0],
        [0, 1],
        [2, 1],
        [0, 2],
        [1, 2],
        [2, 2],
      ]),
    )
  })

  it('returns correct neighbors at a corner cell (0,0)', () => {
    const neighbors = findCellNeighbors(0, 0, 3, 3, 1)
    expect(neighbors).toEqual(
      expect.arrayContaining([
        [1, 0],
        [0, 1],
        [1, 1],
      ]),
    )
  })

  it('returns correct neighbors at the edge cell (2,1)', () => {
    const neighbors = findCellNeighbors(2, 1, 3, 3, 1)
    expect(neighbors).toEqual(
      expect.arrayContaining([
        [1, 0],
        [2, 0],
        [1, 1],
        [1, 2],
        [2, 2],
      ]),
    )
  })

  it('returns more neighbors when distance = 2', () => {
    const neighbors = findCellNeighbors(2, 2, 5, 5, 2)
    expect(neighbors.length).toBe(24) // 5x5 grid around center minus self
    expect(neighbors).not.toContainEqual([2, 2]) // center excluded
  })

  it('returns empty array if no valid neighbors', () => {
    const neighbors = findCellNeighbors(0, 0, 1, 1, 1)
    expect(neighbors).toEqual([])
  })
})
