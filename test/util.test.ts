import { assert, expect, test } from 'vitest'
import {
  getIsometricGridPosition,
  getIsometricScreenPosition,
  getOrthogonalGridPosition,
  getOrthogonalScreenPosition,
} from '../lib/kernel/util'

test('getOrthogonalTilePosition', () => {
  expect(getOrthogonalScreenPosition(0, 0, 32)).toStrictEqual({ x: 0, y: 0 })
  expect(getOrthogonalScreenPosition(1, 0, 32)).toStrictEqual({ x: 32, y: 0 })
  expect(getOrthogonalScreenPosition(0, 1, 32)).toStrictEqual({ x: 0, y: 32 })
  expect(getOrthogonalScreenPosition(1, 1, 32)).toStrictEqual({ x: 32, y: 32 })
  expect(getOrthogonalScreenPosition(2, 2, 32)).toStrictEqual({ x: 64, y: 64 })
})

test('getOrthogonalGridPosition', () => {
  expect(getOrthogonalGridPosition(0, 0, 32)).toStrictEqual({ col: 0, row: 0 })
  expect(getOrthogonalGridPosition(31, 31, 32)).toStrictEqual({ col: 0, row: 0 })
  expect(getOrthogonalGridPosition(32, 32, 32)).toStrictEqual({ col: 1, row: 1 })
  expect(getOrthogonalGridPosition(0, 32, 32)).toStrictEqual({ col: 0, row: 1 })
  expect(getOrthogonalGridPosition(32, 0, 32)).toStrictEqual({ col: 1, row: 0 })
})

test('getIsometricTilePosition', () => {
  expect(getIsometricScreenPosition(0, 0, 128)).toStrictEqual({ x: 0, y: 0 })
  expect(getIsometricScreenPosition(0, 1, 128)).toStrictEqual({ x: -64, y: 32 })
  expect(getIsometricScreenPosition(1, 0, 128)).toStrictEqual({ x: 64, y: 32 })
  expect(getIsometricScreenPosition(1, 1, 128)).toStrictEqual({ x: 0, y: 64 })
  expect(getIsometricScreenPosition(2, 2, 128)).toStrictEqual({ x: 0, y: 128 })

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const { x, y } = getIsometricScreenPosition(i, j, 128)
      const { col, row } = getIsometricGridPosition(x, y, 128)
      expect(col).toBe(i)
      expect(row).toBe(j)

      const screenPos2 = getIsometricGridPosition(x + 1, y + 1, 128)
      expect(screenPos2.col).toBe(i)
      expect(screenPos2.row).toBe(j)

      // const screenPos3 = getIsometricGridPosition(x, y + 62, 128)
      // expect(screenPos3.col).toBe(i)
      // expect(screenPos3.row).toBe(j)
    }
  }
})
