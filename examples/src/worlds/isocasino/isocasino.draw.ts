/**
 * More isometric drawing helpers, next to the box helpers of the 'isocity' world.
 * (x, y) is the screen position of the center of the footprint on the ground.
 */
import { shadeColor } from '../isocity/isocity.draw.ts'

export type Point = [number, number]

/** Like shadeColor, but returns '#rrggbb', so the result can be shaded again (e.g. by drawIsoBox) */
export function shadeHex(hex: string, amount: number): string {
  const channels = shadeColor(hex, amount).match(/\d+/g)!.map(Number)
  return '#' + channels.map((v) => v.toString(16).padStart(2, '0')).join('')
}

/** A point between a and b, t = 0 at a and 1 at b */
export const along = (a: Point, b: Point, t: number): Point => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
]

/**
 * A rectangle on the side face of a box, e.g. a screen or a window.
 * a and b are two top corners of the box; t0..t1 runs along the edge, y0..y1 down from the top.
 */
export function drawFaceRect(
  ctx: CanvasRenderingContext2D,
  a: Point,
  b: Point,
  t0: number,
  t1: number,
  y0: number,
  y1: number,
  fill: string,
) {
  const p0 = along(a, b, t0)
  const p1 = along(a, b, t1)
  ctx.beginPath()
  ctx.moveTo(p0[0], p0[1] + y0)
  ctx.lineTo(p1[0], p1[1] + y0)
  ctx.lineTo(p1[0], p1[1] + y1)
  ctx.lineTo(p0[0], p0[1] + y1)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

/** Screen radii of a circle on the ground with a radius in cells */
export const isoRadii = (tileSize: number, radius: number): [number, number] => [
  radius * (tileSize / 2) * Math.SQRT2,
  radius * (tileSize / 4) * Math.SQRT2,
]

/** A flat circle on the ground (or lifted by `elevation` pixels) */
export function drawIsoDisc(
  ctx: CanvasRenderingContext2D,
  tileSize: number,
  x: number,
  y: number,
  radius: number,
  fill: string | CanvasGradient,
  elevation = 0,
) {
  const [rx, ry] = isoRadii(tileSize, radius)
  ctx.beginPath()
  ctx.ellipse(x, y - elevation, rx, ry, 0, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
}

/** An upright cylinder: the visible half of the side, and the top */
export function drawIsoCylinder(
  ctx: CanvasRenderingContext2D,
  tileSize: number,
  x: number,
  y: number,
  radius: number,
  height: number,
  color: string,
  elevation = 0,
) {
  const [rx, ry] = isoRadii(tileSize, radius)
  const bottom = y - elevation
  const top = bottom - height
  ctx.beginPath()
  ctx.moveTo(x - rx, top)
  ctx.lineTo(x - rx, bottom)
  ctx.ellipse(x, bottom, rx, ry, 0, Math.PI, 0, true)
  ctx.lineTo(x + rx, top)
  ctx.closePath()
  const side = ctx.createLinearGradient(x - rx, 0, x + rx, 0)
  side.addColorStop(0, shadeColor(color, -0.1))
  side.addColorStop(1, shadeColor(color, -0.45))
  ctx.fillStyle = side
  ctx.fill()
  drawIsoDisc(ctx, tileSize, x, top, radius, color)
}

/**
 * Colored sectors of a wheel lying flat on the ground (roulette) or standing upright (money wheel),
 * turned by `angle` radians.
 */
export function drawWheel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  colors: string[],
  angle: number,
  flat: boolean,
) {
  ctx.save()
  ctx.translate(x, y)
  // a circle on the ground is squashed to half its height in this projection
  if (flat) ctx.scale(1, 0.5)
  const step = (Math.PI * 2) / colors.length
  colors.forEach((color, i) => {
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.arc(0, 0, radius, angle + i * step, angle + (i + 1) * step)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
  })
  ctx.beginPath()
  ctx.arc(0, 0, radius * 0.25, 0, Math.PI * 2)
  ctx.fillStyle = '#d4af37'
  ctx.fill()
  ctx.restore()
}
