/**
 * The architecture of the 'isocontainers' buildings: a footprint (a box, an octagon, a hexagon or a
 * round core) extruded to its height, its visible faces with a facade (windows, glass, slits, racks,
 * columns, honeycomb, rings, arches, loading bays),
 * a door or a gate, a sign, and what stands on the roof. The windows take their colors from the
 * effects (isocontainers.fx.ts), so every style shows the state the same way.
 */
import { noise } from '../isovegas/isovegas.draw.ts'
import type { Container, GridPoint, RoofProp } from './isocontainers.types.ts'
import type { StyleDefinition } from './isocontainers.styles.ts'
import {
  COLORS,
  FONT,
  U,
  circleRadii,
  cylinderSide,
  hexAlpha,
  poly,
  type FlowProjection,
} from './isocontainers.draw.ts'
import { phaseOf, windowColor, type Mood } from './isocontainers.fx.ts'

/** A side of a footprint, from a to b (grid points), with its outward normal */
export type Face = { a: GridPoint; b: GridPoint; nc: number; nr: number; len: number }

/** The corners of a footprint, clockwise on the plane (from the back corner) */
export function footprint(
  shape: StyleDefinition['shape'],
  c0: number,
  r0: number,
  w: number,
  d: number,
): GridPoint[] {
  const [c1, r1] = [c0 + w, r0 + d]
  if (shape === 'box')
    return [
      [c0, r0],
      [c1, r0],
      [c1, r1],
      [c0, r1],
    ]
  if (shape === 'hexagon') {
    const k = w * 0.25
    const rm = r0 + d / 2
    return [
      [c0 + k, r0],
      [c1 - k, r0],
      [c1, rm],
      [c1 - k, r1],
      [c0 + k, r1],
      [c0, rm],
    ]
  }
  if (shape === 'round') {
    // sixteen sides, from the back, clockwise
    const [cc, rc] = [c0 + w / 2, r0 + d / 2]
    return Array.from({ length: 16 }, (_, i) => {
      const t = (-3 * Math.PI) / 4 + (i * Math.PI) / 8
      return [cc + (Math.cos(t) * w) / 2, rc + (Math.sin(t) * d) / 2] as GridPoint
    })
  }
  const k = Math.min(w, d) * 0.24
  return [
    [c0 + k, r0],
    [c1 - k, r0],
    [c1, r0 + k],
    [c1, r1 - k],
    [c1 - k, r1],
    [c0 + k, r1],
    [c0, r1 - k],
    [c0, r0 + k],
  ]
}

/** The faces that face the viewer (towards +cols or +rows) */
export function visibleFaces(points: GridPoint[]): Face[] {
  const faces: Face[] = []
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    const [dc, dr] = [b[0] - a[0], b[1] - a[1]]
    const len = Math.hypot(dc, dr)
    if (len < 1e-6) continue
    // clockwise on the plane: the outward normal is the direction turned left
    const [nc, nr] = [dr / len, -dc / len]
    if (nc + nr > 0.01) faces.push({ a, b, nc, nr, len })
  }
  return faces
}

/** A quad on a face: from t0 to t1 cells along it, from height z0 to z1 */
export function faceQuad(
  P: FlowProjection,
  f: Face,
  t0: number,
  t1: number,
  z0: number,
  z1: number,
): GridPoint[] {
  const at = (t: number, z: number) =>
    P.at(f.a[0] + ((f.b[0] - f.a[0]) * t) / f.len, f.a[1] + ((f.b[1] - f.a[1]) * t) / f.len, z)
  return [at(t0, z0), at(t1, z0), at(t1, z1), at(t0, z1)]
}

/** A point on a face: t cells along it, at height z */
export function faceAt(P: FlowProjection, f: Face, t: number, z: number): GridPoint {
  return P.at(f.a[0] + ((f.b[0] - f.a[0]) * t) / f.len, f.a[1] + ((f.b[1] - f.a[1]) * t) / f.len, z)
}

/**
 * Draw on a face: x runs along it in plane pixels (U per cell), y runs down (y = -height), so text
 * and shapes come out painted on the wall.
 */
export function onFace(
  ctx: CanvasRenderingContext2D,
  P: FlowProjection,
  f: Face,
  draw: () => void,
) {
  // left to right on screen, so text reads the right way round
  let [ax, ay] = P.at(...f.a)
  let [bx, by] = P.at(...f.b)
  if (bx < ax) [ax, ay, bx, by] = [bx, by, ax, ay]
  const k = f.len * U
  ctx.save()
  ctx.transform((bx - ax) / k, (by - ay) / k, 0, P.zScale, ax, ay)
  draw()
  ctx.restore()
}

/** The path of a footprint on the plane (call inside P.plane), scaled about its center */
export function planePath(ctx: CanvasRenderingContext2D, points: GridPoint[], inset = 0) {
  const cs = points.map((p) => p[0])
  const rs = points.map((p) => p[1])
  const [c0, c1, r0, r1] = [Math.min(...cs), Math.max(...cs), Math.min(...rs), Math.max(...rs)]
  const [cc, rc] = [(c0 + c1) / 2, (r0 + r1) / 2]
  const sx = Math.max(0, ((c1 - c0) * U - inset * 2) / ((c1 - c0) * U))
  const sy = Math.max(0, ((r1 - r0) * U - inset * 2) / ((r1 - r0) * U))
  ctx.beginPath()
  points.forEach(([c, r], i) => {
    const u = (cc + (c - cc) * sx) * U
    const v = (rc + (r - rc) * sy) * U
    if (i) ctx.lineTo(u, v)
    else ctx.moveTo(u, v)
  })
  ctx.closePath()
}

/** The sides, shaded by where they face: towards the rows is the lit side, towards the columns the dark */
export function sides(
  ctx: CanvasRenderingContext2D,
  P: FlowProjection,
  faces: Face[],
  h: number,
  left: string,
  right: string,
) {
  for (const f of faces) {
    const quad = faceQuad(P, f, 0, f.len, 0, h)
    poly(ctx, quad)
    ctx.fillStyle = right
    ctx.fill()
    const lit = f.nr / (Math.abs(f.nc) + Math.abs(f.nr))
    if (lit > 0.01) {
      ctx.save()
      ctx.globalAlpha *= lit
      ctx.fillStyle = left
      ctx.fill()
      ctx.restore()
    }
  }
}

export type FacadeContext = {
  c: Container
  mood: Mood
  /** 0..1, how busy it is: how many windows are lit */
  load: number
  h: number
  /** Which tower of the replicas */
  index: number
  time: number
}

/** The front: the face towards the rows (where the door and the sign go) */
export const frontOf = (faces: Face[]) =>
  faces.reduce<Face | undefined>((best, f) => (!best || f.nr > best.nr ? f : best), undefined)

/** The windows of a face, by facade */
export function facade(
  ctx: CanvasRenderingContext2D,
  P: FlowProjection,
  style: StyleDefinition,
  f: Face,
  salt: number,
  x: FacadeContext,
) {
  const { c, mood, load, h, index, time } = x
  const phase = phaseOf(c)
  // each window has its own threshold; it fades in and out as the load moves past it
  const color = (i: number, floor: number, floors: number) => {
    const level = Math.max(0, Math.min(1, (load - noise(i + index * 7, floor, salt)) * 5))
    return windowColor(c, mood, level, i + salt * 11, floor, floors, time, phase)
  }
  const pane = (quad: GridPoint[], fill: string | CanvasGradient) => {
    poly(ctx, quad)
    ctx.fillStyle = fill
    ctx.fill()
  }
  const dark = 'rgba(255,255,255,0.035)'
  switch (style.facade) {
    case 'grid':
    case 'ribbon': {
      const ribbon = style.facade === 'ribbon'
      const spacing = ribbon ? 11 : 9
      const tall = ribbon ? 5 : 3.5
      const floors = Math.max(1, Math.floor((h - 8) / spacing))
      const count = Math.max(1, Math.round(f.len / (ribbon ? 0.9 : 0.42)))
      const gap = ribbon ? 0.04 : 0.1
      const step = (f.len - 0.2) / count
      for (let floor = 0; floor < floors; floor++) {
        const z = 6 + floor * spacing
        if (z + tall > h - 2) break
        for (let i = 0; i < count; i++) {
          const t = 0.1 + i * step + gap / 2
          pane(faceQuad(P, f, t, t + step - gap, z, z + tall), color(i, floor, floors) ?? dark)
        }
      }
      break
    }
    case 'glass': {
      // a curtain wall: a band of panes per floor between thin slabs
      const floors = Math.max(1, Math.floor((h - 4) / 9))
      const count = Math.max(1, Math.round(f.len / 0.3))
      const step = (f.len - 0.08) / count
      for (let floor = 0; floor < floors; floor++) {
        const z = 3 + floor * 9
        if (z + 7 > h - 1) break
        for (let i = 0; i < count; i++) {
          const t = 0.04 + i * step
          pane(
            faceQuad(P, f, t + 0.012, t + step - 0.012, z, z + 7),
            color(i, floor, floors) ?? 'rgba(120,190,210,0.07)',
          )
        }
      }
      // a sheen across the glass
      const quad = faceQuad(P, f, 0, f.len, 0, h)
      const sheen = ctx.createLinearGradient(...quad[3], ...quad[1])
      sheen.addColorStop(0, 'rgba(255,255,255,0.07)')
      sheen.addColorStop(0.45, 'rgba(255,255,255,0)')
      sheen.addColorStop(0.55, 'rgba(255,255,255,0.04)')
      sheen.addColorStop(1, 'rgba(255,255,255,0)')
      pane(quad, sheen)
      break
    }
    case 'slits': {
      const floors = Math.max(1, Math.floor((h - 6) / 15))
      const count = Math.max(1, Math.round(f.len / 0.45))
      for (let floor = 0; floor < floors; floor++) {
        const z = 7 + floor * 15
        if (z + 8 > h - 3) break
        for (let i = 0; i < count; i++) {
          const t = ((i + 0.5) / count) * f.len
          pane(faceQuad(P, f, t - 0.035, t + 0.035, z, z + 8), color(i, floor, floors) ?? dark)
        }
      }
      break
    }
    case 'bands': {
      // rings, and a porthole per floor
      if (style.stripes)
        for (let z = 0; z < h - 4; z += 24)
          pane(faceQuad(P, f, 0, f.len, z, Math.min(h, z + 12)), 'rgba(233,239,236,0.07)')
      ctx.strokeStyle = 'rgba(200,220,212,0.1)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let z = 10; z < h - 3; z += 10) {
        const [p, q] = faceQuad(P, f, 0, f.len, z, z)
        ctx.moveTo(...p)
        ctx.lineTo(...q)
      }
      ctx.stroke()
      if (f.len < 0.3) break
      const floors = Math.max(1, Math.floor((h - 6) / 12))
      for (let floor = 0; floor < floors; floor++) {
        const z = 5 + floor * 12
        if (z + 4 > h - 3) break
        const t = f.len / 2
        pane(faceQuad(P, f, t - 0.07, t + 0.07, z, z + 4), color(0, floor, floors) ?? dark)
      }
      break
    }
    case 'sparse': {
      if (f.nc > f.nr) {
        const t = f.len / 2
        pane(faceQuad(P, f, t - 0.16, t + 0.16, 6, 10), color(0, 0, 1) ?? dark)
      }
      break
    }
    case 'racks': {
      // dark server racks, each with two columns of status lights blinking at their own pace
      const step = 0.24
      const count = Math.max(1, Math.floor((f.len - 0.06) / step))
      const offset = (f.len - count * step) / 2
      const top = h - 5
      const rows = Math.max(1, Math.floor((top - 9) / 4))
      for (let i = 0; i < count; i++) {
        const t0 = offset + i * step + 0.035
        const t1 = t0 + step - 0.07
        pane(faceQuad(P, f, t0, t1, 4, top), 'rgba(0,0,0,0.4)')
        for (let k = 0; k < rows; k++) {
          const z = 7 + k * 4
          for (const [dt, seed] of [
            [0.025, 1],
            [0.085, 2],
          ]) {
            const n = noise(i + index * 13 + seed * 31, k, salt)
            const blink = 0.5 + 0.5 * Math.sin(time * (1.5 + n * 7) + n * 40)
            const level = load > n * 0.85 ? blink : 0
            const lit = windowColor(c, mood, level, i * 2 + seed, k, rows, time, phase)
            if (lit) pane(faceQuad(P, f, t0 + dt, t0 + dt + 0.035, z, z + 1.6), lit)
          }
        }
      }
      break
    }
    case 'columns': {
      // a plinth, pilasters, tall windows between them, and a frieze
      const count = Math.max(1, Math.round(f.len / 0.42))
      const span = f.len / count
      pane(faceQuad(P, f, 0, f.len, 0, 3), 'rgba(233,239,236,0.06)')
      pane(faceQuad(P, f, 0, f.len, h - 6, h - 2), 'rgba(233,239,236,0.07)')
      const floors = Math.max(1, Math.floor((h - 10) / 17))
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) * span
        for (let floor = 0; floor < floors; floor++) {
          const z = 6 + floor * 17
          if (z + 11 > h - 7) break
          pane(faceQuad(P, f, t - 0.08, t + 0.08, z, z + 11), color(i, floor, floors) ?? dark)
        }
      }
      for (let i = 0; i <= count; i++) {
        const t = Math.min(f.len - 0.035, Math.max(0.035, i * span))
        pane(faceQuad(P, f, t - 0.035, t + 0.035, 3, h - 6), 'rgba(233,239,236,0.1)')
      }
      break
    }
    case 'honeycomb': {
      // small hexagons, every other floor shifted by half a cell
      const floors = Math.max(1, Math.floor((h - 6) / 7))
      const count = Math.max(1, Math.round(f.len / 0.26))
      const step = f.len / count
      for (let floor = 0; floor < floors; floor++) {
        const z0 = 4 + floor * 7
        if (z0 + 5 > h - 2) break
        const shift = floor % 2 ? step / 2 : 0
        for (let i = 0; i < count; i++) {
          const t0 = shift + i * step + 0.03
          const t1 = t0 + step - 0.06
          if (t1 > f.len - 0.02) continue
          const q = (t1 - t0) * 0.25
          const zm = z0 + 2.5
          poly(ctx, [
            faceAt(P, f, t0, zm),
            faceAt(P, f, t0 + q, z0),
            faceAt(P, f, t1 - q, z0),
            faceAt(P, f, t1, zm),
            faceAt(P, f, t1 - q, z0 + 5),
            faceAt(P, f, t0 + q, z0 + 5),
          ])
          ctx.fillStyle = color(i, floor, floors) ?? dark
          ctx.fill()
        }
      }
      break
    }
    case 'rings': {
      // glowing rings; while it runs a pulse climbs the core, faster the busier it is
      const rings = Math.max(2, Math.floor((h - 6) / 7))
      ctx.save()
      ctx.lineWidth = 2.2
      ctx.lineCap = 'butt'
      for (let k = 0; k < rings; k++) {
        const z = 5 + k * 7
        const pulse = 0.5 + 0.5 * Math.sin(time * (2 + load * 5) - k * 0.9 + phase * 6)
        const level = load > 0 ? Math.min(1, 0.25 + pulse * (0.4 + load)) : 0
        ctx.strokeStyle = windowColor(c, mood, level, k, k, rings, time, phase) ?? dark
        const [p, q] = faceQuad(P, f, 0, f.len, z, z)
        ctx.beginPath()
        ctx.moveTo(...p)
        ctx.lineTo(...q)
        ctx.stroke()
      }
      ctx.restore()
      break
    }
    case 'arcade': {
      // rows of arched windows
      const floors = Math.max(1, Math.floor((h - 4) / 15))
      const count = Math.max(1, Math.round(f.len / 0.45))
      const span = (f.len * U) / count
      const half = span * 0.27
      onFace(ctx, P, f, () => {
        for (let floor = 0; floor < floors; floor++) {
          const z0 = 4 + floor * 15
          const z1 = z0 + 10
          if (z1 > h - 3) break
          for (let i = 0; i < count; i++) {
            const cx = (i + 0.5) * span
            const ry = Math.min(half * 0.7, 4)
            ctx.beginPath()
            ctx.moveTo(cx - half, -z0)
            ctx.lineTo(cx - half, -(z1 - ry))
            ctx.ellipse(cx, -(z1 - ry), half, ry, 0, Math.PI, 0)
            ctx.lineTo(cx + half, -z0)
            ctx.closePath()
            ctx.fillStyle = color(i, floor, floors) ?? dark
            ctx.fill()
          }
        }
      })
      break
    }
    case 'bays': {
      // loading bays with roller doors, and a band of high windows
      const count = Math.max(1, Math.round(f.len / 0.55))
      const span = f.len / count
      const top = Math.min(13, h * 0.55)
      ctx.strokeStyle = 'rgba(200,220,212,0.12)'
      ctx.lineWidth = 1
      for (let i = 0; i < count; i++) {
        const t0 = i * span + 0.07
        const t1 = (i + 1) * span - 0.07
        pane(faceQuad(P, f, t0, t1, 0, top), '#070b0c')
        ctx.beginPath()
        for (let z = 3; z < top; z += 3) {
          const [p, q] = faceQuad(P, f, t0, t1, z, z)
          ctx.moveTo(...p)
          ctx.lineTo(...q)
        }
        ctx.stroke()
        pane(faceQuad(P, f, t0, t1, top, top + 1.5), color(i, 0, 2) ?? dark)
        if (h - top > 12) pane(faceQuad(P, f, t0, t1, h - 7, h - 4), color(i, 1, 2) ?? dark)
      }
      break
    }
  }
}

/** A classical gable over the front, standing above the roof line */
export function pediment(
  ctx: CanvasRenderingContext2D,
  P: FlowProjection,
  f: Face,
  h: number,
  charred: boolean,
) {
  const rise = Math.min(16, f.len * 9)
  const points = [faceAt(P, f, 0, h), faceAt(P, f, f.len, h), faceAt(P, f, f.len / 2, h + rise)]
  poly(ctx, points)
  ctx.fillStyle = charred ? '#0d0c0c' : '#16242a'
  ctx.fill()
  ctx.strokeStyle = 'rgba(233,239,236,0.22)'
  ctx.lineWidth = 1.2
  ctx.stroke()
  // the tympanum
  const inner = [
    faceAt(P, f, f.len * 0.16, h + 2),
    faceAt(P, f, f.len * 0.84, h + 2),
    faceAt(P, f, f.len / 2, h + rise * 0.7),
  ]
  poly(ctx, inner)
  ctx.strokeStyle = 'rgba(233,239,236,0.1)'
  ctx.stroke()
}

/** A striped awning over the door, sloping out from the front */
export function awning(ctx: CanvasRenderingContext2D, P: FlowProjection, f: Face, accent: string) {
  const width = Math.min(f.len * 0.8, 0.9)
  const t0 = (f.len - width) / 2
  const strips = 6
  const out = (p: GridPoint, z: number): GridPoint => {
    const [ox, oy] = P.at(f.nc * 0.24, f.nr * 0.24, 0)
    return [p[0] + ox, p[1] + oy + (17 - z) * P.zScale]
  }
  for (let i = 0; i < strips; i++) {
    const a = t0 + (width * i) / strips
    const b = t0 + (width * (i + 1)) / strips
    const [pa, pb] = [faceAt(P, f, a, 17), faceAt(P, f, b, 17)]
    poly(ctx, [pa, pb, out(pb, 12), out(pa, 12)])
    ctx.fillStyle = i % 2 ? 'rgba(233,239,236,0.75)' : accent
    ctx.fill()
  }
}

/** A door at the bottom of the front, lit along its top while the container runs */
export function door(
  ctx: CanvasRenderingContext2D,
  P: FlowProjection,
  f: Face,
  h: number,
  wide: boolean,
  light?: string,
) {
  const width = Math.min(f.len * 0.6, wide ? 0.55 : 0.28)
  const t = f.len / 2
  const top = Math.min(wide ? 12 : 13, h * 0.5)
  poly(ctx, faceQuad(P, f, t - width / 2, t + width / 2, 0, top))
  ctx.fillStyle = '#050909'
  ctx.fill()
  ctx.strokeStyle = 'rgba(200,220,212,0.14)'
  ctx.lineWidth = 1
  ctx.beginPath()
  if (wide)
    // a roller door
    for (let z = 3; z < top; z += 3) {
      const [p, q] = faceQuad(P, f, t - width / 2, t + width / 2, z, z)
      ctx.moveTo(...p)
      ctx.lineTo(...q)
    }
  ctx.stroke()
  if (light) {
    const [p, q] = faceQuad(P, f, t - width / 2, t + width / 2, top, top)
    ctx.save()
    ctx.strokeStyle = light
    ctx.shadowColor = light
    ctx.shadowBlur = 6
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(...p)
    ctx.lineTo(...q)
    ctx.stroke()
    ctx.restore()
  }
}

/** A gate through the front, with light coming through it while the container runs */
export function arch(
  ctx: CanvasRenderingContext2D,
  P: FlowProjection,
  f: Face,
  h: number,
  light?: string,
) {
  const half = (Math.min(1, f.len * 0.4) * U) / 2
  const height = Math.min(h * 0.62, 28)
  const ry = Math.min(half * 0.55, height * 0.45)
  const x = (f.len * U) / 2
  onFace(ctx, P, f, () => {
    ctx.beginPath()
    ctx.moveTo(x - half, 0)
    ctx.lineTo(x - half, -(height - ry))
    ctx.ellipse(x, -(height - ry), half, ry, 0, Math.PI, 0)
    ctx.lineTo(x + half, 0)
    ctx.closePath()
    ctx.fillStyle = '#030606'
    ctx.fill()
    if (light) {
      const glow = ctx.createLinearGradient(0, 0, 0, -height)
      glow.addColorStop(0, hexAlpha(light, 0.35))
      glow.addColorStop(1, hexAlpha(light, 0))
      ctx.fillStyle = glow
      ctx.fill()
    }
    ctx.strokeStyle = 'rgba(200,220,212,0.22)'
    ctx.lineWidth = 1.5
    ctx.stroke()
  })
}

/** A sign near the top of the front: a few letters in a frame */
export function badge(
  ctx: CanvasRenderingContext2D,
  P: FlowProjection,
  f: Face,
  h: number,
  text: string,
  accent?: string,
) {
  if (h < 24 || f.len < 0.55) return
  onFace(ctx, P, f, () => {
    ctx.font = `700 9px ${FONT.mono}`
    const w = Math.min(f.len * U - 8, ctx.measureText(text).width + 9)
    const x = (f.len * U - w) / 2
    const y = -(h - 4)
    ctx.fillStyle = 'rgba(6,10,11,0.94)'
    ctx.strokeStyle = accent ? hexAlpha(accent, 0.85) : 'rgba(233,239,236,0.3)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.roundRect(x, y, w, 12, 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = accent ?? COLORS.text
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'
    ctx.fillText(text, x + w / 2, y + 6.5, w - 4)
  })
}

/** A line in the accent color along the top of the sides */
export function cornice(
  ctx: CanvasRenderingContext2D,
  P: FlowProjection,
  faces: Face[],
  h: number,
  accent: string,
) {
  ctx.save()
  ctx.strokeStyle = hexAlpha(accent, 0.8)
  ctx.shadowColor = accent
  ctx.shadowBlur = 5
  ctx.lineWidth = 2
  ctx.beginPath()
  for (const f of faces) {
    const [p, q] = faceQuad(P, f, 0, f.len, h - 2, h - 2)
    ctx.moveTo(...p)
    ctx.lineTo(...q)
  }
  ctx.stroke()
  ctx.restore()
}

/** Battlements along the front edges of the roof */
export function crenels(
  ctx: CanvasRenderingContext2D,
  P: FlowProjection,
  faces: Face[],
  h: number,
  colors: [string, string, string],
) {
  for (const f of faces) {
    const count = Math.max(2, Math.round(f.len / 0.32))
    const step = f.len / count
    for (let i = 0; i < count; i += 2) {
      const t0 = i * step + step * 0.1
      const t1 = t0 + step * 0.8
      // a small block: its outer face, and its top
      const front = faceQuad(P, f, t0, t1, h, h + 6)
      poly(ctx, front)
      ctx.fillStyle = f.nr > f.nc ? colors[0] : colors[1]
      ctx.fill()
      // the top reaches a little inwards
      const [ix, iy] = P.at(-f.nc * 0.12, -f.nr * 0.12)
      const q = faceQuad(P, f, t0, t1, h + 6, h + 6)
      poly(ctx, [q[0], q[1], [q[1][0] + ix, q[1][1] + iy], [q[0][0] + ix, q[0][1] + iy]])
      ctx.fillStyle = colors[2]
      ctx.fill()
      ctx.strokeStyle = 'rgba(200,220,212,0.28)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(...q[0])
      ctx.lineTo(...q[1])
      ctx.stroke()
    }
  }
}

export type PropContext = {
  /** The color of the status light */
  light: string
  /** The light is on */
  lit: boolean
  /** How busy it is, 0..1: the chimney smokes */
  load: number
  /** It runs: the beacon turns */
  running: boolean
  time: number
  phase: number
  charred: boolean
}

/** A box standing on the roof: two sides and a top */
function block(
  ctx: CanvasRenderingContext2D,
  P: FlowProjection,
  col: number,
  row: number,
  w: number,
  d: number,
  z0: number,
  z1: number,
  colors: [string, string, string],
) {
  const [c0, r0, c1, r1] = [col - w / 2, row - d / 2, col + w / 2, row + d / 2]
  poly(ctx, [P.at(c0, r1, z0), P.at(c1, r1, z0), P.at(c1, r1, z1), P.at(c0, r1, z1)])
  ctx.fillStyle = colors[0]
  ctx.fill()
  poly(ctx, [P.at(c1, r1, z0), P.at(c1, r0, z0), P.at(c1, r0, z1), P.at(c1, r1, z1)])
  ctx.fillStyle = colors[1]
  ctx.fill()
  poly(ctx, [P.at(c0, r0, z1), P.at(c1, r0, z1), P.at(c1, r1, z1), P.at(c0, r1, z1)])
  ctx.fillStyle = colors[2]
  ctx.fill()
}

/**
 * What stands on the roof, at a grid point on it; returns the screen point of its top, where the
 * status light goes.
 */
export function roofProp(
  ctx: CanvasRenderingContext2D,
  P: FlowProjection,
  prop: RoofProp,
  col: number,
  row: number,
  h: number,
  x: PropContext,
): GridPoint | undefined {
  const metal: [string, string, string] = x.charred
    ? ['#111', '#0a0a0a', '#181818']
    : ['#1b2a2e', '#121c1f', '#26363a']
  const line = x.charred ? 'rgba(120,110,100,0.4)' : 'rgba(200,220,212,0.45)'
  switch (prop) {
    case 'antenna': {
      const top = h + 26
      ctx.strokeStyle = line
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(...P.at(col, row, h))
      ctx.lineTo(...P.at(col, row, top))
      for (const [z, k] of [
        [h + 10, 0.12],
        [h + 17, 0.08],
      ]) {
        ctx.moveTo(...P.at(col - k, row + k, z))
        ctx.lineTo(...P.at(col + k, row - k, z))
      }
      ctx.stroke()
      block(ctx, P, col, row, 0.14, 0.14, h, h + 3, metal)
      return P.at(col, row, top)
    }
    case 'tank': {
      const r = 0.15
      ctx.strokeStyle = line
      ctx.lineWidth = 1.2
      ctx.beginPath()
      for (const [dc, dr] of [
        [-0.1, 0],
        [0.1, 0],
        [0, 0.1],
      ]) {
        ctx.moveTo(...P.at(col + dc, row + dr, h))
        ctx.lineTo(...P.at(col + dc, row + dr, h + 9))
      }
      ctx.stroke()
      cylinderSide(ctx, P, col, row, r, h + 9, h + 20, metal[2], metal[1])
      const [rx, ry] = circleRadii(P, r)
      const [tx, ty] = P.at(col, row, h + 20)
      ctx.fillStyle = metal[2]
      ctx.beginPath()
      ctx.ellipse(tx, ty, rx, ry, 0, 0, Math.PI * 2)
      ctx.fill()
      // a cone roof
      ctx.beginPath()
      ctx.moveTo(tx - rx, ty)
      ctx.lineTo(tx, ty - 7)
      ctx.lineTo(tx + rx, ty)
      ctx.fillStyle = metal[0]
      ctx.fill()
      return [tx, ty - 7]
    }
    case 'dome': {
      const r = 0.3
      const [rx, ry] = circleRadii(P, r)
      const [cx, cy] = P.at(col, row, h)
      const up = rx * 0.8
      const g = ctx.createLinearGradient(cx - rx, cy - up, cx + rx * 0.6, cy)
      g.addColorStop(0, x.charred ? '#1e1c1b' : '#3d5559')
      g.addColorStop(0.5, x.charred ? '#141313' : '#22343a')
      g.addColorStop(1, metal[1])
      ctx.beginPath()
      ctx.ellipse(cx, cy, rx, up, 0, Math.PI, 0)
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI)
      ctx.fillStyle = g
      ctx.fill()
      ctx.strokeStyle = 'rgba(200,220,212,0.3)'
      ctx.lineWidth = 1
      ctx.stroke()
      // a seam, and the slit of an observatory
      ctx.strokeStyle = 'rgba(200,220,212,0.16)'
      ctx.beginPath()
      ctx.ellipse(cx, cy - up * 0.42, rx * 0.9, ry * 0.9, 0, 0, Math.PI)
      ctx.stroke()
      return [cx, cy - up]
    }
    case 'chimney': {
      const top = h + 24
      block(ctx, P, col, row, 0.2, 0.2, h, top, metal)
      // a light band near the top
      ctx.fillStyle = 'rgba(200,220,212,0.12)'
      poly(ctx, [
        P.at(col - 0.1, row + 0.1, top - 5),
        P.at(col + 0.1, row + 0.1, top - 5),
        P.at(col + 0.1, row + 0.1, top - 3),
        P.at(col - 0.1, row + 0.1, top - 3),
      ])
      ctx.fill()
      if (x.running && x.load > 0.05) {
        // smoke puffs, drifting off with the wind
        const [sx, sy] = P.at(col, row, top)
        ctx.save()
        for (let i = 0; i < 4; i++) {
          const t = (x.time * 0.45 + i / 4 + x.phase) % 1
          const r = 3 + t * 9
          ctx.fillStyle = `rgba(170,178,180,${0.32 * (1 - t) * Math.min(1, x.load * 2.5)})`
          ctx.beginPath()
          ctx.arc(sx + t * 22, sy - 4 - t * 30, r, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }
      return P.at(col, row, top + 1)
    }
    case 'beacon': {
      block(ctx, P, col, row, 0.26, 0.26, h, h + 4, metal)
      const [rx, ry] = circleRadii(P, 0.1)
      const [lx, ly] = P.at(col, row, h + 10)
      // the lantern
      ctx.save()
      ctx.fillStyle = x.lit ? hexAlpha(x.light, 0.55) : 'rgba(200,220,212,0.08)'
      if (x.lit) {
        ctx.shadowColor = x.light
        ctx.shadowBlur = 14
      }
      ctx.fillRect(lx - rx, ly - 6, rx * 2, 12)
      ctx.restore()
      ctx.fillStyle = metal[2]
      ctx.beginPath()
      ctx.moveTo(lx - rx - 2, ly - 6)
      ctx.lineTo(lx, ly - 6 - ry - 5)
      ctx.lineTo(lx + rx + 2, ly - 6)
      ctx.closePath()
      ctx.fill()
      if (x.lit && x.running) beam(ctx, P, col, row, h + 10, x)
      return [lx, ly - 6 - ry - 6]
    }
    case 'vents': {
      block(ctx, P, col - 0.06, row + 0.12, 0.2, 0.16, h, h + 6, metal)
      block(ctx, P, col + 0.12, row - 0.06, 0.16, 0.2, h, h + 9, metal)
      return P.at(col + 0.12, row - 0.06, h + 10)
    }
    case 'fans': {
      // two cooling fans, turning faster the busier it is
      const spin = x.running ? x.time * (2 + x.load * 14) : x.phase * 6
      for (const [dc, dr] of [
        [0, 0],
        [0, 0.36],
      ]) {
        const [fc, fr] = [col + dc, row + dr]
        block(ctx, P, fc, fr, 0.3, 0.3, h, h + 3, metal)
        P.plane(ctx, h + 3, () => {
          const [cx, cy] = [fc * U, fr * U]
          ctx.fillStyle = '#05090a'
          ctx.beginPath()
          ctx.arc(cx, cy, 0.12 * U, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = x.charred ? 'rgba(120,110,100,0.5)' : 'rgba(200,220,212,0.5)'
          ctx.lineWidth = 2.5
          ctx.beginPath()
          for (let k = 0; k < 3; k++) {
            const a = spin + (k * Math.PI * 2) / 3
            ctx.moveTo(cx, cy)
            ctx.lineTo(cx + Math.cos(a) * 0.1 * U, cy + Math.sin(a) * 0.1 * U)
          }
          ctx.stroke()
        })
      }
      ctx.strokeStyle = line
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(...P.at(col + 0.15, row - 0.15, h))
      ctx.lineTo(...P.at(col + 0.15, row - 0.15, h + 9))
      ctx.stroke()
      return P.at(col + 0.15, row - 0.15, h + 10)
    }
    case 'crane': {
      // a tower crane: a lattice mast, a turning jib with its hook, a counterweight
      const top = h + 42
      ctx.strokeStyle = x.charred ? 'rgba(120,110,100,0.5)' : 'rgba(255,192,77,0.75)'
      ctx.lineWidth = 1.3
      ctx.beginPath()
      const [m0, m1] = [-0.05, 0.05]
      ctx.moveTo(...P.at(col + m0, row, h))
      ctx.lineTo(...P.at(col + m0, row, top))
      ctx.moveTo(...P.at(col + m1, row, h))
      ctx.lineTo(...P.at(col + m1, row, top))
      for (let z = h; z < top - 4; z += 6) {
        ctx.moveTo(...P.at(col + m0, row, z))
        ctx.lineTo(...P.at(col + m1, row, z + 6))
      }
      const turn = x.running ? x.time * 0.3 + x.phase * 6 : x.phase * 6
      const [dc, dr] = [Math.cos(turn), Math.sin(turn)]
      const tip = P.at(col + dc * 1.1, row + dr * 1.1, top)
      ctx.moveTo(...P.at(col - dc * 0.35, row - dr * 0.35, top))
      ctx.lineTo(...tip)
      // the tie from the peak to the jib
      ctx.moveTo(...P.at(col, row, top + 8))
      ctx.lineTo(...P.at(col + dc * 0.7, row + dr * 0.7, top))
      ctx.moveTo(...P.at(col, row, top + 8))
      ctx.lineTo(...P.at(col - dc * 0.3, row - dr * 0.3, top))
      ctx.moveTo(...P.at(col, row, top))
      ctx.lineTo(...P.at(col, row, top + 8))
      ctx.stroke()
      // the hook, going up and down
      const hook = 14 + 10 * Math.sin(x.time * (x.running ? 0.8 : 0) + x.phase * 9)
      const [hx, hy] = P.at(col + dc * 0.8, row + dr * 0.8, top)
      ctx.strokeStyle = line
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(hx, hy)
      ctx.lineTo(hx, hy + hook)
      ctx.stroke()
      ctx.fillStyle = metal[2]
      ctx.fillRect(hx - 3, hy + hook, 6, 4)
      block(ctx, P, col - dc * 0.32, row - dr * 0.32, 0.14, 0.14, top - 4, top, metal)
      return P.at(col, row, top + 9)
    }
    case 'observatory': {
      // a large dome whose slit turns slowly, a telescope looking out of it
      const r = 0.42
      const [oc, or] = [col - 0.12, row + 0.12]
      const [rx, ry] = circleRadii(P, r)
      const [cx, cy] = P.at(oc, or, h)
      const up = rx * 0.85
      const g = ctx.createLinearGradient(cx - rx, cy - up, cx + rx * 0.6, cy)
      g.addColorStop(0, x.charred ? '#1e1c1b' : '#41595e')
      g.addColorStop(0.55, x.charred ? '#141313' : '#22343a')
      g.addColorStop(1, metal[1])
      ctx.beginPath()
      ctx.ellipse(cx, cy, rx, up, 0, Math.PI, 0)
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI)
      ctx.fillStyle = g
      ctx.fill()
      ctx.strokeStyle = 'rgba(200,220,212,0.3)'
      ctx.lineWidth = 1
      ctx.stroke()
      // the slit: a dark band over the dome, moving as it turns
      const turn = Math.sin((x.running ? x.time * 0.25 : 0) + x.phase * 6) * 0.55
      const sx = cx + turn * rx
      const width = rx * 0.16 * Math.cos(turn)
      const height = up * Math.sqrt(Math.max(0, 1 - turn * turn))
      ctx.fillStyle = '#030606'
      ctx.beginPath()
      ctx.moveTo(sx - width, cy - 2)
      ctx.lineTo(sx - width * 0.6, cy - height)
      ctx.lineTo(sx + width * 0.6, cy - height)
      ctx.lineTo(sx + width, cy - 2)
      ctx.closePath()
      ctx.fill()
      if (x.lit) {
        // starlight caught in the slit
        ctx.fillStyle = hexAlpha(x.light, 0.35)
        ctx.fill()
      }
      // the telescope
      ctx.strokeStyle = 'rgba(200,220,212,0.7)'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(sx, cy - height * 0.45)
      ctx.lineTo(sx + 8 + turn * 6, cy - height - 6)
      ctx.stroke()
      return [cx, cy - up - 3]
    }
    default:
      return undefined
  }
}

/** The beam of a lighthouse: a soft wedge of light sweeping over the city */
function beam(
  ctx: CanvasRenderingContext2D,
  P: FlowProjection,
  col: number,
  row: number,
  z: number,
  x: PropContext,
) {
  const angle = x.time * 0.9 + x.phase * 6
  const reach = 7
  const spread = 0.16
  const [ox, oy] = P.at(col, row, z)
  const end = (a: number) => {
    const [ex, ey] = P.at(col + Math.cos(a) * reach, row + Math.sin(a) * reach, 0)
    return [ex, ey] as GridPoint
  }
  const [a, b] = [end(angle - spread), end(angle + spread)]
  const [mx, my] = end(angle)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createLinearGradient(ox, oy, mx, my)
  g.addColorStop(0, hexAlpha(x.light, 0.32))
  g.addColorStop(1, hexAlpha(x.light, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(ox, oy)
  ctx.lineTo(...a)
  ctx.lineTo(...b)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}
