import { assert, expect, test } from 'vitest'
import {
  isometricScreenToGrid,
  isometricGridToScreen,
  orthogonalScreenToGrid,
  orthogonalGridToScreen,
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
