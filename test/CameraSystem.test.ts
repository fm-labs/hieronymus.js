import { describe, expect, it } from 'vitest'
import { zoomCameraAt } from '../lib/systems/CameraSystem'

// screen → world, as the TileMapSystem draws: translate(-offset), then scale(zoom)
const toWorld = (c: { offset: { x: number; y: number }; zoom: number }, x: number, y: number) => ({
  x: (x + c.offset.x) / c.zoom,
  y: (y + c.offset.y) / c.zoom,
})

describe('zoomCameraAt', () => {
  const camera = { offset: { x: -300, y: 40 }, zoom: 1 }

  it('keeps the point under the cursor in place', () => {
    const before = toWorld(camera, 420, 180)
    const zoomed = zoomCameraAt(camera, 1.7, { x: 420, y: 180 }, 0.05, 10)
    expect(zoomed.zoom).toBeCloseTo(1.7)
    const after = toWorld(zoomed, 420, 180)
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
  })

  it('stops at the limits', () => {
    expect(zoomCameraAt(camera, 100, { x: 0, y: 0 }, 0.05, 10).zoom).toBe(10)
    expect(zoomCameraAt(camera, 0.001, { x: 0, y: 0 }, 0.05, 10).zoom).toBe(0.05)
  })

  it('lets a zoom outside the limits move back towards them, but not further', () => {
    const far = { ...camera, zoom: 0.02 }
    expect(zoomCameraAt(far, 0.5, { x: 0, y: 0 }, 0.05, 10).zoom).toBe(0.02)
    expect(zoomCameraAt(far, 1.5, { x: 0, y: 0 }, 0.05, 10).zoom).toBeCloseTo(0.03)
  })
})
