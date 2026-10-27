/**
 * The buildings and props of the 'isoairport' world, drawn from boxes, cylinders and pyramids.
 *
 * Buildings are positioned in footprint cells: (0, 0) is the back corner of the whole building,
 * (cols, rows) its front corner. Their parts are drawn back to front with `later()`.
 * A slice of a long building (a concourse) draws only its own part.
 */
import { drawFaceRect } from '../isocasino/isocasino.draw.ts'
import { along, type IsoBox } from '../isovegas/isovegas.draw.ts'
import { GATES, normalize, vec } from './isoairport.airside.ts'
import {
  drawPlane,
  drawTree,
  IsoPainter,
  noise,
  shade,
  wallText,
  type Point,
} from './isoairport.draw.ts'
import type { BuildingKind, PropKind } from './isoairport.map.ts'

export type BuildingScene = {
  p: IsoPainter
  char: string
  /** The whole footprint, in cells */
  cols: number
  rows: number
  /** The grid position of the building's back corner */
  col: number
  row: number
  /** The slice to draw, relative to the back corner */
  piece: { col: number; row: number; cols: number; rows: number }
  time: number
  night: number
  /** Which gates have a plane docked */
  docked: boolean[]
}

type B = BuildingScene

const GLASS = '#8fb6c9'
const WARM = '#ffd98a'

/** The two visible sides and the top of a box centered on (col, row) */
function box(b: B, col: number, row: number, shape: IsoBox, shadow = false) {
  const [x, y] = b.p.at(col, row)
  if (shadow) b.p.shadow(x, y, shape.cols, shape.rows)
  return b.p.box(x, y, shape)
}

/** A glass wall on both visible sides of a box, with mullions, glowing at night */
function curtainWall(b: B, col: number, row: number, shape: IsoBox, spacing = 0.22) {
  const { p } = b
  const { ctx } = p
  const [x, y] = p.at(col, row)
  const [, right, front, left] = p.boxTop(x, y, shape)
  const h = shape.height
  if (b.night > 0) {
    ctx.save()
    ctx.globalAlpha = b.night * 0.55
    drawFaceRect(ctx, left, front, 0, 1, 0, h, shade(WARM, -0.1))
    drawFaceRect(ctx, front, right, 0, 1, 0, h, shade(WARM, -0.3))
    ctx.restore()
  }
  ctx.strokeStyle = p.c('#eceff1')
  ctx.lineWidth = 1
  ctx.globalAlpha = 0.7
  for (const [a, c, cells] of [
    [left, front, shape.cols],
    [front, right, shape.rows],
  ] as Array<[Point, Point, number]>) {
    const n = Math.max(1, Math.round(cells / spacing))
    for (let i = 1; i < n; i++) {
      const q = along(a, c, i / n)
      ctx.beginPath()
      ctx.moveTo(q[0], q[1])
      ctx.lineTo(q[0], q[1] + h)
      ctx.stroke()
    }
    for (let dy = 9; dy < h - 2; dy += 9) {
      ctx.beginPath()
      ctx.moveTo(a[0], a[1] + dy)
      ctx.lineTo(c[0], c[1] + dy)
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1
}

/** A red light on top of something tall, blinking */
function obstructionLight(b: B, x: number, y: number, phase = 0) {
  const on = (b.time + phase) % 1.5 < 0.75
  if (!on) return
  b.p.light(x, y, 10, 'rgba(255,40,40,1)', 0.3 + b.night * 0.6)
  b.p.ctx.fillStyle = '#ff3030'
  b.p.ctx.beginPath()
  b.p.ctx.arc(x, y, 1.6, 0, Math.PI * 2)
  b.p.ctx.fill()
}

/** The main terminal: a glass hall under a roof of white tent peaks */
function terminal(b: B) {
  const { p } = b
  const c = b.cols / 2
  const r = b.rows / 2
  p.later(c, r, () => {
    box(b, c, r, { cols: b.cols - 0.1, rows: b.rows - 0.1, height: 4, color: '#a9a59c' }, true)
    const hall: IsoBox = {
      cols: b.cols - 0.5,
      rows: b.rows - 0.5,
      height: 30,
      elevation: 4,
      color: GLASS,
    }
    box(b, c, r, hall)
    curtainWall(b, c, r, { ...hall, height: 30, elevation: 4 })
    box(b, c, r, {
      cols: b.cols - 0.1,
      rows: b.rows - 0.1,
      height: 3,
      elevation: 34,
      color: '#eceff1',
    })

    // the name on a band across the front
    const [x, y] = p.at(c, r)
    const [, , front, left] = p.boxTop(x, y, { ...hall, height: 30, elevation: 4 })
    drawFaceRect(p.ctx, left, front, 0.1, 0.9, 4, 13, p.c('#1a237e'))
    const mid = along(left, front, 0.5)
    wallText(p, 'ISO INTERNATIONAL', mid[0], mid[1] + 8.5, 'left', 6.5, '#fff3c4', true)
  })
  // tent peaks, back to front
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const pc = 0.9 + i * 1.6
      const pr = 0.9 + j * 1.6
      p.later(c + 0.01 * (i + j), r, () => {
        const [x, y] = p.at(pc, pr)
        p.pyramid(x, y, 1.45, 1.45, 20, '#fbfbfb', 37)
      })
    }
  }
}

/**
 * A slice of a concourse. Concourse A runs along the columns with its gates on the +row side,
 * concourse B along the rows with its gates on the +col side.
 * `u` is the position along the concourse, `v` across it (0 at the back, 2 at the apron side).
 */
function pier(b: B, axis: 'cols' | 'rows') {
  const { p } = b
  const along_ = axis === 'cols'
  const at = (u: number, v: number): [number, number] => (along_ ? [u, v] : [v, u])
  const size = (du: number, dv: number) =>
    along_ ? { cols: du, rows: dv } : { cols: dv, rows: du }
  const u0 = along_ ? b.piece.col : b.piece.row
  const gateAt = GATES.map((g, index) => ({ g, index })).filter(
    ({ g }) => g.pier === (along_ ? 'A' : 'B'),
  )
  const origin = along_ ? b.col : b.row

  p.later(...at(u0 + 0.5, 1), () => {
    const [x, y] = p.at(...at(u0 + 0.5, 1.1))
    // a tiny overlap hides the seams between the slices
    const shape: IsoBox = { ...size(1.01, 1.7), height: 17, color: '#dfe5e8' }
    p.shadow(x, y, shape.cols, shape.rows)
    const [, right, front, left] = p.box(x, y, shape)
    // the glass band facing the apron
    const [a, c] = along_ ? [left, front] : [front, right]
    drawFaceRect(p.ctx, a, c, 0, 1, 5, 12, p.c(along_ ? '#5f8296' : '#4c6b7c'))
    if (b.night > 0) {
      p.ctx.globalAlpha = b.night * 0.8
      drawFaceRect(p.ctx, a, c, 0.05, 0.95, 6, 11, '#ffe1a0')
      p.ctx.globalAlpha = 1
    }
    // a ridge on the roof
    p.box(...p.at(...at(u0 + 0.5, 1.0)), {
      ...size(1.01, 0.5),
      height: 3,
      elevation: 17,
      color: '#c5ced3',
    })
  })

  for (const { g, index } of gateAt) {
    const u = (along_ ? g.stand.col : g.stand.row) - origin
    if (Math.floor(u) !== u0) continue
    const docked = b.docked[index]
    const reach = docked ? 0.62 : 0.4
    // the door is on the left side of the plane
    const side = along_ ? u - 0.2 : u + 0.2
    p.later(...at(u + 0.1, 2.3), () => {
      const [x, y] = p.at(...at(side, 2.0 + reach / 2))
      p.box(x, y, { ...size(0.14, reach), height: 5, elevation: 7, color: '#cfd4d8' })
      const [cx, cy] = p.at(...at(side, 2.0 + reach - 0.06))
      p.cylinder(cx, cy, 0.05, 7, '#78909c')
      // the gate number on the wall
      const [wx, wy] = p.at(...at(u + 0.15, 1.95))
      wallText(p, GATES[index].name, wx, wy - 15, along_ ? 'left' : 'right', 6, '#fdd835', true)
    })
  }
}

/** The control tower: a slim shaft with a glass cab and the airport beacon on top */
function tower(b: B) {
  const { p } = b
  p.later(1, 1, () => {
    const [x, y] = p.at(1, 1)
    box(b, 1, 1, { cols: 1.6, rows: 1.6, height: 14, color: '#cfd8dc' }, true)
    p.cylinder(x, y, 0.26, 112, '#eceff1', 14)
    p.cylinder(x, y, 0.3, 3, '#b0bec5', 60)
    p.cylinder(x, y, 0.36, 8, '#90a4ae', 124)
    p.cylinder(x, y, 0.56, 4, '#cfd8dc', 132)
    p.cylinder(x, y, 0.58, 13, '#2f4856', 136)
    const { ctx } = p
    if (b.night > 0) {
      ctx.save()
      ctx.globalAlpha = b.night * 0.6
      p.cylinder(x, y, 0.58, 13, '#7fe0c2', 136)
      ctx.restore()
    }
    // mullions of the cab
    ctx.strokeStyle = p.c('#cfd8dc')
    ctx.lineWidth = 1
    for (let i = 0; i <= 8; i++) {
      const angle = (i / 8) * Math.PI
      const mx = x + Math.cos(angle) * 0.58 * 45.25
      const my = y - 136 + Math.sin(angle) * 0.58 * 22.6
      ctx.beginPath()
      ctx.moveTo(mx, my)
      ctx.lineTo(mx, my - 13)
      ctx.stroke()
    }
    p.cylinder(x, y, 0.64, 3, '#eceff1', 149)
    p.cylinder(x, y, 0.05, 22, '#b0bec5', 152)
    obstructionLight(b, x, y - 175)
    // the beacon: green and white flashes, turning
    const turn = b.time % 2.4
    if (turn < 0.15 || (turn > 1.2 && turn < 1.35)) {
      const color = turn < 1 ? 'rgba(80,255,140,1)' : 'rgba(255,255,255,1)'
      p.light(x, y - 160, 26, color, 0.35 + b.night * 0.6)
    }
  })
}

function firestation(b: B) {
  const { p } = b
  p.later(1.5, 0.7, () => {
    const shape: IsoBox = { cols: 2.8, rows: 1.2, height: 19, color: '#b5452f' }
    const [, , front, left] = box(b, 1.5, 0.7, shape, true)
    for (let i = 0; i < 3; i++) {
      drawFaceRect(p.ctx, left, front, 0.08 + i * 0.3, 0.32 + i * 0.3, 7, 19, p.c('#eceff1'))
      for (let k = 1; k < 4; k++)
        drawFaceRect(
          p.ctx,
          left,
          front,
          0.08 + i * 0.3,
          0.32 + i * 0.3,
          7 + k * 3,
          7.6 + k * 3,
          p.c('#bdbdbd'),
        )
    }
    const mid = along(left, front, 0.5)
    wallText(p, 'FIRE · RESCUE', mid[0], mid[1] + 3.5, 'left', 4.5, '#fff8e1')
    box(b, 0.5, 0.6, { cols: 0.5, rows: 0.5, height: 12, elevation: 19, color: '#9e3a28' })
  })
  // two crash tenders in front
  for (const c of [0.75, 1.75]) {
    p.later(c, 1.7, () => {
      box(b, c, 1.7, { cols: 0.26, rows: 0.5, height: 8, color: '#e53935' }, true)
      box(b, c, 1.55, { cols: 0.24, rows: 0.14, height: 3, elevation: 8, color: '#eceff1' })
      const [x, y] = p.at(c, 1.55)
      if (b.time % 0.8 < 0.4) p.light(x, y - 12, 6, 'rgba(80,140,255,1)', 0.3 + b.night * 0.4)
    })
  }
}

function concorde(b: B) {
  const { p } = b
  p.later(1, 1.5, () => {
    box(b, 1, 1.5, { cols: 1.6, rows: 2.6, height: 3, color: '#cfc8ba' }, true)
    const [x, y] = p.at(1, 1.6)
    p.cylinder(x, y, 0.12, 22, '#9e9e9e', 3)
    drawPlane(p, x, y, normalize(vec(0.25, 1)), {
      kind: 'concorde',
      color: '#16357a',
      tail: '#e8ecef',
      altitude: 22,
      time: b.time,
    })
    // a plaque
    box(b, 1.6, 2.7, { cols: 0.3, rows: 0.06, height: 5, color: '#5d4037' })
  })
}

/** Two crossed parabolic arches carrying a flying saucer */
function themebuilding(b: B) {
  const { p } = b
  const { ctx } = p
  p.later(-100, 0, () => {
    p.groundEllipse(2, 2, 1.9, 1.9, '#e9e4d8')
    p.groundEllipse(2, 2, 1.4, 1.4, '#9ccc65')
  })
  const apex = 92
  const arch = (from: [number, number], to: [number, number], t0: number, t1: number) => {
    ctx.lineCap = 'round'
    const steps = 16
    for (let i = 0; i < steps; i++) {
      const a = t0 + ((t1 - t0) * i) / steps
      const c = t0 + ((t1 - t0) * (i + 1)) / steps
      const point = (t: number): Point => {
        const [gx, gy] = p.at(from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t)
        return [gx, gy - 4 * apex * t * (1 - t)]
      }
      const pa = point(a)
      const pc = point(c)
      ctx.beginPath()
      ctx.moveTo(pa[0], pa[1])
      ctx.lineTo(pc[0], pc[1])
      // thicker at the feet
      ctx.lineWidth = 3 + 3 * Math.abs(0.5 - a) * 2
      ctx.strokeStyle = p.c('#fafafa')
      ctx.stroke()
      if (b.night > 0) {
        ctx.globalAlpha = b.night * 0.7
        ctx.lineWidth = 2
        ctx.strokeStyle = '#c59bff'
        ctx.stroke()
        ctx.globalAlpha = 1
      }
    }
  }
  p.later(0.5, 0.5, () => arch([0.35, 0.35], [3.65, 3.65], 0, 0.5))
  p.later(2, 2, () => {
    arch([3.65, 0.35], [0.35, 3.65], 0, 1)
    const [x, y] = p.at(2, 2)
    p.cylinder(x, y, 0.28, 50, '#eceff1')
    p.cylinder(x, y, 0.95, 6, '#455a64', 46)
    if (b.night > 0) {
      ctx.globalAlpha = b.night * 0.8
      p.cylinder(x, y, 0.95, 6, '#b388ff', 46)
      ctx.globalAlpha = 1
    }
    p.cylinder(x, y, 1.05, 3, '#fafafa', 52)
    p.cylinder(x, y, 0.5, 5, '#eceff1', 55)
    obstructionLight(b, x, y - 62, 0.4)
  })
  p.later(3.5, 3.5, () => arch([0.35, 0.35], [3.65, 3.65], 0.5, 1))
}

function garage(b: B) {
  const { p } = b
  p.later(2, 2, () => {
    const [x, y] = p.at(2, 2)
    p.shadow(x, y, 3.8, 3.8)
    for (let level = 0; level < 5; level++) {
      const elevation = level * 9
      if (level > 0) {
        const inner: IsoBox = {
          cols: 3.6,
          rows: 3.6,
          height: 6.5,
          elevation: elevation - 6.5,
          color: '#3d4247',
        }
        const [, right, front, left] = p.box(x, y, inner)
        // parked cars seen through the openings
        for (let i = 0; i < 9; i++) {
          if (noise(level, i, 7) < 0.4) continue
          const [a, c, face] = i % 2 ? [left, front, 'l'] : [front, right, 'r']
          const t = 0.08 + (i / 9) * 0.84
          const q = along(a, c, t)
          p.ctx.fillStyle = p.c(
            ['#e53935', '#1e88e5', '#fafafa', '#212121', '#fdd835'][(level + i) % 5],
          )
          p.ctx.fillRect(q[0] - 2, q[1] + 3.5 + (face === 'l' ? 0 : 0), 4, 2.5)
        }
        if (b.night > 0) {
          p.ctx.globalAlpha = b.night * 0.35
          drawFaceRect(p.ctx, left, front, 0, 1, 0, 6.5, '#ffe9b0')
          drawFaceRect(p.ctx, front, right, 0, 1, 0, 6.5, '#e8c98a')
          p.ctx.globalAlpha = 1
        }
      }
      p.box(x, y, { cols: 3.8, rows: 3.8, height: 2.5, elevation, color: '#c4c1bb' })
    }
    // the big P
    const [sx, sy] = p.at(3.7, 3.7)
    p.box(sx, sy, { cols: 0.2, rows: 0.2, height: 14, elevation: 42.5, color: '#1565c0' })
    p.text('P', sx, sy - 50, 9, '#ffffff', true)
  })
  // cars on the top deck
  for (let i = 0; i < 10; i++) {
    const c = 0.5 + (i % 5) * 0.7
    const r = i < 5 ? 0.9 : 2.6
    if (noise(i, 3) < 0.35) continue
    p.later(2, 2.01, () => {
      const [x, y] = p.at(c, r)
      const color = ['#e53935', '#1e88e5', '#fafafa', '#424242', '#43a047'][i % 5]
      p.box(x, y, { cols: 0.22, rows: 0.4, height: 3, elevation: 45, color })
    })
  }
}

function hotel(b: B) {
  const { p } = b
  p.later(2, 2, () => {
    box(b, 2, 2, { cols: 3.8, rows: 3.8, height: 14, color: '#d7ccc8' }, true)
    // a pool on the podium
    p.poly(
      [p.at(2.6, 2.7), p.at(3.6, 2.7), p.at(3.6, 3.6), p.at(2.6, 3.6)].map(
        ([x, y]) => [x, y - 14] as Point,
      ),
      p.c('#4fc3f7'),
    )
  })
  p.later(1.7, 1.8, () => {
    const [x, y] = p.at(1.6, 1.7)
    const shape: IsoBox = { cols: 2.0, rows: 1.5, height: 118, elevation: 14, color: '#8fa3ad' }
    p.box(x, y, shape)
    p.windows(x, y - 14, { ...shape, elevation: 0 }, 41, '#d6ecff', 6)
    p.box(x, y, { cols: 2.06, rows: 1.56, height: 5, elevation: 132, color: '#546e7a' })
    p.text('SKYLINE', x, y - 146, 9, '#ff80ab', true)
    obstructionLight(b, x, y - 140, 0.8)
  })
}

function rental(b: B) {
  const { p } = b
  p.later(1.2, 1.7, () => {
    const shape: IsoBox = { cols: 2.0, rows: 2.8, height: 18, color: '#f2f2f2' }
    const [, right, front, left] = box(b, 1.2, 1.7, shape, true)
    drawFaceRect(p.ctx, left, front, 0, 1, 3, 7, p.c('#2e7d32'))
    drawFaceRect(p.ctx, front, right, 0, 1, 3, 7, p.c('#2e7d32'))
    curtainWall(b, 1.2, 1.7, { ...shape, height: 10, elevation: 0 }, 0.3)
    const mid = along(front, right, 0.5)
    wallText(p, 'CAR RENTAL', mid[0], mid[1] + 5, 'right', 5, '#ffffff')
  })
  // rows of rental cars
  for (let i = 0; i < 12; i++) {
    const c = 2.75 + (i % 3) * 0.42
    const r = 0.5 + Math.floor(i / 3) * 0.85
    p.later(c, r, () => {
      const [x, y] = p.at(c, r)
      const color = ['#fafafa', '#90a4ae', '#212121', '#c62828'][i % 4]
      p.box(x, y, { cols: 0.22, rows: 0.4, height: 4, color })
      p.box(x, y, { cols: 0.18, rows: 0.22, height: 3, elevation: 4, color: '#b3e5fc' })
    })
  }
}

function station(b: B) {
  const { p } = b
  p.later(2, 1.1, () => {
    const shape: IsoBox = { cols: 3.6, rows: 1.6, height: 14, color: '#b0bec5' }
    box(b, 2, 1.1, shape, true)
    curtainWall(b, 2, 1.1, shape, 0.3)
    // the glass barrel roof, in steps
    for (const [rows, height, elevation] of [
      [1.6, 3, 14],
      [1.2, 3, 17],
      [0.6, 2, 20],
    ])
      box(b, 2, 1.1, { cols: 3.7, rows, height, elevation, color: '#a7c7d6' })
  })
  p.later(2, 2.5, () => box(b, 2, 2.5, { cols: 3.9, rows: 0.7, height: 3, color: '#bcb6aa' }))
  // the airport express, coming and going
  const t = (b.time / 24) % 1
  const shift = t < 0.15 ? (0.15 - t) * 30 : t > 0.85 ? -(t - 0.85) * 30 : 0
  for (let i = 0; i < 3; i++) {
    const c = 0.65 + i * 1.3 + shift
    if (c < 0.3 || c > 3.7) continue
    p.later(c, 3.25, () => {
      const [x, y] = p.at(c, 3.25)
      const shape: IsoBox = { cols: 1.2, rows: 0.34, height: 9, color: '#fafafa' }
      p.box(x, y, shape)
      const [, , front, left] = p.boxTop(x, y, shape)
      drawFaceRect(p.ctx, left, front, 0.04, 0.96, 2, 5, p.c('#37474f'))
      drawFaceRect(p.ctx, left, front, 0, 1, 7, 8, p.c('#e53935'))
      if (b.night > 0) {
        p.ctx.globalAlpha = b.night
        drawFaceRect(p.ctx, left, front, 0.06, 0.94, 2.5, 4.5, '#ffe9b0')
        p.ctx.globalAlpha = 1
      }
    })
  }
}

/**
 * A hangar with a barrel roof. The roof runs along `axis`, the door is in the gable at the front end:
 * on the +row side for 'rows', on the +col side for 'cols'.
 */
function hangar(b: B, axis: 'rows' | 'cols', label: string, color = '#c3ccd2') {
  const { p } = b
  const { ctx } = p
  // a: across the roof, l: along it
  const at = (a: number, l: number, z: number): Point => {
    const [x, y] = axis === 'rows' ? p.at(a, l) : p.at(l, a)
    return [x, y - z]
  }
  const a0 = 0.25
  const a1 = 3.75
  const l0 = 0.2
  const l1 = 3.6
  const wall = 16
  const rise = 17
  const steps = 12
  const z = (a: number) => wall + rise * Math.sqrt(Math.max(0, 1 - ((a - 2) / 1.75) ** 2))
  p.later(2, 2, () => {
    const [sx, sy] = p.at(2, 2)
    p.shadow(sx, sy, 3.5, 3.5)
    // the long side wall facing the viewer
    p.poly(
      [at(a1, l0, wall), at(a1, l1, wall), at(a1, l1, 0), at(a1, l0, 0)],
      shade(p.c(color), axis === 'rows' ? -0.35 : -0.15),
    )
    // the roof, strip by strip
    for (let i = 0; i < steps; i++) {
      const s0 = a0 + ((a1 - a0) * i) / steps
      const s1 = a0 + ((a1 - a0) * (i + 1)) / steps
      const light = -0.02 - 0.3 * (i / steps)
      p.poly(
        [at(s0, l0, z(s0)), at(s1, l0, z(s1)), at(s1, l1, z(s1)), at(s0, l1, z(s0))],
        shade(p.c('#d9dee2'), light),
      )
    }
    // the gable with the door
    const gable: Point[] = [at(a0, l1, 0)]
    for (let i = 0; i <= steps; i++) {
      const s = a0 + ((a1 - a0) * i) / steps
      gable.push(at(s, l1, z(s)))
    }
    gable.push(at(a1, l1, 0))
    p.poly(gable, shade(p.c(color), axis === 'rows' ? -0.12 : -0.3))
    const door = [at(0.55, l1, 0), at(0.55, l1, 22), at(3.45, l1, 22), at(3.45, l1, 0)]
    p.poly(door, p.c('#2c3338'))
    if (b.night > 0) {
      ctx.globalAlpha = b.night * 0.7
      p.poly(door, '#ffe6b0')
      ctx.globalAlpha = 1
    }
    // the door panels, pushed aside
    for (const [d0, d1] of [
      [0.55, 0.95],
      [3.05, 3.45],
    ]) {
      p.poly(
        [at(d0, l1, 0), at(d0, l1, 22), at(d1, l1, 22), at(d1, l1, 0)],
        shade(p.c(color), -0.25),
      )
    }
    const [tx, ty] = at(2, l1, 27)
    wallText(p, label, tx, ty, axis === 'rows' ? 'left' : 'right', 5.5, '#263238')
  })
}

function cargo(b: B) {
  const { p } = b
  p.later(1.7, 2, () => {
    const shape: IsoBox = { cols: 3.0, rows: 3.6, height: 24, color: '#aab7bf' }
    const [, right, front, left] = box(b, 1.7, 2, shape, true)
    // corrugated walls
    p.ctx.strokeStyle = p.c('#8a979f')
    p.ctx.lineWidth = 1
    for (const [a, c] of [
      [left, front],
      [front, right],
    ] as Array<[Point, Point]>) {
      for (let i = 1; i < 16; i++) {
        const q = along(a, c, i / 16)
        p.ctx.beginPath()
        p.ctx.moveTo(q[0], q[1])
        p.ctx.lineTo(q[0], q[1] + 24)
        p.ctx.stroke()
      }
    }
    for (let i = 0; i < 4; i++)
      drawFaceRect(p.ctx, front, right, 0.06 + i * 0.235, 0.24 + i * 0.235, 9, 24, p.c('#5d6b73'))
    const mid = along(left, front, 0.5)
    wallText(p, 'CARGO', mid[0], mid[1] + 7, 'left', 8, '#ff8f00')
  })
  // stacks of containers
  const colors = ['#ff8f00', '#1565c0', '#c62828', '#2e7d32', '#6d4c41']
  for (let i = 0; i < 4; i++) {
    const r = 0.5 + i * 0.85
    p.later(3.55, r, () => {
      const [x, y] = p.at(3.55, r)
      const stack = 1 + Math.floor(noise(i, 9) * 3)
      for (let k = 0; k < stack; k++)
        p.box(x, y, {
          cols: 0.36,
          rows: 0.6,
          height: 6,
          elevation: k * 6,
          color: colors[(i + k) % colors.length],
        })
    })
  }
}

/** Giant letters standing along the columns, facing the runways */
function sign(b: B) {
  const { p } = b
  p.later(2, 0.6, () => {
    const [x, y] = p.at(2, 0.6)
    for (const c of [0.35, 3.65]) {
      const [px, py] = p.at(c, 0.6)
      p.cylinder(px, py, 0.05, 10, '#78909c')
    }
    wallText(p, 'ISO INTL', x + 1.5, y - 21, 'left', 26, '#90a4ae')
    wallText(p, 'ISO INTL', x, y - 22, 'left', 26, b.night > 0.3 ? '#fff6d6' : '#ffffff', true)
  })
}

export const BUILDING_DRAWINGS: Record<BuildingKind, (scene: BuildingScene) => void> = {
  terminal,
  pierA: (b) => pier(b, 'cols'),
  pierB: (b) => pier(b, 'rows'),
  tower,
  firestation,
  concorde,
  themebuilding,
  garage,
  hotel,
  rental,
  station,
  hangar: (b) => hangar(b, 'rows', b.char === 'M' ? 'HANGAR 1' : 'HANGAR 2'),
  cargo,
  cargohangar: (b) => hangar(b, 'cols', 'CUBE CARGO', '#c9b79c'),
  sign,
}

export type PropScene = {
  p: IsoPainter
  /** The center of the cell on screen */
  x: number
  y: number
  col: number
  row: number
  time: number
  night: number
}

export const PROP_DRAWINGS: Record<PropKind, (scene: PropScene) => void> = {
  tree: ({ p, x, y, col, row }) =>
    drawTree(p, x, y, col * 31 + row * 17, 0.9 + noise(col, row) * 0.4),
  floodlight: ({ p, x, y, night }) => {
    p.cylinder(x, y, 0.04, 50, '#9e9e9e')
    p.box(x, y, { cols: 0.3, rows: 0.3, height: 3, elevation: 50, color: '#616161' })
    if (night > 0) {
      p.light(x, y - 51, 18, 'rgba(255,248,220,1)', night * 0.8)
      p.ctx.fillStyle = '#fffbe8'
      p.ctx.fillRect(x - 4, y - 50, 8, 2)
    }
  },
  fueltank: ({ p, x, y }) => {
    p.ctx.fillStyle = `rgba(0,0,0,${0.15 * (1 - p.night * 0.6)})`
    p.ctx.beginPath()
    p.ctx.ellipse(x + 5, y + 2, 20, 10, 0, 0, Math.PI * 2)
    p.ctx.fill()
    p.cylinder(x, y, 0.42, 20, '#f2f2f2')
    p.cylinder(x, y, 0.425, 2, '#e53935', 14)
    p.cylinder(x, y, 0.3, 2, '#e0e0e0', 20)
  },
  radar: ({ p, x, y, time }) => {
    const { ctx } = p
    ctx.strokeStyle = p.c('#9e9e9e')
    ctx.lineWidth = 1.5
    for (const dx of [-6, 6]) {
      ctx.beginPath()
      ctx.moveTo(x + dx, y)
      ctx.lineTo(x, y - 18)
      ctx.stroke()
    }
    p.cylinder(x, y, 0.08, 3, '#757575', 17)
    // the antenna turns every 4 seconds
    const angle = (time / 4) * Math.PI * 2
    const dx = Math.cos(angle) * 16
    const dy = Math.sin(angle) * 8
    ctx.lineCap = 'round'
    ctx.lineWidth = 4
    ctx.strokeStyle = p.c(Math.sin(angle) > 0 ? '#eceff1' : '#b0bec5')
    ctx.beginPath()
    ctx.moveTo(x - dx, y - 22 - dy)
    ctx.lineTo(x + dx, y - 22 + dy)
    ctx.stroke()
  },
  windsock: ({ p, x, y, time }) => {
    const { ctx } = p
    ctx.strokeStyle = p.c('#bdbdbd')
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x, y - 24)
    ctx.stroke()
    // the sock points with the wind, flapping a little
    for (let i = 0; i < 5; i++) {
      const wave = Math.sin(time * 6 - i) * 0.8
      const x0 = x + i * 4
      const r0 = 3 - i * 0.45
      const r1 = 3 - (i + 1) * 0.45
      p.poly(
        [
          [x0, y - 24 - r0 + i * 0.6],
          [x0 + 4, y - 24 - r1 + (i + 1) * 0.6 + wave],
          [x0 + 4, y - 24 + r1 + (i + 1) * 0.6 + wave],
          [x0, y - 24 + r0 + i * 0.6],
        ],
        p.c(i % 2 ? '#fafafa' : '#ff6d00'),
      )
    }
    if (p.night > 0) {
      p.light(x, y - 26, 8, 'rgba(255,240,200,1)', p.night * 0.5)
    }
  },
  jet: ({ p, x, y, col, row, time }) =>
    drawPlane(p, x, y, col > row ? vec(0, -1) : vec(-1, 0), {
      kind: 'wide',
      color: '#ff8f00',
      tail: '#ff8f00',
      time,
      service: false,
    }),
  cessna: ({ p, x, y, col, row, time }) =>
    drawPlane(p, x, y, normalize(vec(-1, -0.4)), {
      kind: 'cessna',
      color: noise(col, row) > 0.5 ? '#c62828' : '#1565c0',
      tail: '#eceff1',
      time,
    }),
}
