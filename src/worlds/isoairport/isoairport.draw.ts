/**
 * The drawing kit of the 'isoairport' world, on top of the `IsoPainter` of 'isovegas':
 * boxes at any angle, text painted on walls and on the ground, and the planes.
 */
import { isoOffset, IsoPainter, noise, shade, type Point } from '../isovegas/isovegas.draw.ts'
import { rightOf, type Vec } from './isoairport.airside.ts'

export { IsoPainter, isoOffset, noise, shade, type Point }

/** Screen pixels of one cell along a grid axis */
export const cellPixels = (tileSize: number) => (tileSize / 2) * Math.hypot(1, 0.5)

/**
 * Switch the context to grid space: (col, row) → screen, relative to `origin` (the screen point of
 * grid (0, 0)). Shapes and strokes drawn afterwards lie flat on the ground, line widths are in cells.
 */
export function toGridSpace(ctx: CanvasRenderingContext2D, tileSize: number, origin: Point) {
  ctx.transform(tileSize / 2, tileSize / 4, -tileSize / 2, tileSize / 4, origin[0], origin[1])
}

/**
 * Text on the ground, in grid space (see `toGridSpace`). `angle` is the reading direction in the
 * grid, `size` the height of the letters in cells.
 */
export function groundText(
  ctx: CanvasRenderingContext2D,
  text: string,
  col: number,
  row: number,
  angle: number,
  size: number,
  color: string,
) {
  ctx.save()
  ctx.translate(col, row)
  ctx.rotate(angle)
  // fonts are not rendered well at sizes below 1px, so scale them down instead
  ctx.scale(size / 40, size / 40)
  ctx.font = 'bold 40px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  ctx.fillText(text, 0, 0)
  ctx.restore()
}

/**
 * Text painted on a wall: the left face (along the columns, facing +rows) or the right face
 * (along the rows, facing +cols). (x, y) is the screen point where the middle of the text is.
 */
export function wallText(
  p: IsoPainter,
  text: string,
  x: number,
  y: number,
  face: 'left' | 'right',
  size: number,
  color: string,
  glow = false,
) {
  const { ctx } = p
  ctx.save()
  const k = 1 / Math.hypot(1, 0.5)
  // x along the wall, y straight down
  ctx.transform(k, face === 'left' ? k / 2 : -k / 2, 0, 1, x, y)
  p.text(text, 0, 0, size, color, glow)
  ctx.restore()
}

/**
 * A box standing on a footprint of any shape and angle, given as corners in grid space
 * (clockwise on screen). Only the sides facing the viewer are drawn, shaded by their direction.
 */
export function prism(
  p: IsoPainter,
  origin: Point,
  corners: Vec[],
  height: number,
  color: string,
  elevation = 0,
) {
  const ts = p.tileSize
  const screen = (v: Vec, z: number): Point => {
    const [dx, dy] = isoOffset(ts, v.col, v.row)
    return [origin[0] + dx, origin[1] + dy - z]
  }
  const base = p.c(color)
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i]
    const b = corners[(i + 1) % corners.length]
    // the outward normal of a clockwise polygon (rows grow downwards)
    const n = { col: b.row - a.row, row: -(b.col - a.col) }
    const towardsViewer = n.col + n.row
    if (towardsViewer <= 1e-9) continue
    // like the boxes of the other worlds: -15% facing +rows, -35% facing +cols
    const sideways = n.col / (Math.abs(n.col) + Math.abs(n.row))
    const light = Math.min(-0.08, -0.15 - sideways * 0.2)
    p.poly(
      [
        screen(a, elevation + height),
        screen(b, elevation + height),
        screen(b, elevation),
        screen(a, elevation),
      ],
      shade(base, light),
    )
  }
  p.poly(
    corners.map((v) => screen(v, elevation + height)),
    base,
  )
}

/** The corners of a rectangle centered on (col, row), turned to `heading`, clockwise on screen */
export function orientedRect(center: Vec, heading: Vec, length: number, width: number): Vec[] {
  const r = rightOf(heading)
  const at = (x: number, y: number) => ({
    col: center.col + heading.col * x + r.col * y,
    row: center.row + heading.row * x + r.row * y,
  })
  return [
    at(length / 2, -width / 2),
    at(length / 2, width / 2),
    at(-length / 2, width / 2),
    at(-length / 2, -width / 2),
  ]
}

export type PlaneKind = 'narrow' | 'wide' | 'jumbo' | 'regional' | 'cessna' | 'concorde'

type PlaneSpec = {
  /** In cells */
  length: number
  span: number
  /** Fuselage diameter, in pixels */
  diameter: number
  /** Wing chord at the root and sweep of the tips, in cells */
  chord: number
  sweep: number
  /** Engines, as fractions of the half span */
  engines: number[]
  engine: 'jet' | 'prop' | 'none'
  /** Height of the fin above the fuselage, in pixels */
  fin: number
  /** Horizontal tail span, in cells */
  stabilizer: number
  highWing?: boolean
  tTail?: boolean
  delta?: boolean
  hump?: boolean
  noseProp?: boolean
}

export const PLANE_SPECS: Record<PlaneKind, PlaneSpec> = {
  narrow: {
    length: 1.25,
    span: 1.2,
    diameter: 6,
    chord: 0.3,
    sweep: 0.22,
    engines: [0.34],
    engine: 'jet',
    fin: 13,
    stabilizer: 0.42,
  },
  wide: {
    length: 1.5,
    span: 1.45,
    diameter: 7.5,
    chord: 0.36,
    sweep: 0.28,
    engines: [0.34],
    engine: 'jet',
    fin: 17,
    stabilizer: 0.52,
  },
  jumbo: {
    length: 1.6,
    span: 1.55,
    diameter: 8,
    chord: 0.38,
    sweep: 0.3,
    engines: [0.3, 0.6],
    engine: 'jet',
    fin: 19,
    stabilizer: 0.56,
    hump: true,
  },
  regional: {
    length: 0.95,
    span: 0.98,
    diameter: 5,
    chord: 0.18,
    sweep: 0.02,
    engines: [0.32],
    engine: 'prop',
    fin: 11,
    stabilizer: 0.34,
    highWing: true,
    tTail: true,
  },
  cessna: {
    length: 0.45,
    span: 0.62,
    diameter: 3,
    chord: 0.1,
    sweep: 0,
    engines: [],
    engine: 'none',
    fin: 6,
    stabilizer: 0.2,
    highWing: true,
    noseProp: true,
  },
  concorde: {
    length: 1.5,
    span: 0.72,
    diameter: 4.5,
    chord: 0.9,
    sweep: 0.62,
    engines: [0.32],
    engine: 'jet',
    fin: 13,
    stabilizer: 0,
    delta: true,
  },
}

export type PlaneLook = {
  kind: PlaneKind
  /** Livery: fuselage stripe and tail */
  color: string
  tail: string
  /** Pixels above the ground */
  altitude?: number
  /** Seconds, for blinking lights and propellers */
  time: number
  /** Navigation lights, beacon and strobes */
  lights?: boolean
  /** The landing lights shine ahead */
  landingLights?: boolean
  /** A tug at the nose */
  tug?: boolean
  /** Service vehicles around the plane */
  service?: boolean
  /** A different blink for every plane */
  seed?: number
}

/**
 * A plane, with its center above the screen point (x, y) on the ground and its nose to `heading`
 * (a unit vector in grid space). It is drawn from the shadow up: wings and engines, fuselage, fin.
 */
export function drawPlane(p: IsoPainter, x: number, y: number, heading: Vec, look: PlaneLook) {
  const { ctx } = p
  const spec = PLANE_SPECS[look.kind]
  const ts = p.tileSize
  const alt = look.altitude ?? 0
  const right = rightOf(heading)
  const cells = cellPixels(ts)
  const L = spec.length
  const half = spec.diameter / 2
  const radius = half / cells
  const gear = look.kind === 'cessna' ? 2 : 3
  const zf = gear + half
  const zWing = spec.highWing ? zf + half * 0.8 : zf - half * 0.4

  /** Screen point of a plane-local point: x forwards, s to the right (cells), z up (pixels) */
  const pt = (px: number, s: number, z: number, lift = alt): Point => {
    const [dx, dy] = isoOffset(
      ts,
      heading.col * px + right.col * s,
      heading.row * px + right.row * s,
    )
    return [x + dx, y + dy - z - lift]
  }
  const stroke = (a: Point, b: Point, width: number, color: string) => {
    ctx.beginPath()
    ctx.moveTo(a[0], a[1])
    ctx.lineTo(b[0], b[1])
    ctx.lineWidth = width
    ctx.strokeStyle = color
    ctx.stroke()
  }

  // the outline of one wing (side -1 left, +1 right), and of the tail plane
  const wing = (side: number, z: number, lift = alt): Point[] => {
    if (spec.delta) {
      return [
        pt(0.12, side * radius, z, lift),
        pt(-0.5, side * (spec.span / 2), z, lift),
        pt(-0.62, side * (spec.span / 2), z, lift),
        pt(-0.66, side * radius, z, lift),
      ]
    }
    const lead = spec.chord / 2 + 0.04
    return [
      pt(lead, side * radius, z, lift),
      pt(lead - spec.sweep, side * (spec.span / 2), z, lift),
      pt(lead - spec.sweep - spec.chord * 0.38, side * (spec.span / 2), z, lift),
      pt(lead - spec.chord, side * radius, z, lift),
    ]
  }
  const stabilizer = (side: number, z: number, lift = alt): Point[] => {
    const back = -L / 2 + 0.04
    return [
      pt(back + 0.16, side * radius * 0.6, z, lift),
      pt(back + 0.04, side * (spec.stabilizer / 2), z, lift),
      pt(back - 0.03, side * (spec.stabilizer / 2), z, lift),
      pt(back, side * radius * 0.6, z, lift),
    ]
  }
  const nose = L / 2 - radius
  const tail = -L / 2 + radius

  // the shadow on the ground, fading and softening with altitude
  ctx.save()
  ctx.globalAlpha = Math.max(0, 0.22 * (1 - alt / 260) * (1 - p.night * 0.6))
  const shadowColor = '#000'
  p.poly(wing(-1, 0, 0), shadowColor)
  p.poly(wing(1, 0, 0), shadowColor)
  if (spec.stabilizer) {
    p.poly(stabilizer(-1, 0, 0), shadowColor)
    p.poly(stabilizer(1, 0, 0), shadowColor)
  }
  ctx.lineCap = 'round'
  stroke(pt(nose, 0, 0, 0), pt(tail, 0, 0, 0), spec.diameter, shadowColor)
  ctx.restore()

  ctx.lineCap = 'round'
  const wingColor = p.c(look.kind === 'concorde' ? '#eef1f3' : '#d3d9de')
  const body = p.c('#f7f8f9')

  const drawEngines = () => {
    for (const e of spec.engines) {
      for (const side of [-1, 1]) {
        const lead = spec.chord / 2 + 0.04
        const ex = spec.delta ? -0.42 : lead - spec.sweep * e * 1.0 + 0.07
        const es = side * e * (spec.span / 2)
        const ez = spec.highWing ? zWing - 1.5 : zWing - half * 0.55
        if (spec.engine === 'prop') {
          stroke(pt(ex + 0.05, es, ez), pt(ex - 0.12, es, ez), spec.diameter * 0.55, p.c('#c9ced3'))
          // a spinning propeller disc
          ctx.save()
          ctx.globalAlpha = 0.35
          const [px, py] = pt(ex + 0.1, es, ez)
          ctx.fillStyle = p.c('#455a64')
          ctx.beginPath()
          ctx.ellipse(px, py, 4.5, 4.5, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        } else {
          const length = spec.delta ? 0.28 : spec.length * 0.16
          stroke(
            pt(ex + length / 2, es, ez),
            pt(ex - length / 2, es, ez),
            spec.diameter * 0.62,
            p.c('#aeb6bd'),
          )
          const [ix, iy] = pt(ex + length / 2 + 0.01, es, ez)
          ctx.fillStyle = p.c('#37474f')
          ctx.beginPath()
          ctx.arc(ix, iy, spec.diameter * 0.2, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
  }

  if (!spec.highWing) {
    drawEngines()
    p.poly(wing(-1, zWing), wingColor)
    p.poly(wing(1, zWing), shade(wingColor, -0.06))
  }
  if (spec.stabilizer && !spec.tTail) {
    p.poly(stabilizer(-1, zf), wingColor)
    p.poly(stabilizer(1, zf), shade(wingColor, -0.06))
  }

  // the fuselage: a round stroke is the outline of a cylinder seen from any side
  stroke(pt(nose, 0, zf), pt(tail, 0, zf), spec.diameter, shade(body, -0.22))
  stroke(pt(nose, 0, zf + half * 0.2), pt(tail, 0, zf + half * 0.2), spec.diameter * 0.62, body)
  if (spec.hump) {
    stroke(
      pt(nose - 0.06, 0, zf + half * 0.45),
      pt(nose - 0.36, 0, zf + half * 0.45),
      spec.diameter * 0.6,
      body,
    )
  }
  // the livery stripe and the cockpit windows
  ctx.lineCap = 'butt'
  stroke(
    pt(nose - 0.08, 0, zf - half * 0.25),
    pt(tail + 0.12, 0, zf - half * 0.25),
    Math.max(1, spec.diameter * 0.2),
    p.c(look.color),
  )
  stroke(
    pt(nose + radius * 0.2, 0, zf + half * 0.35),
    pt(nose - radius * 0.7, 0, zf + half * 0.35),
    1.6,
    p.c('#263238'),
  )
  if (p.night > 0.2 && look.kind !== 'cessna') {
    // lit cabin windows
    ctx.save()
    ctx.setLineDash([1.2, 1.6])
    ctx.globalAlpha = p.night
    stroke(
      pt(nose - 0.12, 0, zf + half * 0.12),
      pt(tail + 0.15, 0, zf + half * 0.12),
      1.2,
      '#ffe3a0',
    )
    ctx.restore()
  }
  ctx.lineCap = 'round'

  // the fin
  const finBase = zf + half * 0.4
  const back = -L / 2 + 0.03
  const fin = [
    pt(back + 0.3, 0, finBase),
    pt(back + 0.1, 0, finBase + spec.fin),
    pt(back - 0.02, 0, finBase + spec.fin),
    pt(back, 0, finBase),
  ]
  p.poly(fin, p.c(look.tail))
  if (spec.tTail) {
    p.poly(stabilizer(-1, finBase + spec.fin), wingColor)
    p.poly(stabilizer(1, finBase + spec.fin), shade(wingColor, -0.06))
  }
  if (spec.highWing) {
    drawEngines()
    p.poly(wing(-1, zWing), wingColor)
    p.poly(wing(1, zWing), shade(wingColor, -0.06))
    // the struts of a light aircraft
    if (look.kind === 'cessna') {
      for (const side of [-1, 1])
        stroke(pt(0, side * radius, zf - half), pt(0.02, side * 0.18, zWing), 0.8, p.c('#90a4ae'))
    }
  }
  if (spec.noseProp) {
    ctx.save()
    ctx.globalAlpha = 0.4
    const [px, py] = pt(L / 2 + 0.02, 0, zf)
    ctx.fillStyle = p.c('#455a64')
    ctx.beginPath()
    ctx.ellipse(px, py, 3.5, 3.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  if (look.tug) {
    const center = { col: heading.col * (L / 2 + 0.12), row: heading.row * (L / 2 + 0.12) }
    prism(p, [x, y - alt], orientedRect(center, heading, 0.17, 0.12), 4, '#fbc02d')
  }
  if (look.service) drawService(p, x, y, heading, spec)
  if (look.lights) drawPlaneLights(p, pt, spec, zWing, finBase, look)
}

/** A belt loader, a catering truck and a fuel truck on the right side of a parked plane */
function drawService(p: IsoPainter, x: number, y: number, heading: Vec, spec: PlaneSpec) {
  const right = rightOf(heading)
  const at = (px: number, s: number) => ({
    col: heading.col * px + right.col * s,
    row: heading.row * px + right.row * s,
  })
  const L = spec.length
  // only big enough planes get the full service
  if (L < 0.9) return
  prism(p, [x, y], orientedRect(at(-L * 0.22, spec.span * 0.16), heading, 0.2, 0.08), 4, '#fdd835')
  prism(p, [x, y], orientedRect(at(L * 0.3, spec.span * 0.18), heading, 0.16, 0.1), 3, '#eceff1')
  prism(p, [x, y], orientedRect(at(L * 0.3, spec.span * 0.18), heading, 0.12, 0.1), 5, '#1e88e5', 3)
  prism(p, [x, y], orientedRect(at(-0.05, spec.span * 0.42), heading, 0.3, 0.1), 6, '#f5f5f5')
  prism(p, [x, y], orientedRect(at(0.11, spec.span * 0.42), heading, 0.08, 0.1), 6, '#d32f2f')
}

function drawPlaneLights(
  p: IsoPainter,
  pt: (x: number, s: number, z: number) => Point,
  spec: PlaneSpec,
  zWing: number,
  finBase: number,
  look: PlaneLook,
) {
  const { ctx } = p
  const t = look.time + (look.seed ?? 0) * 0.37
  const dot = (point: Point, color: string, size: number, glow: number) => {
    if (glow > 0) p.light(point[0], point[1], size * 5, color, glow)
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(point[0], point[1], size, 0, Math.PI * 2)
    ctx.fill()
  }
  const night = p.night
  const tip = spec.delta ? -0.56 : spec.chord / 2 + 0.04 - spec.sweep - spec.chord * 0.2
  // navigation lights: red on the left, green on the right, white at the tail
  if (night > 0.1) {
    dot(pt(tip, -spec.span / 2, zWing), '#ff2b2b', 1.2, night * 0.5)
    dot(pt(tip, spec.span / 2, zWing), '#2bff6a', 1.2, night * 0.5)
    dot(pt(-spec.length / 2, 0, finBase), '#ffffff', 1, night * 0.3)
  }
  // the red beacon blinks once a second, the white strobes flash twice
  if (t % 1 < 0.25) dot(pt(0, 0, finBase + 1), '#ff3d3d', 1.3, 0.25 + night * 0.5)
  const strobe = t % 1.3
  if (strobe < 0.06 || (strobe > 0.16 && strobe < 0.22)) {
    dot(pt(tip, -spec.span / 2, zWing), '#ffffff', 1.4, 0.4 + night * 0.5)
    dot(pt(tip, spec.span / 2, zWing), '#ffffff', 1.4, 0.4 + night * 0.5)
  }
  if (look.landingLights) {
    dot(pt(spec.length / 2 + 0.02, 0, finBase - 4), '#fff8e1', 1.8, 0.35 + night * 0.6)
    if (night > 0 && (look.altitude ?? 0) < 30) {
      // the beam on the ground ahead
      const [bx, by] = pt(spec.length / 2 + 0.7, 0, 0)
      p.light(bx, by + (look.altitude ?? 0), 26, 'rgba(255,244,214,1)', night * 0.35)
    }
  }
}

/** A round tree: trunk and two layers of leaves, different for every seed */
export function drawTree(p: IsoPainter, x: number, y: number, seed: number, size = 1) {
  const { ctx } = p
  const height = (16 + noise(seed, 3) * 8) * size
  const radius = (7 + noise(seed, 4) * 3) * size
  ctx.fillStyle = `rgba(0,0,0,${0.16 * (1 - p.night * 0.6)})`
  ctx.beginPath()
  ctx.ellipse(x + 5, y + 1, radius, radius / 2, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = p.c('#6d4c35')
  ctx.fillRect(x - 1.2, y - height * 0.5, 2.4, height * 0.5)
  const leaf = p.c(noise(seed, 5) > 0.5 ? '#3f7d3a' : '#4f8b3c')
  for (const [dy, r, light] of [
    [0.55, 1, -0.15],
    [0.78, 0.75, 0.05],
  ] as Array<[number, number, number]>) {
    ctx.fillStyle = shade(leaf, light)
    ctx.beginPath()
    ctx.arc(x, y - height * dy, radius * r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = shade(leaf, 0.18)
  ctx.beginPath()
  ctx.arc(x - radius * 0.3, y - height * 0.85, radius * 0.3, 0, Math.PI * 2)
  ctx.fill()
}
