/**
 * The drawing kit of the 'isovienna' world. It builds on the painter of 'isovegas'
 * (boxes, cylinders, cones, pyramids that darken at night) and adds what old Vienna is made of:
 * hip roofs, copper domes, rows of windows, town houses and chestnut trees.
 */
import {
  along,
  IsoPainter,
  isoOffset,
  isoRadii,
  mix,
  noise,
  shade,
  type IsoBox,
  type Point,
} from '../isovegas/isovegas.draw.ts'

export { along, IsoPainter, isoOffset, isoRadii, mix, noise, shade, type IsoBox, type Point }

export const SNOW = '#f3f6fa'
/** Weathered copper, the green of Vienna's domes and roofs */
export const COPPER = '#6fa58c'
/** Schönbrunn yellow */
export const IMPERIAL_YELLOW = '#f0c34e'
export const GOLD = '#e7b53c'

/** The color of a roof, white with snow in winter */
export const roofColor = (color: string, winter: boolean) =>
  winter ? mix(color, SNOW, 0.82) : color

/**
 * A hip roof on a rectangular footprint centered on (x, y): the ridge runs along the longer side.
 * All four faces are drawn, back to front, so shallow roofs have no gaps.
 * Returns the middle of the ridge.
 */
export function hipRoof(
  p: IsoPainter,
  x: number,
  y: number,
  cols: number,
  rows: number,
  height: number,
  color: string,
  elevation = 0,
): Point {
  const a = cols / 2
  const b = rows / 2
  const top = y - elevation
  const pt = (dc: number, dr: number, h = 0): Point => {
    const [dx, dy] = isoOffset(p.tileSize, dc, dr)
    return [x + dx, top + dy - h]
  }
  const back = pt(-a, -b)
  const right = pt(a, -b)
  const front = pt(a, b)
  const left = pt(-a, b)
  const alongCols = cols >= rows
  // r1 is the back end of the ridge, r2 the front end
  const r1 = alongCols ? pt(-a + b, 0, height) : pt(0, -b + a, height)
  const r2 = alongCols ? pt(a - b, 0, height) : pt(0, b - a, height)
  const base = p.c(color)
  if (alongCols) {
    p.poly([back, right, r2, r1], shade(base, 0.08))
    p.poly([back, left, r1], shade(base, 0.02))
    p.poly([left, front, r2, r1], shade(base, -0.06))
    p.poly([front, right, r2], shade(base, -0.32))
  } else {
    p.poly([back, left, r2, r1], shade(base, 0.02))
    p.poly([back, right, r1], shade(base, 0.08))
    p.poly([front, right, r1, r2], shade(base, -0.32))
    p.poly([left, front, r2], shade(base, -0.06))
  }
  return along(r1, r2, 0.5)
}

/** A dome on a round drum, with a lantern and a golden ball on top. Returns the top point. */
export function dome(
  p: IsoPainter,
  x: number,
  y: number,
  radius: number,
  height: number,
  color: string,
  elevation = 0,
  lantern = true,
): Point {
  const { ctx } = p
  const [rx, ry] = isoRadii(p.tileSize, radius)
  const base = y - elevation
  const c = p.c(color)
  const fill = ctx.createLinearGradient(x - rx, 0, x + rx, 0)
  fill.addColorStop(0, shade(c, 0.12))
  fill.addColorStop(0.45, c)
  fill.addColorStop(1, shade(c, -0.45))
  ctx.beginPath()
  ctx.ellipse(x, base, rx, ry, 0, 0, Math.PI)
  ctx.ellipse(x, base, rx, height, 0, Math.PI, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
  // ribs
  ctx.strokeStyle = shade(c, -0.2)
  ctx.lineWidth = 0.8
  for (const t of [-0.6, -0.25, 0.1, 0.45]) {
    ctx.beginPath()
    ctx.ellipse(
      x,
      base,
      rx * Math.abs(t),
      height,
      0,
      t < 0 ? Math.PI : Math.PI * 1.5,
      t < 0 ? Math.PI * 1.5 : Math.PI * 2,
    )
    ctx.stroke()
  }
  let top: Point = [x, base - height]
  if (lantern) {
    p.cylinder(x, top[1] + 1, radius * 0.18, 7, '#ece4d2')
    const cap = dome(p, x, top[1] - 6, radius * 0.2, 5, color, 0, false)
    ball(p, cap[0], cap[1] - 2, 1.8)
    top = [x, cap[1] - 4]
  }
  return top
}

/** A small golden ball, e.g. on top of a dome or a spire */
export function ball(p: IsoPainter, x: number, y: number, radius: number, color = GOLD) {
  const { ctx } = p
  ctx.fillStyle = p.c(color)
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
}

/** A square spire: a thin pyramid, with a golden ball on top. Returns the apex. */
export function spire(
  p: IsoPainter,
  x: number,
  y: number,
  size: number,
  height: number,
  color: string,
  elevation = 0,
): Point {
  const { apex } = p.pyramid(x, y, size, size, height, color, elevation)
  ball(p, apex[0], apex[1], 1.4)
  return apex
}

export type FacadeOptions = {
  /** Floors with windows (default: one per 9 px of height) */
  floors?: number
  /** Windows per cell of wall (default 3) */
  perCell?: number
  /** The color of the window glass by day */
  glass?: string
  /** Arched windows, e.g. for palaces and churches */
  arched?: boolean
  /** The height of the windows, relative to a floor (default 0.5) */
  tall?: number
  /** Leave out the ground floor, e.g. for a shop window band */
  skipGround?: boolean
}

/**
 * Rows of windows on the two visible walls of a box. Some are lit at night,
 * `seed` keeps the lit ones the same in every frame.
 */
export function facade(
  p: IsoPainter,
  x: number,
  y: number,
  box: IsoBox,
  seed: number,
  o: FacadeOptions = {},
) {
  const { ctx } = p
  const [, right, front, left] = p.boxTop(x, y, box)
  const floors = o.floors ?? Math.max(1, Math.floor(box.height / 9))
  const perCell = o.perCell ?? 3
  const tall = o.tall ?? 0.5
  const glass = p.c(o.glass ?? '#4c5a68')
  const faces: Array<[Point, Point, number, number]> = [
    [left, front, Math.max(1, Math.round(box.cols * perCell)), -0.02],
    [front, right, Math.max(1, Math.round(box.rows * perCell)), -0.28],
  ]
  const floorHeight = box.height / floors
  faces.forEach(([a, b, count, dark], face) => {
    for (let f = o.skipGround ? 1 : 0; f < floors; f++) {
      // floors counted from the top
      const v0 = floorHeight * (f + (1 - tall) / 2)
      const v1 = v0 + floorHeight * tall
      for (let i = 0; i < count; i++) {
        const s = along(a, b, (i + 0.3) / count)
        const e = along(a, b, (i + 0.7) / count)
        const quad: Point[] = [
          [s[0], s[1] + v0],
          [e[0], e[1] + v0],
          [e[0], e[1] + v1],
          [s[0], s[1] + v1],
        ]
        p.poly(quad, shade(glass, dark))
        const lit = p.night > 0 && noise(seed, f * 31 + i, face) > 0.42
        if (lit) {
          ctx.globalAlpha = p.night * 0.9
          p.poly(quad, face ? '#e9b15e' : '#ffd88a')
          ctx.globalAlpha = 1
        }
        if (o.arched) {
          ctx.fillStyle = lit ? `rgba(255,216,138,${p.night})` : shade(glass, dark)
          ctx.beginPath()
          ctx.ellipse(
            (s[0] + e[0]) / 2,
            (s[1] + e[1]) / 2 + v0,
            Math.abs(e[0] - s[0]) / 2,
            1.6,
            0,
            Math.PI,
            0,
          )
          ctx.fill()
        }
      }
    }
  })
}

/** A cornice: a thin ledge around a box at some height */
export function cornice(
  p: IsoPainter,
  x: number,
  y: number,
  box: IsoBox,
  at: number,
  color = '#f6f1e6',
) {
  p.box(x, y, {
    cols: box.cols + 0.05,
    rows: box.rows + 0.05,
    height: 2,
    elevation: (box.elevation ?? 0) + at,
    color,
  })
}

export type BuildingOptions = {
  /** The height of the hip roof (default: depends on the footprint), 0 for a flat roof */
  roofHeight?: number
  facade?: FacadeOptions
  /** A white ledge at the top of the walls */
  trim?: string
  elevation?: number
  shadow?: boolean
}

/** A classic Viennese building: walls with windows, a cornice and a hip roof. Returns the top of the roof. */
export function building(
  p: IsoPainter,
  x: number,
  y: number,
  cols: number,
  rows: number,
  height: number,
  wall: string,
  roof: string,
  seed: number,
  o: BuildingOptions = {},
): Point {
  const elevation = o.elevation ?? 0
  const box: IsoBox = { cols, rows, height, color: wall, elevation }
  if (o.shadow !== false && !elevation) p.shadow(x, y, cols, rows)
  p.box(x, y, box)
  facade(p, x, y, box, seed, o.facade)
  cornice(p, x, y, box, height - 2, o.trim)
  const roofHeight = o.roofHeight ?? Math.min(cols, rows) * 14
  if (roofHeight <= 0) {
    p.box(x, y, { cols, rows, height: 0.01, elevation: elevation + height, color: roof })
    return [x, y - elevation - height]
  }
  return hipRoof(p, x, y, cols + 0.06, rows + 0.06, roofHeight, roof, elevation + height)
}

const HOUSE_COLORS = [
  '#f2e3c2',
  '#efd2b8',
  '#e9e2d4',
  '#f4d98e',
  '#d9e4cf',
  '#ecc9a8',
  '#f1ece2',
  '#e6cfa3',
]
const HOUSE_ROOFS = ['#b0553a', '#9a4a35', '#7d8a93', '#b8634a']

/** A Gründerzeit town house on one cell, in a pastel color picked by the seed */
export function townHouse(
  p: IsoPainter,
  x: number,
  y: number,
  seed: number,
  winter: boolean,
  size = 0.82,
) {
  const wall = HOUSE_COLORS[Math.floor(noise(seed, 1) * HOUSE_COLORS.length)]
  const roof = roofColor(HOUSE_ROOFS[Math.floor(noise(seed, 2) * HOUSE_ROOFS.length)], winter)
  const height = 20 + Math.floor(noise(seed, 3) * 4) * 4
  building(p, x, y, size, size, height, wall, roof, seed, {
    roofHeight: 9 + noise(seed, 4) * 5,
    facade: { floors: Math.round(height / 8), perCell: 3.6, tall: 0.55 },
  })
  // a shop window band on the ground floor
  const [, right, front, left] = p.boxTop(x, y, { cols: size, rows: size, height, color: wall })
  const band = (a: Point, b: Point, color: string) =>
    p.poly(
      [
        [a[0], a[1] + height - 5],
        [b[0], b[1] + height - 5],
        [b[0], b[1] + height],
        [a[0], a[1] + height],
      ],
      color,
    )
  band(along(left, front, 0.08), along(left, front, 0.92), shade(p.c(wall), -0.35))
  band(along(front, right, 0.08), along(front, right, 0.92), shade(p.c(wall), -0.5))
  if (p.night > 0) {
    p.ctx.globalAlpha = p.night * 0.7
    band(along(left, front, 0.12), along(left, front, 0.88), '#ffcf7a')
    p.ctx.globalAlpha = 1
  }
}

/** A chestnut tree with a round crown, bare and snowy in winter */
export function tree(
  p: IsoPainter,
  x: number,
  y: number,
  size: number,
  seed: number,
  winter: boolean,
  time = 0,
) {
  const { ctx } = p
  ctx.fillStyle = `rgba(0,0,0,${0.15 * (1 - p.night * 0.6)})`
  ctx.beginPath()
  ctx.ellipse(x + 6, y + 2, 9 * size, 4 * size, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = p.c('#6d4c35')
  ctx.fillRect(x - 1.5, y - 12 * size, 3, 12 * size)
  const sway = Math.sin(time * 1.1 + seed) * 0.8
  const cx = x + sway
  const cy = y - 20 * size
  if (winter) {
    ctx.strokeStyle = p.c('#5d4636')
    ctx.lineWidth = 1.2
    for (let i = 0; i < 6; i++) {
      const angle = -Math.PI / 2 + (noise(seed, i) - 0.5) * 2.2
      ctx.beginPath()
      ctx.moveTo(x, y - 10 * size)
      ctx.lineTo(cx + Math.cos(angle) * 11 * size, cy + Math.sin(angle) * 9 * size)
      ctx.stroke()
    }
    ctx.fillStyle = p.c(SNOW)
    for (let i = 0; i < 5; i++) {
      ctx.beginPath()
      ctx.arc(
        cx + (noise(seed, i, 7) - 0.5) * 16 * size,
        cy + (noise(seed, i, 8) - 0.6) * 12 * size,
        2.2,
        0,
        Math.PI * 2,
      )
      ctx.fill()
    }
    return
  }
  const green = noise(seed, 5) > 0.5 ? '#4f8d3f' : '#5c9a45'
  const blobs: Array<[number, number, number, number]> = [
    [-5, 2, 8, -0.2],
    [5, 2, 8, -0.3],
    [0, -4, 9, 0],
    [-3, -1, 6, 0.08],
  ]
  for (const [dx, dy, r, light] of blobs) {
    ctx.fillStyle = shade(p.c(green), light)
    ctx.beginPath()
    ctx.arc(cx + dx * size, cy + dy * size, r * size, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** A cone-shaped topiary, e.g. in a baroque garden */
export function topiary(p: IsoPainter, x: number, y: number, height: number, winter: boolean) {
  p.cone(x, y, 0.09, height, roofColor('#3e7a3a', winter), 0, 8)
}

/** A flag on a pole, waving */
export function flag(
  p: IsoPainter,
  x: number,
  y: number,
  height: number,
  colors: string[],
  time: number,
) {
  const { ctx } = p
  ctx.strokeStyle = p.c('#cfd3d6')
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y - height)
  ctx.stroke()
  const stripe = 3
  colors.forEach((color, i) => {
    const top = y - height + i * stripe
    const wave = (dx: number) => Math.sin(time * 4 + dx * 0.4) * 1.2
    p.poly(
      [
        [x, top],
        [x + 12, top + wave(12)],
        [x + 12, top + stripe + wave(12)],
        [x, top + stripe],
      ],
      p.c(color),
    )
  })
}

/** A bronze equestrian statue on a pedestal */
export function horseman(p: IsoPainter, x: number, y: number, scale = 1, color = '#4f7a68') {
  const { ctx } = p
  p.box(x, y, { cols: 0.32 * scale, rows: 0.2 * scale, height: 12 * scale, color: '#e3dccb' })
  const top = y - 12 * scale - 2
  ctx.fillStyle = p.c(color)
  ctx.beginPath()
  // the horse rearing up
  ctx.ellipse(x, top - 4 * scale, 6 * scale, 3 * scale, -0.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillRect(x - 4 * scale, top - 3 * scale, 1.5 * scale, 5 * scale)
  ctx.fillRect(x + 1 * scale, top - 2 * scale, 1.5 * scale, 4 * scale)
  ctx.beginPath()
  ctx.ellipse(x + 5 * scale, top - 9 * scale, 1.8 * scale, 3.5 * scale, 0.5, 0, Math.PI * 2)
  ctx.fill()
  // the rider
  ctx.fillRect(x - 1 * scale, top - 13 * scale, 2.5 * scale, 6 * scale)
  ctx.beginPath()
  ctx.arc(x + 0.2 * scale, top - 14.5 * scale, 1.5 * scale, 0, Math.PI * 2)
  ctx.fill()
}
