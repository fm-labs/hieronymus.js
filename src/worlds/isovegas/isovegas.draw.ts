/**
 * The drawing kit of the 'isovegas' world: isometric shapes that darken at night.
 * Positions (x, y) are screen points on the ground, sizes are in cells (footprints) and pixels (heights).
 */
import { isoOffset, type IsoBox } from '../isocity/isocity.draw.ts'

export { isoOffset, type IsoBox }

export type Point = [number, number]

const NIGHT_COLOR = [11, 15, 46]

const rgb = (hex: string): number[] => {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const hex = (channels: number[]) =>
  '#' +
  channels
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')

/** Blend two '#rrggbb' colors, t = 0 gives a and 1 gives b */
export function mix(a: string, b: string, t: number): string {
  const ca = rgb(a)
  const cb = rgb(b)
  return hex(ca.map((v, i) => v + (cb[i] - v) * t))
}

/** Darken (amount < 0) or lighten (amount > 0) a '#rrggbb' color */
export function shade(color: string, amount: number): string {
  return mix(color, amount < 0 ? '#000000' : '#ffffff', Math.abs(amount))
}

const tintCache = new Map<string, string>()

/** The color of a surface at night: darker and bluer. `night` is 0 (day) to 1 (night). */
export function tint(color: string, night: number): string {
  if (night <= 0) return color
  // a few steps are enough for a smooth dusk, and keep the cache small
  const step = Math.round(night * 20)
  const key = color + step
  let result = tintCache.get(key)
  if (!result) {
    result = hex(rgb(color).map((v, i) => v + (NIGHT_COLOR[i] - v) * (step / 20) * 0.62))
    tintCache.set(key, result)
  }
  return result
}

/** A point between a and b, t = 0 at a and 1 at b */
export const along = (a: Point, b: Point, t: number): Point => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
]

/** A pseudo random number 0..1 that is always the same for the same inputs */
export const noise = (a: number, b = 0, c = 0) => {
  const n = ((a * 73856093) ^ (b * 19349663) ^ (c * 83492791)) >>> 0
  return ((n * 2654435761) >>> 0) / 4294967296
}

type Drawing = { depth: number; draw: () => void }

/**
 * Draws isometric shapes on a canvas. All surface colors go through `c()`, which darkens them at night,
 * lights and neon are drawn with their raw colors.
 *
 * Parts of a larger scene can be queued with a depth (col + row of their footprint center) and drawn
 * back to front with `flush()`.
 */
export class IsoPainter {
  private queue: Drawing[] = []

  constructor(
    readonly ctx: CanvasRenderingContext2D,
    readonly tileSize: number,
    readonly night: number,
    /** The screen position of grid point (0, 0) of `at()` */
    readonly origin: Point = [0, 0],
  ) {}

  /** The screen position of a grid point, relative to the origin */
  at(col: number, row: number): Point {
    const [dx, dy] = isoOffset(this.tileSize, col, row)
    return [this.origin[0] + dx, this.origin[1] + dy]
  }

  c(color: string): string {
    return tint(color, this.night)
  }

  later(col: number, row: number, draw: () => void) {
    this.queue.push({ depth: col + row, draw })
  }

  flush() {
    // stable sort: parts at the same depth keep their order
    this.queue.sort((a, b) => a.depth - b.depth)
    for (const { draw } of this.queue) {
      this.ctx.save()
      draw()
      this.ctx.restore()
    }
    this.queue = []
  }

  poly(points: Point[], fill: string | CanvasGradient) {
    const { ctx } = this
    ctx.beginPath()
    ctx.moveTo(points[0][0], points[0][1])
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1])
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()
  }

  /** A flat rectangle on the ground between two grid points of `at()` */
  ground(c0: number, r0: number, c1: number, r1: number, color: string, raw = false) {
    this.poly(
      [this.at(c0, r0), this.at(c1, r0), this.at(c1, r1), this.at(c0, r1)],
      raw ? color : this.c(color),
    )
  }

  /** A flat ellipse on the ground, with radii in cells along the columns and rows */
  groundEllipse(col: number, row: number, a: number, b: number, color: string | CanvasGradient) {
    const points: Point[] = []
    for (let i = 0; i < 32; i++) {
      const angle = (i / 32) * Math.PI * 2
      points.push(this.at(col + Math.cos(angle) * a, row + Math.sin(angle) * b))
    }
    this.poly(points, typeof color === 'string' ? this.c(color) : color)
  }

  /** The corners of a box's top face: back, right, front, left */
  boxTop(x: number, y: number, box: IsoBox): [Point, Point, Point, Point] {
    const a = box.cols / 2
    const b = box.rows / 2
    const top = y - box.height - (box.elevation ?? 0)
    const corner = (dc: number, dr: number): Point => {
      const [dx, dy] = isoOffset(this.tileSize, dc, dr)
      return [x + dx, top + dy]
    }
    return [corner(-a, -b), corner(a, -b), corner(a, b), corner(-a, b)]
  }

  /** A box: its top and its two visible sides. Returns the corners of the top face. */
  box(x: number, y: number, box: IsoBox): [Point, Point, Point, Point] {
    const top = this.boxTop(x, y, box)
    const [back, right, front, left] = top
    const down = (p: Point): Point => [p[0], p[1] + box.height]
    const color = this.c(box.color)
    this.poly([left, front, down(front), down(left)], shade(color, -0.15))
    this.poly([front, right, down(right), down(front)], shade(color, -0.35))
    this.poly([back, right, front, left], color)
    return top
  }

  shadow(x: number, y: number, cols: number, rows: number) {
    const [back, right, front, left] = this.boxTop(x + 5, y + 2, {
      cols,
      rows,
      height: 0,
      color: '',
    })
    this.poly([back, right, front, left], `rgba(0,0,0,${0.18 * (1 - this.night * 0.6)})`)
  }

  /**
   * Rows of windows on the two visible sides of a box: glass by day, randomly lit at night.
   * `seed` keeps the lit windows of a building the same in every frame.
   */
  windows(x: number, y: number, box: IsoBox, seed: number, glass = '#bfe3ff', spacing = 7) {
    const { ctx } = this
    const [, right, front, left] = this.boxTop(x, y, box)
    ctx.lineWidth = 2
    let floor = 0
    for (let dy = 6; dy < box.height - 3; dy += spacing) {
      floor++
      for (const [face, a, b] of [
        [0, left, front],
        [1, front, right],
      ] as Array<[number, Point, Point]>) {
        const start = along(a, b, 0.1)
        const end = along(a, b, 0.9)
        const line = () => {
          ctx.beginPath()
          ctx.moveTo(start[0], start[1] + dy)
          ctx.lineTo(end[0], end[1] + dy)
          ctx.stroke()
        }
        ctx.setLineDash([])
        ctx.strokeStyle = shade(this.c(glass), face === 0 ? -0.05 : -0.25)
        ctx.globalAlpha = 0.65
        line()
        if (this.night > 0) {
          // some windows are lit: a dash pattern that is different on every floor
          const r = noise(seed, floor, face)
          ctx.setLineDash([2 + r * 4, 2 + noise(seed, face, floor) * 9])
          ctx.lineDashOffset = r * 20
          ctx.strokeStyle = face === 0 ? '#ffd98a' : '#e8b86a'
          ctx.globalAlpha = this.night * 0.9
          line()
        }
      }
    }
    ctx.setLineDash([])
    ctx.globalAlpha = 1
  }

  /** A flat circle, with a radius in cells */
  disc(x: number, y: number, radius: number, color: string | CanvasGradient, elevation = 0) {
    const [rx, ry] = isoRadii(this.tileSize, radius)
    const { ctx } = this
    ctx.beginPath()
    ctx.ellipse(x, y - elevation, rx, ry, 0, 0, Math.PI * 2)
    ctx.fillStyle = typeof color === 'string' ? this.c(color) : color
    ctx.fill()
  }

  /** An upright cylinder: the visible half of the side, and the top */
  cylinder(x: number, y: number, radius: number, height: number, color: string, elevation = 0) {
    const [rx, ry] = isoRadii(this.tileSize, radius)
    const { ctx } = this
    const bottom = y - elevation
    const top = bottom - height
    const base = this.c(color)
    ctx.beginPath()
    ctx.moveTo(x - rx, top)
    ctx.lineTo(x - rx, bottom)
    ctx.ellipse(x, bottom, rx, ry, 0, Math.PI, 0, true)
    ctx.lineTo(x + rx, top)
    ctx.closePath()
    const side = ctx.createLinearGradient(x - rx, 0, x + rx, 0)
    side.addColorStop(0, shade(base, -0.05))
    side.addColorStop(1, shade(base, -0.42))
    ctx.fillStyle = side
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x, top, rx, ry, 0, 0, Math.PI * 2)
    ctx.fillStyle = base
    ctx.fill()
  }

  /** An upright cone, optionally with stripes (e.g. a circus tent or a beach umbrella) */
  cone(
    x: number,
    y: number,
    radius: number,
    height: number,
    colors: string | string[],
    elevation = 0,
    segments = 16,
  ) {
    const [rx, ry] = isoRadii(this.tileSize, radius)
    const base = y - elevation
    const apex: Point = [x, base - height]
    const stripes = Array.isArray(colors) ? colors : [colors]
    // the front half of the cone, from the left (angle pi) to the right (angle 0)
    for (let i = 0; i < segments; i++) {
      const a0 = Math.PI - (i / segments) * Math.PI
      const a1 = Math.PI - ((i + 1) / segments) * Math.PI
      const light = -0.05 - 0.4 * (i / segments)
      this.poly(
        [
          apex,
          [x + Math.cos(a0) * rx, base + Math.sin(a0) * ry],
          [x + Math.cos(a1) * rx, base + Math.sin(a1) * ry],
        ],
        shade(this.c(stripes[i % stripes.length]), light),
      )
    }
  }

  /** A pyramid on a rectangular footprint: the two visible faces */
  pyramid(
    x: number,
    y: number,
    cols: number,
    rows: number,
    height: number,
    color: string,
    elevation = 0,
  ) {
    const [, right, front, left] = this.boxTop(x, y, { cols, rows, height: 0, elevation, color })
    const apex: Point = [x, y - elevation - height]
    const base = this.c(color)
    this.poly([left, front, apex], shade(base, -0.05))
    this.poly([front, right, apex], shade(base, -0.35))
    return { apex, left, front, right }
  }

  /** Text standing upright, e.g. on a sign. Neon text glows at night. */
  text(
    text: string,
    x: number,
    y: number,
    size: number,
    color: string,
    glow = false,
    font = 'Arial',
  ) {
    const { ctx } = this
    ctx.save()
    ctx.font = `bold ${size}px ${font}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    if (glow && this.night > 0) {
      ctx.shadowColor = color
      ctx.shadowBlur = 8 * this.night
    }
    ctx.fillStyle = glow ? color : this.c(color)
    ctx.fillText(text, x, y)
    ctx.restore()
  }

  /** A soft round light, e.g. a lamp at night */
  light(x: number, y: number, radius: number, color: string, alpha: number) {
    if (alpha <= 0) return
    const { ctx } = this
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, color)
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

/** Screen radii of a circle on the ground with a radius in cells */
export const isoRadii = (tileSize: number, radius: number): [number, number] => [
  radius * (tileSize / 2) * Math.SQRT2,
  radius * (tileSize / 4) * Math.SQRT2,
]
