/**
 * Drawing helpers of the soccer world, next to the box helpers of 'isocity' and 'isocasino'.
 */
import { isoOffset } from '../isocity/isocity.draw.ts'

/** Shared by all components, updated by the system every tick */
export type SoccerScene = {
  time: number
  /** 0..1, the crowd jumps after a goal */
  cheer: number
}

/** Pixels straight up for one cell of height (ball height, crossbar) */
export const heightPx = (tileSize: number) => tileSize * 0.55

/** A point in a cell whose top corner is at (x, y): `dc`, `dr` in cells from that corner, `h` pixels up */
export const cellPoint = (
  tileSize: number,
  x: number,
  y: number,
  dc: number,
  dr: number,
  h = 0,
): [number, number] => {
  const [dx, dy] = isoOffset(tileSize, dc, dr)
  return [x + dx, y + dy - h]
}

export function fillPolygon(
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  fill: string,
) {
  ctx.beginPath()
  ctx.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1])
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

export function strokeLine(
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  color: string,
  width: number,
) {
  ctx.beginPath()
  ctx.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1])
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.stroke()
}

/** A stable pseudo random number 0..1 for a cell, so nothing flickers between frames */
export const noise = (col: number, row: number, salt = 0) =>
  ((((col * 73856093) ^ (row * 19349663) ^ (salt * 83492791)) >>> 0) % 1000) / 1000

export const TEAM_COLORS = [
  { shirt: '#d32f2f', shorts: '#fafafa', socks: '#d32f2f', keeper: '#43a047' },
  { shirt: '#1e5bd8', shorts: '#14213d', socks: '#fafafa', keeper: '#fbc02d' },
]
