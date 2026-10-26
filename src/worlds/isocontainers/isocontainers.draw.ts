/**
 * Drawing helpers of the 'isocontainers' world. It shares the look of 'isoflow' (dark slate, thin light
 * outlines, monospace captions, green light) and its projection; the buildings are extruded boxes,
 * the volumes cylinders, and each network has an accent color.
 */
import { COLORS, FONT, FlowProjection, fit, roundRect } from '../isoflow/isoflow.draw.ts'
import type { Container, Entity, GridPoint } from './isocontainers.types.ts'

export { COLORS, FONT, FlowProjection, fit, roundRect }

export const PALETTE = {
  plate: '#0b1113',
  lot: 'rgba(255,255,255,0.025)',
  lotLine: 'rgba(200,220,212,0.08)',
  asphalt: '#0d1517',
  asphaltEdge: 'rgba(200,220,212,0.14)',
  roof: '#162124',
  roofEdge: '#1f2d30',
  faceLeft: '#0f181a',
  faceRight: '#0a1113',
  volume: '#4cc9f0',
  reply: 'rgba(225,245,235,0.85)',
  cross: '#a78bfa',
}

/** Plane units per cell */
export const U = 64

/** Shared by all components, the system updates it every frame */
export type ContainersScene = {
  time: number
  /** The visible part of the world, in world coordinates */
  view: { x0: number; y0: number; x1: number; y1: number }
  projection: FlowProjection
  hovered?: Entity
  selected?: Entity
  /** The selected entity, its neighbors and their links; everything else steps back */
  focus?: Set<unknown>
  /** The camera zoom, so markers stay readable from far away */
  zoom: number
}

export const isVisible = (scene: ContainersScene, x: number, y: number, margin = 200) =>
  x > scene.view.x0 - margin &&
  x < scene.view.x1 + margin &&
  y > scene.view.y0 - margin &&
  y < scene.view.y1 + margin

/** The opacity of something, by the focus: full when in focus (or no focus), faint otherwise */
export const focusAlpha = (scene: ContainersScene, thing: unknown, dim = 0.22) =>
  !scene.focus || scene.focus.has(thing) ? 1 : dim

/** The accent of a container's state */
/** The accent of a container's state: green up, amber in between, red broken, grey stopped cleanly */
export function stateColor(c: Container): string {
  if (c.state === 'running')
    return c.health === 'unhealthy'
      ? COLORS.red
      : c.health === 'starting'
        ? COLORS.amber
        : COLORS.green
  if (c.state === 'paused' || c.state === 'restarting') return COLORS.amber
  if (c.state === 'created' || (c.state === 'exited' && !c.exitCode)) return COLORS.muted
  return COLORS.red
}

export function stateText(c: Container): string {
  if (c.state === 'running' && c.health)
    return c.health === 'healthy' ? 'HEALTHY' : c.health.toUpperCase()
  if (c.state === 'restarting' && c.transition > 0) return 'STARTING'
  if (c.state === 'exited' && c.exitCode !== undefined) return `EXITED (${c.exitCode})`
  return c.state.toUpperCase()
}

export const hexAlpha = (hex: string, alpha: number) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

/** A polygon through screen points */
export function poly(ctx: CanvasRenderingContext2D, points: GridPoint[]) {
  ctx.beginPath()
  ctx.moveTo(...points[0])
  for (let i = 1; i < points.length; i++) ctx.lineTo(...points[i])
  ctx.closePath()
}

/**
 * The two visible sides of a box standing on the grid: the left face (at the front row, facing +rows)
 * and the right face (at the last column, facing +cols). The top is drawn by the caller on the plane.
 */
export function boxSides(
  ctx: CanvasRenderingContext2D,
  P: FlowProjection,
  c0: number,
  r0: number,
  w: number,
  d: number,
  z0: number,
  z1: number,
  left: string | CanvasGradient,
  right: string | CanvasGradient,
) {
  const [c1, r1] = [c0 + w, r0 + d]
  poly(ctx, [P.at(c0, r1, z0), P.at(c1, r1, z0), P.at(c1, r1, z1), P.at(c0, r1, z1)])
  ctx.fillStyle = left
  ctx.fill()
  poly(ctx, [P.at(c1, r1, z0), P.at(c1, r0, z0), P.at(c1, r0, z1), P.at(c1, r1, z1)])
  ctx.fillStyle = right
  ctx.fill()
}

/** A quad on the left face of a box (at row r), from column ca to cb and height za to zb */
export function leftQuad(
  P: FlowProjection,
  r: number,
  ca: number,
  cb: number,
  za: number,
  zb: number,
): GridPoint[] {
  return [P.at(ca, r, za), P.at(cb, r, za), P.at(cb, r, zb), P.at(ca, r, zb)]
}

/** A quad on the right face of a box (at column c), from row ra to rb and height za to zb */
export function rightQuad(
  P: FlowProjection,
  c: number,
  ra: number,
  rb: number,
  za: number,
  zb: number,
): GridPoint[] {
  return [P.at(c, ra, za), P.at(c, rb, za), P.at(c, rb, zb), P.at(c, ra, zb)]
}

/** The screen radii of a circle of r cells lying on the plane */
export function circleRadii(P: FlowProjection, r: number): [number, number] {
  // the extremes of the ellipse are on the diagonals of the grid
  const k = r / Math.SQRT2
  const [x0, y0] = P.at(0, 0)
  const [x1] = P.at(k, -k)
  const [, y1] = P.at(k, k)
  return [Math.abs(x1 - x0), Math.abs(y1 - y0)]
}

/** The side of a cylinder standing on the grid, shaded from left to right */
export function cylinderSide(
  ctx: CanvasRenderingContext2D,
  P: FlowProjection,
  col: number,
  row: number,
  r: number,
  z0: number,
  z1: number,
  light: string,
  dark: string,
) {
  const [rx, ry] = circleRadii(P, r)
  const [cx, cb] = P.at(col, row, z0)
  const [, ct] = P.at(col, row, z1)
  const gradient = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0)
  gradient.addColorStop(0, light)
  gradient.addColorStop(1, dark)
  ctx.beginPath()
  ctx.moveTo(cx - rx, ct)
  ctx.lineTo(cx - rx, cb)
  ctx.ellipse(cx, cb, rx, ry, 0, Math.PI, 0, true)
  ctx.lineTo(cx + rx, ct)
  ctx.closePath()
  ctx.fillStyle = gradient
  ctx.fill()
}

/** A rounded polyline through screen points */
export function trace(ctx: CanvasRenderingContext2D, points: GridPoint[], radius = 8) {
  ctx.beginPath()
  ctx.moveTo(...points[0])
  const dist = (a: GridPoint, b: GridPoint) => Math.hypot(b[0] - a[0], b[1] - a[1])
  for (let i = 1; i < points.length - 1; i++) {
    const r = Math.min(
      radius,
      dist(points[i - 1], points[i]) / 2,
      dist(points[i], points[i + 1]) / 2,
    )
    ctx.arcTo(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], r)
  }
  ctx.lineTo(...points[points.length - 1])
}

/** A point on a quadratic curve */
export function quadAt(a: GridPoint, c: GridPoint, b: GridPoint, t: number): GridPoint {
  const u = 1 - t
  return [
    u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
    u * u * a[1] + 2 * u * t * c[1] + t * t * b[1],
  ]
}

/** The control point of an arc between two screen points: it rises with the distance */
export function arcControl(a: GridPoint, b: GridPoint): GridPoint {
  const lift = 40 + Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.32
  return [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - lift]
}

/** A pill with text, upright on screen: labels above buildings */
export function pill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color: string,
  sub?: string,
) {
  ctx.save()
  ctx.font = `600 13px ${FONT.ui}`
  const w1 = ctx.measureText(text).width
  ctx.font = `600 10px ${FONT.mono}`
  const w2 = sub ? ctx.measureText(sub).width + 10 : 0
  const w = w1 + w2 + 30
  ctx.fillStyle = 'rgba(9,13,14,0.9)'
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(x - w / 2, y - 26, w, 22, 11)
  ctx.fill()
  ctx.stroke()
  // the stem
  ctx.beginPath()
  ctx.moveTo(x, y - 4)
  ctx.lineTo(x, y + 2)
  ctx.stroke()
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x - w / 2 + 12, y - 15, 3.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.textBaseline = 'middle'
  ctx.font = `600 13px ${FONT.ui}`
  ctx.fillStyle = COLORS.text
  ctx.fillText(text, x - w / 2 + 22, y - 14.5)
  if (sub) {
    ctx.font = `600 10px ${FONT.mono}`
    ctx.fillStyle = COLORS.muted
    ctx.fillText(sub, x - w / 2 + 32 + w1, y - 14)
  }
  ctx.restore()
}
