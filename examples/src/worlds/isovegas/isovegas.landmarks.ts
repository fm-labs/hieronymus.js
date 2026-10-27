/**
 * The landmarks of the 'isovegas' world, drawn from boxes, cylinders, cones and pyramids.
 *
 * Each landmark fills its whole footprint. Its parts are positioned in footprint cells,
 * (0, 0) is the back corner and (cols, rows) the front corner, and drawn back to front.
 */
import { along, IsoPainter, mix, noise, shade, type Point } from './isovegas.draw.ts'
import type { LandmarkKind } from './isovegas.map.ts'

export type LandmarkScene = {
  p: IsoPainter
  cols: number
  rows: number
  /** Seconds, for animations */
  time: number
  /** 0 by day, 1 at night */
  night: number
}

type L = LandmarkScene

const WATER = '#2f93c4'

/** A hotel tower: a box with windows, and an optional roof cap */
function tower(
  l: L,
  col: number,
  row: number,
  cols: number,
  rows: number,
  height: number,
  color: string,
  seed: number,
  options: { cap?: string; glass?: string } = {},
) {
  l.p.later(col, row, () => {
    const [x, y] = l.p.at(col, row)
    const box = { cols, rows, height, color }
    l.p.shadow(x, y, cols, rows)
    l.p.box(x, y, box)
    l.p.windows(x, y, box, seed, options.glass)
    if (options.cap) {
      l.p.box(x, y, {
        cols: cols + 0.04,
        rows: rows + 0.04,
        height: 6,
        elevation: height,
        color: options.cap,
      })
    }
  })
}

/** A billboard on a pole, facing the viewer, with neon text and a neon frame */
function sign(l: L, col: number, row: number, text: string, color: string, height = 34) {
  l.p.later(col, row, () => {
    const { p } = l
    const { ctx } = p
    const [x, y] = p.at(col, row)
    p.cylinder(x, y, 0.04, height, '#9e9e9e')
    ctx.font = 'bold 7px Arial'
    const width = ctx.measureText(text).width + 8
    const top = y - height - 12
    ctx.fillStyle = p.c('#2a2238')
    ctx.fillRect(x - width / 2, top, width, 12)
    ctx.save()
    if (l.night > 0) {
      ctx.shadowColor = color
      ctx.shadowBlur = 6 * l.night
    }
    ctx.strokeStyle = color
    ctx.globalAlpha = 0.5 + l.night * 0.5
    ctx.lineWidth = 1
    ctx.strokeRect(x - width / 2 + 0.5, top + 0.5, width - 1, 11)
    ctx.restore()
    p.text(text, x, top + 6.5, 7, color, true)
  })
}

export function drawPalm(
  p: IsoPainter,
  x: number,
  y: number,
  height: number,
  time: number,
  seed: number,
) {
  const { ctx } = p
  const lean = (noise(seed) - 0.5) * 10
  const sway = Math.sin(time * 1.3 + seed) * 1.5
  const top: Point = [x + lean + sway, y - height]
  ctx.fillStyle = `rgba(0,0,0,${0.15 * (1 - p.night * 0.6)})`
  ctx.beginPath()
  ctx.ellipse(x + 8, y + 2, 10, 4, 0, 0, Math.PI * 2)
  ctx.fill()
  // warm uplight at night
  p.light(x, y - height * 0.5, height * 0.6, 'rgba(255,200,120,0.6)', p.night * 0.35)

  ctx.lineCap = 'round'
  ctx.strokeStyle = p.c('#8a6a48')
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.quadraticCurveTo(x + lean * 0.1, y - height * 0.55, top[0], top[1])
  ctx.stroke()

  const leaf = p.c(noise(seed, 1) > 0.5 ? '#3f8f3a' : '#4c9b3c')
  const fronds = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2 + seed)
  // the back fronds first
  fronds.sort((a, b) => Math.sin(a) - Math.sin(b))
  for (const angle of fronds) {
    const dx = Math.cos(angle) * 14
    const dy = Math.sin(angle) * 5
    ctx.strokeStyle = shade(leaf, dy < 0 ? -0.25 : 0)
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(top[0], top[1])
    ctx.quadraticCurveTo(top[0] + dx * 0.6, top[1] + dy * 0.6 - 7, top[0] + dx, top[1] + dy + 5)
    ctx.stroke()
  }
  ctx.fillStyle = p.c('#5d4027')
  ctx.beginPath()
  ctx.arc(top[0], top[1] + 2, 2.2, 0, Math.PI * 2)
  ctx.fill()
}

function palm(l: L, col: number, row: number, height = 30) {
  l.p.later(col, row, () => {
    const [x, y] = l.p.at(col, row)
    drawPalm(l.p, x, y, height, l.time, col * 13 + row * 7)
  })
}

function cypress(l: L, col: number, row: number, height = 22) {
  l.p.later(col, row, () => {
    const { ctx } = l.p
    const [x, y] = l.p.at(col, row)
    const gradient = ctx.createLinearGradient(x - 4, 0, x + 4, 0)
    gradient.addColorStop(0, l.p.c('#3d7a3a'))
    gradient.addColorStop(1, l.p.c('#1f4a22'))
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.ellipse(x, y - height / 2, 3.8, height / 2, 0, 0, Math.PI * 2)
    ctx.fill()
  })
}

/** Water with a few moving glints */
function water(l: L, col: number, row: number, a: number, b: number, rim = '#e8e0cc') {
  l.p.later(-100, 0, () => {
    l.p.groundEllipse(col, row, a + 0.15, b + 0.15, rim)
    l.p.groundEllipse(col, row, a, b, WATER)
    glints(l, col, row, a * 0.7, b * 0.7, 6)
  })
}

function glints(l: L, col: number, row: number, a: number, b: number, count: number) {
  const { ctx } = l.p
  ctx.strokeStyle = l.night > 0.5 ? 'rgba(255,220,160,0.5)' : 'rgba(255,255,255,0.55)'
  ctx.lineWidth = 1.2
  for (let i = 0; i < count; i++) {
    const t = (l.time * 0.15 + noise(i, 3)) % 1
    const [x, y] = l.p.at(col + (noise(i, 1) * 2 - 1) * a, row + (noise(i, 2) * 2 - 1) * b)
    ctx.globalAlpha = Math.sin(t * Math.PI)
    ctx.beginPath()
    ctx.moveTo(x - 5 + t * 4, y)
    ctx.lineTo(x + 1 + t * 4, y)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

function circus(l: L) {
  const { p } = l
  p.later(-100, 0, () => p.groundEllipse(5.2, 3.2, 2.0, 2.0, '#ecd3c0'))
  tower(l, 1.6, 1.3, 2.4, 1.0, 105, '#f7efe8', 11, { cap: '#e2387a', glass: '#f48fb1' })
  tower(l, 0.9, 3.6, 1.0, 2.0, 82, '#f7efe8', 12, { cap: '#e2387a', glass: '#f48fb1' })
  p.later(5.2, 3.2, () => {
    const [x, y] = p.at(5.2, 3.2)
    p.shadow(x, y, 2.4, 2.4)
    p.cylinder(x, y, 1.55, 12, '#c62828')
    p.cone(x, y, 1.65, 40, ['#e53935', '#fafafa'], 12, 18)
    p.cylinder(x, y, 0.18, 6, '#fdd835', 46)
    // a pennant on the top
    const { ctx } = p
    const top = y - 52
    ctx.strokeStyle = p.c('#5d4037')
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(x, top)
    ctx.lineTo(x, top - 16)
    ctx.stroke()
    const wave = Math.sin(l.time * 4) * 2
    p.poly(
      [
        [x, top - 16],
        [x + 11, top - 13 + wave],
        [x, top - 10],
      ],
      p.c('#fdd835'),
    )
    // a ring of bulbs around the tent
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI
      const on = Math.floor(l.time * 4 + i) % 3 !== 0
      ctx.fillStyle = on ? '#fff59d' : p.c('#bdbdbd')
      ctx.beginPath()
      ctx.arc(x + Math.cos(angle) * 73, y - 12 + Math.sin(angle) * 36, 1.6, 0, Math.PI * 2)
      ctx.fill()
    }
  })
  sign(l, 7.5, 5.4, 'CIRCUS CIRCUS', '#ff4fa3')
  palm(l, 7.6, 0.6)
  palm(l, 7.6, 2.0)
  palm(l, 0.4, 5.6)
  palm(l, 3.0, 5.6)
}

function strat(l: L) {
  const { p } = l
  tower(l, 1.0, 1.4, 1.4, 2.0, 70, '#efe7da', 21, { cap: '#b71c1c' })
  p.later(2.6, 2.4, () => {
    const { ctx } = p
    const [x, y] = p.at(2.6, 2.4)
    const height = 210
    const color = p.c('#ebe6dc')
    // three flaring legs, and the slim shaft
    for (const side of [-1, 1]) {
      p.poly(
        [
          [x + side * 24, y + 2],
          [x + side * 9, y],
          [x + side * 5, y - 70],
        ],
        shade(color, side < 0 ? -0.1 : -0.35),
      )
    }
    p.poly(
      [
        [x - 10, y + 2],
        [x, y + 4],
        [x, y - height],
        [x - 6, y - height],
      ],
      shade(color, -0.05),
    )
    p.poly(
      [
        [x, y + 4],
        [x + 10, y + 2],
        [x + 6, y - height],
        [x, y - height],
      ],
      shade(color, -0.35),
    )
    // the pod with its glass decks
    p.cylinder(x, y, 0.4, 10, '#cfd8dc', height)
    p.cylinder(x, y, 0.56, 9, '#3d5361', height + 10)
    p.cylinder(x, y, 0.62, 4, '#eceff1', height + 19)
    p.cylinder(x, y, 0.47, 12, '#455a64', height + 23)
    p.cylinder(x, y, 0.5, 3, '#eceff1', height + 35)
    if (l.night > 0) {
      ctx.globalAlpha = l.night
      ctx.strokeStyle = '#ffe08a'
      ctx.lineWidth = 2
      for (const [r, dy] of [
        [0.56, 14],
        [0.47, 29],
      ]) {
        ctx.beginPath()
        ctx.ellipse(x, y - height - dy, r * 45, r * 22.6, 0, 0, Math.PI)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }
    // the spire, and the Big Shot ride going up and down
    p.cylinder(x, y, 0.06, 44, '#eceff1', height + 38)
    p.cylinder(x, y, 0.065, 4, '#d32f2f', height + 52)
    p.cylinder(x, y, 0.065, 4, '#d32f2f', height + 66)
    const shot = (Math.sin(l.time * 0.9) + 1) / 2
    p.cylinder(x, y, 0.14, 3, '#ffca28', height + 40 + shot * 36)
    // an aircraft warning light
    if (l.time % 1.6 < 0.5) {
      p.light(x, y - height - 84, 12, 'rgba(255,40,40,1)', 0.4 + l.night * 0.6)
      ctx.fillStyle = '#ff3030'
      ctx.beginPath()
      ctx.arc(x, y - height - 84, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  })
  p.later(2.2, 4.4, () => {
    const [x, y] = p.at(2.2, 4.4)
    p.shadow(x, y, 3.2, 2.4)
    const box = { cols: 3.2, rows: 2.4, height: 22, color: '#e9dfcf' }
    const [, right, front, left] = p.box(x, y, box)
    // a red band around the casino
    p.ctx.strokeStyle = p.c('#c62828')
    p.ctx.lineWidth = 3
    p.ctx.beginPath()
    p.ctx.moveTo(left[0], left[1] + 4)
    p.ctx.lineTo(front[0], front[1] + 4)
    p.ctx.lineTo(right[0], right[1] + 4)
    p.ctx.stroke()
  })
  sign(l, 3.6, 5.6, 'STRAT', '#ff3d3d')
  palm(l, 0.4, 5.6)
  palm(l, 3.6, 0.4)
}

function wynn(l: L) {
  const { p } = l
  p.later(-100, 0, () => {
    // the golf course, with a lake
    p.ground(0.1, 3.4, 3.9, 5.9, '#5fa64a')
    p.groundEllipse(1.6, 4.4, 0.7, 0.5, '#7cc05d')
  })
  water(l, 2.8, 4.9, 0.7, 0.6)
  l.p.later(1.6, 4.4, () => {
    // the flag on the green
    const [x, y] = p.at(1.6, 4.4)
    p.ctx.strokeStyle = p.c('#eeeeee')
    p.ctx.lineWidth = 1
    p.ctx.beginPath()
    p.ctx.moveTo(x, y)
    p.ctx.lineTo(x, y - 14)
    p.ctx.stroke()
    p.poly(
      [
        [x, y - 14],
        [x + 7, y - 12],
        [x, y - 10],
      ],
      p.c('#e53935'),
    )
  })
  tower(l, 2.9, 1.0, 1.6, 0.9, 128, '#9b6233', 31, { glass: '#e8b878' })
  tower(l, 1.4, 1.9, 1.0, 2.6, 150, '#ad7337', 32, { glass: '#e8b878' })
  p.later(1.41, 1.91, () => {
    const [x, y] = p.at(1.4, 1.9)
    p.text('Wynn', x, y - 152, 13, '#fff3d6', true, 'Georgia')
  })
  palm(l, 0.3, 3.5)
  palm(l, 3.7, 3.3)
  palm(l, 0.3, 5.7)
  palm(l, 3.7, 5.7)
}

function mirage(l: L) {
  const { p, time } = l
  water(l, 5.3, 3.7, 2.3, 1.9, '#e6d3a3')
  tower(l, 2.0, 1.5, 0.9, 0.9, 112, '#f4efe4', 41, { glass: '#e3b850' })
  tower(l, 0.9, 1.5, 1.3, 0.6, 100, '#f4efe4', 42, { glass: '#e3b850' })
  tower(l, 2.0, 2.8, 0.6, 1.6, 100, '#f4efe4', 43, { glass: '#e3b850' })
  tower(l, 3.2, 0.9, 1.4, 0.55, 100, '#f4efe4', 44, { glass: '#e3b850' })

  p.later(5.6, 3.5, () => {
    const { ctx } = p
    const [x, y] = p.at(5.6, 3.5)
    p.cone(x, y, 0.95, 34, ['#6b4a35', '#5d3f2c', '#7a563d'], 0, 12)
    const crater: Point = [x, y - 31]
    // erupts for 9 seconds every 24 seconds
    const cycle = time % 24
    const erupt = cycle < 9 ? Math.sin((cycle / 9) * Math.PI) : 0
    p.disc(x, y, 0.22, erupt > 0 ? mix('#3a2418', '#ff6a00', erupt) : '#3a2418', 30)
    if (erupt > 0) {
      p.light(crater[0], crater[1], 60, 'rgba(255,120,20,0.9)', erupt * (0.5 + l.night * 0.5))
      // lava running down the front
      ctx.strokeStyle = '#ff7a1a'
      ctx.lineWidth = 2
      ctx.globalAlpha = erupt
      for (const dx of [-14, -4, 8]) {
        ctx.beginPath()
        ctx.moveTo(crater[0] + dx * 0.2, crater[1] + 2)
        ctx.quadraticCurveTo(
          crater[0] + dx * 0.8,
          crater[1] + 14,
          crater[0] + dx * 1.4,
          crater[1] + 26 * erupt + 4,
        )
        ctx.stroke()
      }
      // fireballs
      for (let i = 0; i < 28; i++) {
        const t = (time * 0.8 + noise(i)) % 1
        const angle = (noise(i, 1) - 0.5) * 1.6
        const px = crater[0] + Math.sin(angle) * 44 * t
        const py = crater[1] - (60 + noise(i, 2) * 50) * t * erupt + 90 * t * t
        ctx.fillStyle = `hsl(${15 + 40 * (1 - t)},100%,${55 + 20 * (1 - t)}%)`
        ctx.beginPath()
        ctx.arc(px, py, 3.2 * (1 - t) + 0.8, 0, Math.PI * 2)
        ctx.fill()
      }
      // fire on the water
      for (let i = 0; i < 6; i++) {
        const [fx, fy] = p.at(5.6 + Math.cos(i) * 1.4, 3.5 + Math.sin(i * 1.7) * 1.1)
        const h = (6 + 6 * Math.abs(Math.sin(time * 7 + i))) * erupt
        p.poly(
          [
            [fx - 3, fy],
            [fx, fy - h],
            [fx + 3, fy],
          ],
          '#ffb300',
        )
      }
      ctx.globalAlpha = 1
    } else {
      // steam
      for (let i = 0; i < 3; i++) {
        const t = (time * 0.3 + i / 3) % 1
        ctx.fillStyle = `rgba(230,230,230,${0.35 * (1 - t)})`
        ctx.beginPath()
        ctx.arc(crater[0] + t * 8, crater[1] - 4 - t * 22, 3 + t * 6, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  })
  for (const [c, r] of [
    [3.3, 2.2],
    [4.3, 1.6],
    [7.4, 2.4],
    [7.6, 4.4],
    [6.8, 5.6],
    [3.8, 5.5],
    [3.0, 4.0],
  ]) {
    palm(l, c, r)
  }
  sign(l, 7.6, 5.7, 'THE MIRAGE', '#ffcf40')
}

function venetian(l: L) {
  const { p, time } = l
  p.later(-100, 0, () => {
    p.ground(0.05, 5.05, 3.95, 5.15, '#eadfcf')
    p.ground(0.05, 5.15, 3.95, 5.8, WATER)
    glints(l, 2, 5.45, 1.8, 0.2, 4)
  })
  tower(l, 1.3, 1.6, 2.0, 1.6, 120, '#efe2c4', 51, { cap: '#c0663e' })
  tower(l, 3.1, 0.9, 1.2, 1.2, 135, '#e9dcc0', 52, { cap: '#c0663e' })
  // the Doge's Palace: pink walls with white arcades
  p.later(1.6, 4.3, () => {
    const [x, y] = p.at(1.6, 4.3)
    const box = { cols: 2.8, rows: 1.0, height: 24, color: '#f0c4b0' }
    p.shadow(x, y, box.cols, box.rows)
    const [, , front, left] = p.box(x, y, box)
    p.ctx.fillStyle = p.c('#7a4b3a')
    for (let i = 0; i < 12; i++) {
      const a = along(left, front, (i + 0.25) / 12)
      const b = along(left, front, (i + 0.75) / 12)
      p.poly(
        [
          [a[0], a[1] + 14],
          [b[0], b[1] + 14],
          [b[0], b[1] + 23],
          [a[0], a[1] + 23],
        ],
        p.c('#7a4b3a'),
      )
    }
    p.box(x, y, { ...box, cols: 2.84, rows: 1.04, height: 3, elevation: 24, color: '#faf3e8' })
  })
  // the Campanile
  p.later(3.4, 3.4, () => {
    const [x, y] = p.at(3.4, 3.4)
    p.shadow(x, y, 0.4, 0.4)
    p.box(x, y, { cols: 0.4, rows: 0.4, height: 72, color: '#b5533a' })
    const [, , front, left] = p.box(x, y, {
      cols: 0.44,
      rows: 0.44,
      height: 10,
      elevation: 72,
      color: '#f3eee2',
    })
    const [, right] = p.boxTop(x, y, {
      cols: 0.44,
      rows: 0.44,
      height: 10,
      elevation: 72,
      color: '',
    })
    for (const [a, b] of [
      [left, front],
      [front, right],
    ]) {
      const s = along(a, b, 0.3)
      const e = along(a, b, 0.7)
      p.poly(
        [
          [s[0], s[1] + 2],
          [e[0], e[1] + 2],
          [e[0], e[1] + 8],
          [s[0], s[1] + 8],
        ],
        p.c('#5a4636'),
      )
    }
    const { apex } = p.pyramid(x, y, 0.44, 0.44, 24, '#3f8f6a', 82)
    p.ctx.fillStyle = '#e8c45a'
    p.ctx.beginPath()
    p.ctx.arc(apex[0], apex[1] - 2, 1.8, 0, Math.PI * 2)
    p.ctx.fill()
  })
  // a gondola going up and down the canal
  const gc = 2 + 1.5 * Math.sin(time * 0.25)
  p.later(gc, 5.45, () => {
    const [x, y] = p.at(gc, 5.45)
    p.box(x, y, { cols: 0.5, rows: 0.1, height: 3, color: '#1b1b1b' })
    p.box(x + 4, y + 2, { cols: 0.06, rows: 0.06, height: 6, elevation: 3, color: '#f5f5f5' })
    p.box(x + 4, y + 2, { cols: 0.065, rows: 0.065, height: 2, elevation: 5, color: '#d32f2f' })
    p.ctx.fillStyle = p.c('#f0c8a0')
    p.ctx.beginPath()
    p.ctx.arc(x + 4, y - 9, 1.8, 0, Math.PI * 2)
    p.ctx.fill()
    p.ctx.strokeStyle = p.c('#6d4c41')
    p.ctx.lineWidth = 1
    p.ctx.beginPath()
    p.ctx.moveTo(x + 8, y - 12)
    p.ctx.lineTo(x + 1, y + 4)
    p.ctx.stroke()
  })
  sign(l, 0.4, 3.4, 'THE VENETIAN', '#ffd36b')
  palm(l, 0.3, 0.4)
  palm(l, 3.7, 2.6)
}

function sphere(l: L) {
  const { p, time } = l
  p.later(-100, 0, () => p.groundEllipse(2, 3, 1.75, 1.75, '#bdb5a8'))
  p.later(2, 3, () => {
    const { ctx } = p
    const [x, y] = p.at(2, 3)
    p.shadow(x, y, 2.4, 2.4)
    p.cylinder(x, y, 1.15, 6, '#2b2d3a')
    const radius = 60
    const cx = x
    const cy = y - 6 - radius * 0.92
    const show = Math.floor(time / 9) % 5
    const glowColors = ['#9ad7ff', '#4f9dff', '#ffd23f', '#ff4fd8', '#ff9a3c']
    p.light(cx, cy, radius * 1.9, glowColors[show], 0.15 + l.night * 0.45)

    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.clip()
    drawSphereShow(ctx, show, cx, cy, radius, time)
    // light from the top left
    const shading = ctx.createRadialGradient(
      cx - radius * 0.35,
      cy - radius * 0.4,
      radius * 0.1,
      cx,
      cy,
      radius,
    )
    shading.addColorStop(0, 'rgba(255,255,255,0.25)')
    shading.addColorStop(0.7, 'rgba(0,0,0,0)')
    shading.addColorStop(1, 'rgba(0,0,0,0.45)')
    ctx.fillStyle = shading
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2)
    ctx.restore()
  })
  palm(l, 0.3, 0.4)
  palm(l, 3.7, 0.4)
  palm(l, 0.3, 5.6)
  palm(l, 3.7, 5.6)
}

/** The LED shows of the Sphere: an eye, the earth, a smiley, rainbow stripes and a basketball */
function drawSphereShow(
  ctx: CanvasRenderingContext2D,
  show: number,
  cx: number,
  cy: number,
  r: number,
  time: number,
) {
  const circle = (x: number, y: number, radius: number, fill: string | CanvasGradient) => {
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fillStyle = fill
    ctx.fill()
  }
  const all = (fill: string | CanvasGradient) => {
    ctx.fillStyle = fill
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
  }
  switch (show) {
    case 0: {
      all('#f4f4f4')
      const ix = cx + Math.sin(time * 0.8) * r * 0.28
      const iy = cy + Math.cos(time * 0.53) * r * 0.15
      const iris = ctx.createRadialGradient(ix, iy, r * 0.05, ix, iy, r * 0.42)
      iris.addColorStop(0, '#9be7ff')
      iris.addColorStop(1, '#1257b0')
      circle(ix, iy, r * 0.42, iris)
      circle(ix, iy, r * 0.19, '#111111')
      circle(ix - r * 0.09, iy - r * 0.09, r * 0.07, '#ffffff')
      if (time % 3.7 < 0.18) all('#e9b994')
      break
    }
    case 1: {
      const ocean = ctx.createLinearGradient(cx, cy - r, cx, cy + r)
      ocean.addColorStop(0, '#3b8ff0')
      ocean.addColorStop(1, '#0d3b8c')
      all(ocean)
      ctx.fillStyle = '#3fae5a'
      for (let i = 0; i < 7; i++) {
        const x = cx + (((((noise(i) * 2 + time * 0.06) % 2) + 2) % 2) - 1) * r * 1.6
        ctx.beginPath()
        ctx.ellipse(
          x,
          cy + (noise(i, 1) - 0.5) * r * 1.3,
          r * (0.18 + noise(i, 2) * 0.25),
          r * 0.16,
          noise(i, 3),
          0,
          Math.PI * 2,
        )
        ctx.fill()
      }
      ctx.fillStyle = '#f5f9ff'
      ctx.fillRect(cx - r, cy - r, r * 2, r * 0.18)
      ctx.fillRect(cx - r, cy + r * 0.84, r * 2, r * 0.16)
      break
    }
    case 2: {
      all('#ffd23f')
      ctx.fillStyle = '#4a3200'
      ctx.beginPath()
      ctx.ellipse(cx - r * 0.32, cy - r * 0.2, r * 0.09, r * 0.16, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.lineWidth = r * 0.08
      ctx.strokeStyle = '#4a3200'
      ctx.lineCap = 'round'
      if (time % 4 < 0.4) {
        // wink
        ctx.beginPath()
        ctx.moveTo(cx + r * 0.22, cy - r * 0.2)
        ctx.lineTo(cx + r * 0.42, cy - r * 0.2)
        ctx.stroke()
      } else {
        ctx.beginPath()
        ctx.ellipse(cx + r * 0.32, cy - r * 0.2, r * 0.09, r * 0.16, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.beginPath()
      ctx.arc(cx, cy + r * 0.05, r * 0.5, 0.15 * Math.PI, 0.85 * Math.PI)
      ctx.stroke()
      break
    }
    case 3: {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(time * 0.3)
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = `hsl(${(i * 30 + time * 60) % 360},90%,58%)`
        ctx.fillRect(-r * 1.5 + (i * r * 3) / 12, -r * 1.5, (r * 3) / 12 + 1, r * 3)
      }
      ctx.restore()
      break
    }
    default: {
      all('#e8742a')
      ctx.strokeStyle = '#2a160a'
      ctx.lineWidth = 2.5
      const turn = Math.sin(time * 0.7) * r * 0.3
      ctx.beginPath()
      ctx.moveTo(cx - r, cy)
      ctx.lineTo(cx + r, cy)
      ctx.moveTo(cx + turn, cy - r)
      ctx.quadraticCurveTo(cx + turn * 2, cy, cx + turn, cy + r)
      ctx.moveTo(cx - r * 0.7 + turn, cy - r)
      ctx.quadraticCurveTo(cx - r * 0.1 + turn, cy, cx - r * 0.7 + turn, cy + r)
      ctx.moveTo(cx + r * 0.7 + turn, cy - r)
      ctx.quadraticCurveTo(cx + r * 0.1 + turn, cy, cx + r * 0.7 + turn, cy + r)
      ctx.stroke()
    }
  }
}

function caesars(l: L) {
  const { p, time } = l
  p.later(-100, 0, () => {
    p.ground(4.3, 3.6, 7.7, 5.6, '#ece6d6')
    p.ground(4.5, 3.8, 7.5, 5.4, WATER)
    glints(l, 6, 4.6, 1.3, 0.7, 5)
  })
  // a fountain in the middle of the pool
  p.later(6, 4.6, () => {
    const [x, y] = p.at(6, 4.6)
    p.cylinder(x, y, 0.25, 4, '#f3eee3')
    p.cylinder(x, y, 0.06, 10, '#f3eee3', 4)
    const h = 12 + Math.sin(time * 3) * 3
    p.ctx.strokeStyle = l.night > 0.5 ? '#d6f0ff' : 'rgba(255,255,255,0.85)'
    p.ctx.lineWidth = 2
    p.ctx.beginPath()
    p.ctx.moveTo(x, y - 14)
    p.ctx.lineTo(x, y - 14 - h)
    p.ctx.stroke()
  })
  for (let c = 4.5; c < 7.7; c += 0.8) cypress(l, c, 3.35)
  for (let r = 3.9; r < 5.5; r += 0.8) cypress(l, 7.85, r)
  tower(l, 2.4, 1.2, 3.6, 1.0, 110, '#f6f2e8', 61, { cap: '#cdb989' })
  tower(l, 1.0, 3.0, 1.0, 2.6, 92, '#f2ede0', 62, { cap: '#cdb989' })
  tower(l, 5.8, 1.0, 1.6, 0.9, 70, '#f2ede0', 63, { cap: '#cdb989' })

  // a Roman temple: a podium, columns and a gable roof
  p.later(3.0, 4.4, () => {
    const [x, y] = p.at(3.0, 4.4)
    const [cx, cy] = p.at(3.0, 4.0)
    p.shadow(x, y, 2.0, 1.4)
    p.box(x, y, { cols: 2.0, rows: 1.4, height: 5, color: '#ece6d6' })
    p.box(cx, cy, { cols: 1.6, rows: 0.5, height: 26, elevation: 5, color: '#f3eee3' })
    const columns: Point[] = []
    for (let c = 2.15; c <= 3.86; c += 0.34) columns.push(p.at(c, 4.98))
    for (let r = 3.9; r < 4.95; r += 0.34) columns.push(p.at(3.88, r))
    columns
      .sort((a, b) => a[1] - b[1])
      .forEach(([px, py]) => p.cylinder(px, py - 5, 0.05, 26, '#faf7f0'))
    const roof = { cols: 2.0, rows: 1.4, height: 4, elevation: 31, color: '#f3eee3' }
    const [back, right, front, left] = p.box(x, y, roof)
    const ridgeFront: Point = [(left[0] + front[0]) / 2, (left[1] + front[1]) / 2 - 12]
    const ridgeBack: Point = [(back[0] + right[0]) / 2, (back[1] + right[1]) / 2 - 12]
    p.poly([ridgeFront, front, right, ridgeBack], shade(p.c('#e8e0cf'), -0.3))
    p.poly([left, front, ridgeFront], p.c('#f7f3ea'))
  })
  sign(l, 7.6, 2.6, 'CAESARS PALACE', '#ffd36b')
  palm(l, 7.6, 0.4)
  palm(l, 0.3, 5.6)
}

function flamingo(l: L) {
  const { p, time } = l
  p.later(-100, 0, () => p.ground(0.1, 3.6, 2.6, 5.9, '#6db35a'))
  water(l, 1.3, 4.8, 0.7, 0.5)
  for (const [c, r] of [
    [0.6, 4.3],
    [1.9, 4.4],
    [0.7, 5.4],
    [2.1, 5.2],
    [1.5, 5.6],
  ]) {
    p.later(c, r, () => {
      const { ctx } = p
      const [x, y] = p.at(c, r)
      const bob = Math.sin(time * 2 + c * 5) * 1.5
      ctx.strokeStyle = p.c('#d98aa0')
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x, y - 8)
      ctx.stroke()
      ctx.fillStyle = p.c('#ff8fb8')
      ctx.beginPath()
      ctx.ellipse(x, y - 10, 4.5, 2.6, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = p.c('#ff8fb8')
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(x + 3, y - 11)
      ctx.quadraticCurveTo(x + 6, y - 16, x + 3, y - 19 + bob)
      ctx.stroke()
      ctx.fillStyle = p.c('#222222')
      ctx.fillRect(x + 2, y - 19 + bob, 2, 1.5)
    })
  }
  tower(l, 1.7, 1.7, 2.6, 1.2, 88, '#f7a6c4', 71, { cap: '#ff5fa0', glass: '#ffffff' })
  tower(l, 3.3, 0.8, 0.9, 1.2, 70, '#f6b8cf', 72, { glass: '#ffffff' })
  // the famous neon 'feather' pillar
  p.later(3.2, 4.4, () => {
    const { ctx } = p
    const [x, y] = p.at(3.2, 4.4)
    p.shadow(x, y, 0.7, 0.7)
    p.cylinder(x, y, 0.36, 50, '#ff6fa8')
    for (let k = 0; k < 9; k++) {
      const on = (k + Math.floor(time * 6)) % 9 < 5
      ctx.strokeStyle = k % 2 ? '#ff9a3c' : '#ff3d9a'
      ctx.globalAlpha = on ? 0.5 + l.night * 0.5 : 0.25
      ctx.lineWidth = 2
      if (l.night > 0) {
        ctx.shadowColor = ctx.strokeStyle
        ctx.shadowBlur = 6 * l.night
      }
      ctx.beginPath()
      ctx.ellipse(x, y - 6 - k * 5, 16, 8, 0, 0, Math.PI)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    ctx.shadowBlur = 0
    p.text('Flamingo', x, y - 64, 12, '#ff4f9a', true, 'Georgia')
  })
  palm(l, 3.7, 2.8)
  palm(l, 3.7, 5.7)
  palm(l, 0.3, 0.4)
}

function highroller(l: L) {
  const { p, time } = l
  p.later(-100, 0, () => p.ground(0.1, 4.2, 3.9, 5.9, '#c8bfae'))
  p.later(2.0, 2.6, () => {
    const { ctx } = p
    const [x, y] = p.at(2.0, 2.6)
    const hub: Point = [x, y - 88]
    const radius = 74
    ctx.lineCap = 'round'
    ctx.strokeStyle = p.c('#d9d9d9')
    ctx.lineWidth = 5
    for (const [dx, dy] of [
      [-20, -10],
      [22, -12],
      [-36, 4],
      [36, 2],
    ]) {
      ctx.beginPath()
      ctx.moveTo(x + dx, y + dy)
      ctx.lineTo(hub[0], hub[1])
      ctx.stroke()
    }
    // spokes, rim and cabins
    const turn = (time / 120) * Math.PI * 2
    ctx.strokeStyle = p.c('#eeeeee')
    ctx.lineWidth = 0.8
    ctx.globalAlpha = 0.6
    for (let i = 0; i < 28; i++) {
      const a = turn + (i / 28) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(hub[0], hub[1])
      ctx.lineTo(hub[0] + Math.cos(a) * radius, hub[1] + Math.sin(a) * radius)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    const led = l.night > 0 ? `hsl(${(time * 40) % 360},100%,62%)` : p.c('#f5f5f5')
    ctx.strokeStyle = led
    ctx.lineWidth = 3
    if (l.night > 0) {
      ctx.shadowColor = led
      ctx.shadowBlur = 10 * l.night
    }
    ctx.beginPath()
    ctx.arc(hub[0], hub[1], radius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.lineWidth = 1.5
    ctx.strokeStyle = p.c('#e0e0e0')
    ctx.beginPath()
    ctx.arc(hub[0], hub[1], radius * 0.93, 0, Math.PI * 2)
    ctx.stroke()
    for (let i = 0; i < 28; i++) {
      const a = turn + (i / 28) * Math.PI * 2
      ctx.fillStyle = l.night > 0.5 ? '#fff1c1' : p.c('#bfe7ff')
      ctx.beginPath()
      ctx.ellipse(
        hub[0] + Math.cos(a) * radius,
        hub[1] + Math.sin(a) * radius,
        4.5,
        3.5,
        0,
        0,
        Math.PI * 2,
      )
      ctx.fill()
    }
    p.cylinder(hub[0], hub[1] + 3, 0.12, 6, '#9e9e9e')
  })
  // the LINQ promenade
  const shops: Array<[number, number, string, number]> = [
    [0.6, 5.0, '#e57373', 16],
    [1.5, 5.2, '#4db6ac', 18],
    [2.4, 5.0, '#ffb74d', 14],
    [3.3, 5.2, '#9575cd', 17],
  ]
  for (const [c, r, color, height] of shops) {
    p.later(c, r, () => {
      const [x, y] = p.at(c, r)
      p.shadow(x, y, 0.7, 0.7)
      p.box(x, y, { cols: 0.7, rows: 0.7, height, color })
      p.box(x, y, { cols: 0.78, rows: 0.78, height: 2, elevation: height * 0.5, color: '#fafafa' })
    })
  }
  p.later(3.9, 5.9, () => {
    // string lights over the promenade
    if (l.night <= 0) return
    const { ctx } = p
    for (let i = 0; i < 16; i++) {
      const [x, y] = p.at(0.3 + i * 0.22, 4.5 + Math.sin(i * 0.9) * 0.05)
      ctx.fillStyle = `rgba(255,236,170,${l.night})`
      ctx.beginPath()
      ctx.arc(x, y - 22 + Math.sin((i / 15) * Math.PI) * 4, 1.4, 0, Math.PI * 2)
      ctx.fill()
    }
  })
  sign(l, 3.6, 3.6, 'HIGH ROLLER', '#7cf7ff')
  palm(l, 0.3, 0.4)
  palm(l, 3.7, 0.4)
}

function bellagio(l: L) {
  const { p, time } = l
  water(l, 5.2, 4.0, 2.55, 1.8)
  tower(l, 1.6, 1.0, 3.0, 0.9, 125, '#efe5d0', 81, { cap: '#4f8a82' })
  tower(l, 0.7, 2.5, 0.9, 2.0, 115, '#efe5d0', 82, { cap: '#4f8a82' })
  tower(l, 3.9, 0.7, 1.4, 0.8, 105, '#ece1ca', 83, { cap: '#4f8a82' })
  for (const [c, r] of [
    [2.5, 2.2],
    [3.3, 1.8],
    [6.9, 1.8],
    [7.7, 2.6],
    [1.9, 4.5],
    [2.1, 5.4],
  ]) {
    cypress(l, c, r)
  }
  // the fountain show: 14 seconds every 30 seconds, with a finale
  const cycle = time % 30
  const active = cycle < 14
  const envelope = active ? Math.sqrt(Math.sin((cycle / 14) * Math.PI)) : 0
  const finale = cycle > 10.5 && cycle < 14 ? 1.8 : 1
  const jets: Point[] = []
  for (let i = 0; i < 14; i++) {
    const angle = Math.PI * (0.15 + (0.7 * i) / 13)
    jets.push([5.2 + 2.0 * Math.cos(angle), 4.0 + 1.25 * Math.sin(angle)])
  }
  for (let i = 0; i < 8; i++) jets.push([3.6 + i * 0.5, 3.4])
  jets.forEach(([c, r], i) => {
    p.later(c, r, () => {
      const { ctx } = p
      const [x, y] = p.at(c, r)
      const wave = 0.5 + 0.5 * Math.sin(time * 2.6 - i * 0.55)
      const height = active ? envelope * finale * (24 + 30 * wave) : 2
      const top = y - height
      const gradient = ctx.createLinearGradient(0, y, 0, top)
      gradient.addColorStop(0, 'rgba(255,255,255,0.95)')
      gradient.addColorStop(1, 'rgba(255,255,255,0.15)')
      ctx.strokeStyle = gradient
      ctx.lineWidth = 2.5
      if (l.night > 0) {
        ctx.shadowColor = '#e6f6ff'
        ctx.shadowBlur = 6 * l.night
      }
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x, top)
      ctx.stroke()
      if (height > 8) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)'
        for (let k = 0; k < 3; k++) {
          ctx.beginPath()
          ctx.arc(x + (k - 1) * 3, top + 2 + k, 1.4, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    })
  })
  sign(l, 7.7, 1.0, 'BELLAGIO', '#fff4d6')
  palm(l, 0.3, 5.6)
}

function paris(l: L) {
  const { p, time } = l
  tower(l, 1.4, 1.5, 2.4, 1.8, 92, '#efdfbf', 91, { cap: '#6e7f99' })
  tower(l, 3.2, 0.8, 1.2, 1.0, 70, '#ead7b2', 92, { cap: '#6e7f99' })
  // the Arc de Triomphe
  p.later(0.7, 4.6, () => {
    const [x, y] = p.at(0.7, 4.6)
    p.shadow(x, y, 0.6, 0.35)
    const [, , front, left] = p.box(x, y, { cols: 0.6, rows: 0.35, height: 24, color: '#e8dcc2' })
    const a = along(left, front, 0.35)
    const b = along(left, front, 0.65)
    p.poly(
      [
        [a[0], a[1] + 24],
        [a[0], a[1] + 12],
        [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 8],
        [b[0], b[1] + 12],
        [b[0], b[1] + 24],
      ],
      p.c('#6b5a44'),
    )
  })
  // the Eiffel Tower, golden at night
  p.later(2.5, 3.9, () => {
    const { ctx } = p
    const [x, y] = p.at(2.5, 3.9)
    const color = mix(p.c('#8b6b4a'), '#e9a94a', l.night * 0.8)
    const dark = shade(color, -0.3)
    const half = (yb: number, wb: number, yt: number, wt: number) => {
      p.poly(
        [
          [x - wb, yb],
          [x, yb],
          [x, yt],
          [x - wt, yt],
        ],
        color,
      )
      p.poly(
        [
          [x, yb],
          [x + wb, yb],
          [x + wt, yt],
          [x, yt],
        ],
        dark,
      )
    }
    p.shadow(x, y, 0.9, 0.9)
    // the legs with the big arch between them
    ctx.beginPath()
    ctx.moveTo(x - 28, y)
    ctx.lineTo(x - 13, y - 42)
    ctx.lineTo(x + 13, y - 42)
    ctx.lineTo(x + 28, y)
    ctx.lineTo(x + 20, y)
    ctx.quadraticCurveTo(x, y - 46, x - 20, y)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
    ctx.fillStyle = dark
    ctx.fillRect(x - 16, y - 46, 32, 4)
    half(y - 46, 10, y - 94, 4.5)
    ctx.fillRect(x - 7, y - 97, 14, 3)
    half(y - 97, 3.5, y - 150, 0.8)
    ctx.strokeStyle = dark
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, y - 150)
    ctx.lineTo(x, y - 162)
    ctx.stroke()
    if (l.night > 0) {
      // a rotating beacon, and sparkles for the first seconds of every 20
      const angle = time * 1.5
      ctx.strokeStyle = `rgba(255,240,200,${0.45 * l.night})`
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(x, y - 158)
      ctx.lineTo(x + Math.cos(angle) * 80, y - 158 + Math.sin(angle) * 14)
      ctx.stroke()
      if (time % 20 < 5) {
        for (let i = 0; i < 24; i++) {
          if (noise(i, Math.floor(time * 8)) < 0.5) continue
          const t = noise(i, 1)
          const sy = y - t * 150
          const width = 28 - t * 27
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(x + (noise(i, 2) * 2 - 1) * width, sy, 1.6, 1.6)
        }
      }
    }
  })
  // the hot air balloon sign
  p.later(3.4, 3.0, () => {
    const { ctx } = p
    const [x, y] = p.at(3.4, 3.0)
    p.cylinder(x, y, 0.05, 26, '#7a7a7a')
    const cy = y - 46
    const gradient = ctx.createLinearGradient(x - 14, 0, x + 14, 0)
    gradient.addColorStop(0, p.c('#2d63d6'))
    gradient.addColorStop(1, p.c('#16357a'))
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.ellipse(x, cy, 14, 17, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = p.c('#e8c45a')
    ctx.lineWidth = 1.5
    for (const dx of [-7, 0, 7]) {
      ctx.beginPath()
      ctx.ellipse(x, cy, Math.abs(dx) + 0.5, 17, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    p.text('PARIS', x, cy, 7, '#ff3d3d', true)
    if (l.night > 0) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        const on = Math.floor(time * 5 + i) % 2 === 0
        ctx.fillStyle = on ? '#fff59d' : '#8d7a3a'
        ctx.beginPath()
        ctx.arc(x + Math.cos(a) * 14, cy + Math.sin(a) * 17, 1.2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  })
  palm(l, 0.3, 5.7)
  palm(l, 3.7, 5.7)
}

function hollywood(l: L) {
  const { p, time } = l
  tower(l, 2.0, 2.2, 2.2, 2.4, 125, '#30384a', 101, { glass: '#6fb7ff' })
  // a giant LED screen on the front of the tower
  p.later(2.01, 2.21, () => {
    const { ctx } = p
    const [x, y] = p.at(2.0, 2.2)
    const [, , front, left] = p.boxTop(x, y, { cols: 2.2, rows: 2.4, height: 125, color: '' })
    const a = along(left, front, 0.15)
    const b = along(left, front, 0.85)
    const hue = (time * 25) % 360
    const gradient = ctx.createLinearGradient(a[0], a[1], b[0], b[1])
    gradient.addColorStop(0, `hsl(${hue},85%,55%)`)
    gradient.addColorStop(1, `hsl(${(hue + 120) % 360},85%,55%)`)
    ctx.globalAlpha = 0.75 + l.night * 0.25
    p.poly(
      [
        [a[0], a[1] + 30],
        [b[0], b[1] + 30],
        [b[0], b[1] + 92],
        [a[0], a[1] + 92],
      ],
      gradient,
    )
    ctx.globalAlpha = 1
    const [mx, my] = along(a, b, 0.5)
    p.text(Math.floor(time / 4) % 2 ? 'VEGAS' : '★ ★ ★', mx, my + 61, 11, '#ffffff', true)
  })
  p.later(2.0, 5.0, () => {
    const [x, y] = p.at(2.0, 5.0)
    p.shadow(x, y, 3.6, 1.4)
    const [, , front, left] = p.box(x, y, { cols: 3.6, rows: 1.4, height: 18, color: '#3a3550' })
    const hue = (time * 60) % 360
    p.ctx.strokeStyle = `hsl(${hue},100%,60%)`
    p.ctx.lineWidth = 2
    p.ctx.beginPath()
    p.ctx.moveTo(left[0], left[1] + 4)
    p.ctx.lineTo(front[0], front[1] + 4)
    p.ctx.stroke()
  })
  // the globe sign
  p.later(0.4, 3.9, () => {
    const { ctx } = p
    const [x, y] = p.at(0.4, 3.9)
    p.cylinder(x, y, 0.05, 30, '#7a7a7a')
    const cy = y - 42
    const globe = ctx.createRadialGradient(x - 4, cy - 4, 1, x, cy, 11)
    globe.addColorStop(0, '#7fd0ff')
    globe.addColorStop(1, '#0d47a1')
    ctx.fillStyle = globe
    ctx.beginPath()
    ctx.arc(x, cy, 11, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#ffd36b'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.ellipse(x, cy, 17, 4, -0.3, 0, Math.PI * 2)
    ctx.stroke()
    p.text('PH', x, cy, 8, '#ffffff', true)
  })
  palm(l, 0.3, 0.4)
  palm(l, 3.7, 0.4)
}

function nyny(l: L) {
  const { p, time } = l
  const plain: Array<[number, number, number, number, string]> = [
    [0.8, 1.0, 0.8, 72, '#bca58a'],
    [1.7, 1.7, 0.7, 52, '#a98b72'],
    [5.3, 1.0, 0.8, 88, '#9eaab8'],
    [6.3, 0.9, 0.9, 64, '#b98d6d'],
    [3.4, 1.9, 0.6, 46, '#c9b79c'],
  ]
  plain.forEach(([c, r, size, height, color], i) =>
    tower(l, c, r, size, size, height, color, 111 + i, { cap: shade(color, -0.2) }),
  )
  // the Empire State Building
  p.later(2.6, 1.0, () => {
    const [x, y] = p.at(2.6, 1.0)
    p.shadow(x, y, 1.0, 1.0)
    const base = { cols: 1.0, rows: 1.0, height: 62, color: '#cfc4ad' }
    p.box(x, y, base)
    p.windows(x, y, base, 120)
    p.box(x, y, { cols: 0.72, rows: 0.72, height: 28, elevation: 62, color: '#cfc4ad' })
    p.box(x, y, { cols: 0.5, rows: 0.5, height: 22, elevation: 90, color: '#d6ccb6' })
    p.box(x, y, { cols: 0.26, rows: 0.26, height: 12, elevation: 112, color: '#ddd4c0' })
    p.cylinder(x, y, 0.04, 22, '#e0e0e0', 124)
    p.light(x, y - 118, 14, 'rgba(255,210,80,1)', l.night * 0.8)
  })
  // the Chrysler Building
  p.later(4.0, 0.9, () => {
    const { ctx } = p
    const [x, y] = p.at(4.0, 0.9)
    p.shadow(x, y, 0.7, 0.7)
    const body = { cols: 0.7, rows: 0.7, height: 108, color: '#d8d4cc' }
    p.box(x, y, body)
    p.windows(x, y, body, 121)
    ;[0.56, 0.44, 0.32, 0.2].forEach((size, i) => {
      const [, , front, left] = p.box(x, y, {
        cols: size,
        rows: size,
        height: 7,
        elevation: 108 + i * 7,
        color: '#eceff1',
      })
      if (l.night > 0) {
        ctx.strokeStyle = `rgba(255,255,255,${l.night})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(left[0], left[1] + 6)
        ctx.lineTo((left[0] + front[0]) / 2, (left[1] + front[1]) / 2 + 1)
        ctx.lineTo(front[0], front[1] + 6)
        ctx.stroke()
      }
    })
    p.cylinder(x, y, 0.03, 24, '#eceff1', 136)
  })
  // a roller coaster around the front
  p.later(3, 2.6, () => {
    const { ctx } = p
    const track: Point[] = []
    for (let i = 0; i <= 60; i++) {
      const c = 0.3 + (i / 60) * 5.6
      const [x, y] = p.at(c, 2.55 + Math.sin(i * 0.3) * 0.12)
      track.push([x, y - 10 - 16 * Math.pow(Math.sin(i * 0.21), 2)])
    }
    ctx.strokeStyle = p.c('#9e9e9e')
    ctx.lineWidth = 1
    track.forEach(([x, y], i) => {
      if (i % 6) return
      const [gx, gy] = p.at(0.3 + (i / 60) * 5.6, 2.55 + Math.sin(i * 0.3) * 0.12)
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(gx, gy)
      ctx.stroke()
    })
    ctx.strokeStyle = p.c('#d32f2f')
    ctx.lineWidth = 2.5
    ctx.beginPath()
    track.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.stroke()
    const s = (time * 0.18) % 1
    for (let k = 0; k < 4; k++) {
      const index = Math.min(60, Math.floor((s * 60 + k * 1.4) % 61))
      const [x, y] = track[index]
      ctx.fillStyle = p.c(k ? '#1e63c4' : '#fdd835')
      ctx.fillRect(x - 3, y - 5, 6, 4)
    }
  })
  // the Statue of Liberty
  p.later(7.0, 1.8, () => {
    const { ctx } = p
    const [x, y] = p.at(7.0, 1.8)
    p.shadow(x, y, 0.5, 0.5)
    p.box(x, y, { cols: 0.5, rows: 0.5, height: 16, color: '#c7bc9f' })
    p.cone(x, y, 0.14, 24, '#5fa58b', 16, 8)
    ctx.fillStyle = p.c('#6fb59b')
    ctx.beginPath()
    ctx.arc(x, y - 42, 3.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = p.c('#5fa58b')
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x + 2, y - 34)
    ctx.lineTo(x + 5, y - 52)
    ctx.stroke()
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath()
      ctx.moveTo(x + i * 1.2, y - 44)
      ctx.lineTo(x + i * 2.4, y - 47)
      ctx.lineWidth = 1
      ctx.stroke()
    }
    const flicker = 3 + Math.sin(time * 11) * 0.8
    p.light(x + 5, y - 55, 16, 'rgba(255,170,40,1)', 0.25 + l.night * 0.6)
    p.poly(
      [
        [x + 3, y - 53],
        [x + 5, y - 53 - flicker * 1.6],
        [x + 7, y - 53],
      ],
      '#ffb300',
    )
  })
  sign(l, 7.7, 0.5, 'NEW YORK-NEW YORK', '#4fc3ff')
}

function excalibur(l: L) {
  const { p } = l
  tower(l, 1.4, 0.8, 2.4, 0.8, 74, '#f3efe6', 131, { cap: '#c62828' })
  tower(l, 6.4, 0.8, 2.4, 0.8, 74, '#f3efe6', 132, { cap: '#c62828' })
  p.later(3.9, 1.7, () => {
    const [x, y] = p.at(3.9, 1.7)
    p.shadow(x, y, 3.2, 0.7)
    const wall = { cols: 3.2, rows: 0.7, height: 24, color: '#ebe5d9' }
    const [, , front, left] = p.box(x, y, wall)
    // battlements, and the gate
    for (let i = 0; i < 12; i++) {
      const [bx, by] = along(left, front, (i + 0.5) / 12)
      if (i % 2 === 0)
        p.poly(
          [
            [bx - 3, by + 1],
            [bx + 3, by + 4],
            [bx + 3, by - 1],
            [bx - 3, by - 4],
          ],
          p.c('#f3eee3'),
        )
    }
    const [gx, gy] = along(left, front, 0.5)
    p.poly(
      [
        [gx - 6, gy + 21],
        [gx - 6, gy + 12],
        [gx, gy + 6],
        [gx + 6, gy + 15],
        [gx + 6, gy + 27],
      ],
      p.c('#5d4037'),
    )
  })
  const roofs = ['#d32f2f', '#1e5bc6', '#f2b705']
  const turrets: Array<[number, number, number]> = [
    [2.6, 1.2, 50],
    [3.9, 1.1, 54],
    [5.2, 1.2, 50],
    [2.2, 2.1, 38],
    [3.0, 2.35, 34],
    [3.9, 2.45, 40],
    [4.8, 2.35, 34],
    [5.6, 2.1, 38],
  ]
  turrets.forEach(([c, r, height], i) => {
    p.later(c, r, () => {
      const [x, y] = p.at(c, r)
      p.cylinder(x, y, 0.19, height, '#f0ebe1')
      p.cone(x, y, 0.25, 24, roofs[i % 3], height, 10)
      p.ctx.strokeStyle = p.c('#5d4037')
      p.ctx.lineWidth = 1
      p.ctx.beginPath()
      p.ctx.moveTo(x, y - height - 24)
      p.ctx.lineTo(x, y - height - 32)
      p.ctx.stroke()
      const wave = Math.sin(l.time * 4 + i) * 1.5
      p.poly(
        [
          [x, y - height - 32],
          [x + 7, y - height - 30 + wave],
          [x, y - height - 28],
        ],
        p.c(roofs[(i + 1) % 3]),
      )
    })
  })
  sign(l, 7.6, 2.4, 'EXCALIBUR', '#ffcc33')
}

function mgm(l: L) {
  const { p } = l
  p.later(-100, 0, () => p.ground(4.4, 3.6, 7.9, 5.9, '#58a64a'))
  tower(l, 3.2, 1.1, 5.2, 1.0, 112, '#17945e', 141, { cap: '#0f6e45', glass: '#8ff0c0' })
  tower(l, 1.0, 3.1, 1.0, 2.8, 104, '#17945e', 142, { cap: '#0f6e45', glass: '#8ff0c0' })
  tower(l, 6.6, 1.4, 1.2, 1.6, 96, '#17945e', 143, { cap: '#0f6e45', glass: '#8ff0c0' })
  // the arena
  p.later(3.2, 3.4, () => {
    const [x, y] = p.at(3.2, 3.4)
    p.shadow(x, y, 1.8, 1.8)
    p.cylinder(x, y, 0.95, 18, '#2a2f3a')
    p.cylinder(x, y, 0.75, 6, '#3a4150', 18)
    p.ctx.strokeStyle = l.night > 0 ? '#39ff9a' : p.c('#8fd6b0')
    p.ctx.lineWidth = 2
    p.ctx.beginPath()
    p.ctx.ellipse(x, y - 9, 0.95 * 45.25, 0.95 * 22.6, 0, 0, Math.PI)
    p.ctx.stroke()
  })
  // the lion on its pedestal
  p.later(6.3, 4.6, () => {
    const { ctx } = p
    const [x, y] = p.at(6.3, 4.6)
    p.shadow(x, y, 1.0, 1.0)
    p.cylinder(x, y, 0.55, 14, '#d8cdb8')
    p.light(x, y - 34, 40, 'rgba(255,200,90,1)', l.night * 0.35)
    const gold = p.c('#c9a227')
    const base = y - 14
    ctx.fillStyle = shade(gold, -0.2)
    ctx.fillRect(x + 8, base - 9, 4, 9)
    ctx.fillRect(x - 10, base - 9, 4, 9)
    ctx.fillStyle = gold
    ctx.beginPath()
    ctx.ellipse(x + 3, base - 13, 15, 7, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillRect(x - 6, base - 10, 4, 10)
    ctx.fillRect(x + 14, base - 9, 4, 9)
    ctx.fillStyle = shade(gold, -0.25)
    ctx.beginPath()
    ctx.arc(x - 9, base - 20, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = shade(gold, 0.15)
    ctx.beginPath()
    ctx.arc(x - 11, base - 19, 5.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = gold
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x + 17, base - 14)
    ctx.quadraticCurveTo(x + 26, base - 22, x + 22, base - 28)
    ctx.stroke()
  })
  sign(l, 7.6, 3.0, 'MGM GRAND', '#39ff9a')
  palm(l, 4.4, 5.6)
  palm(l, 5.6, 5.7)
  palm(l, 7.7, 5.7)
}

function luxor(l: L) {
  const { p } = l
  p.later(1.6, 1.5, () => {
    const { ctx } = p
    const [x, y] = p.at(1.6, 1.5)
    p.shadow(x, y, 2.8, 2.8)
    const { apex, left, front, right } = p.pyramid(x, y, 2.8, 2.8, 92, '#25262f')
    // glossy glass, and edges that light up at night
    const gloss = ctx.createLinearGradient(left[0], left[1], apex[0], apex[1])
    gloss.addColorStop(0, 'rgba(255,255,255,0)')
    gloss.addColorStop(1, 'rgba(255,255,255,0.12)')
    p.poly([left, front, apex], gloss)
    ctx.strokeStyle = l.night > 0 ? mix(p.c('#c9a54a'), '#ffe08a', l.night) : '#c9a54a'
    ctx.lineWidth = 1.5
    for (const corner of [left, front, right]) {
      ctx.beginPath()
      ctx.moveTo(apex[0], apex[1])
      ctx.lineTo(corner[0], corner[1])
      ctx.stroke()
    }
    if (l.night > 0) {
      // the Sky Beam
      const beam = ctx.createLinearGradient(0, apex[1], 0, apex[1] - 1400)
      beam.addColorStop(0, `rgba(255,255,255,${0.95 * l.night})`)
      beam.addColorStop(1, 'rgba(200,220,255,0)')
      ctx.fillStyle = beam
      ctx.fillRect(apex[0] - 2.5, apex[1] - 1400, 5, 1400)
      ctx.globalAlpha = 0.25 * l.night
      ctx.fillRect(apex[0] - 9, apex[1] - 1400, 18, 1400)
      ctx.globalAlpha = 1
    }
  })
  // the sphinx, looking at the Strip
  p.later(4.6, 1.5, () => {
    const [x, y] = p.at(4.6, 1.5)
    p.shadow(x, y, 1.8, 0.7)
    p.box(x, y, { cols: 0.6, rows: 0.6, height: 14, color: '#d9bf8a' })
  })
  p.later(5.2, 1.5, () => {
    const [x, y] = p.at(5.2, 1.5)
    p.box(x, y, { cols: 1.2, rows: 0.6, height: 10, color: '#d9bf8a' })
  })
  p.later(6.0, 1.5, () => {
    const [x, y] = p.at(6.0, 1.5)
    p.box(x, y, { cols: 0.4, rows: 0.42, height: 14, elevation: 10, color: '#dcc392' })
    p.box(x - 1, y, { cols: 0.44, rows: 0.5, height: 4, elevation: 20, color: '#2c5aa0' })
    p.box(x - 1, y, { cols: 0.44, rows: 0.5, height: 3, elevation: 24, color: '#e8c45a' })
  })
  for (const r of [1.36, 1.64]) {
    p.later(6.45, r, () => {
      const [x, y] = p.at(6.45, r)
      p.box(x, y, { cols: 0.5, rows: 0.12, height: 4, color: '#d9bf8a' })
    })
  }
  // an obelisk
  p.later(7.4, 2.4, () => {
    const [x, y] = p.at(7.4, 2.4)
    p.shadow(x, y, 0.22, 0.22)
    p.box(x, y, { cols: 0.22, rows: 0.22, height: 44, color: '#cdb27c' })
    p.pyramid(x, y, 0.22, 0.22, 8, '#e8c45a', 44)
  })
  sign(l, 7.6, 0.6, 'LUXOR', '#ffd36b')
  palm(l, 3.6, 2.7)
  palm(l, 4.4, 0.4)
  palm(l, 7.0, 0.4)
}

function mandalay(l: L) {
  const { p, time } = l
  p.later(-100, 0, () => {
    p.ground(3.4, 0.1, 7.9, 2.9, '#f1dfb2')
    p.ground(4.3, 0.4, 7.6, 1.9, WATER)
    // waves rolling over the pool
    const { ctx } = p
    ctx.strokeStyle = 'rgba(255,255,255,0.65)'
    ctx.lineWidth = 1.5
    for (let k = 0; k < 4; k++) {
      const c = 4.4 + ((time * 0.25 + k / 4) % 1) * 3.1
      const [ax, ay] = p.at(c, 0.5)
      const [bx, by] = p.at(c, 1.8)
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(bx, by)
      ctx.stroke()
    }
  })
  tower(l, 1.6, 0.8, 2.8, 0.8, 128, '#d1a03a', 151, { cap: '#a87b22', glass: '#ffe6a0' })
  tower(l, 1.0, 2.1, 0.8, 1.6, 112, '#d1a03a', 152, { cap: '#a87b22', glass: '#ffe6a0' })
  for (const [c, r] of [
    [4.4, 2.4],
    [5.4, 2.6],
    [6.4, 2.4],
    [7.4, 2.6],
  ]) {
    p.later(c, r, () => {
      const [x, y] = p.at(c, r)
      p.cylinder(x, y, 0.02, 12, '#eeeeee')
      p.cone(x, y, 0.28, 6, ['#ff7043', '#ffffff'], 12, 8)
    })
  }
  sign(l, 2.3, 2.6, 'MANDALAY BAY', '#ffd36b')
  palm(l, 3.6, 0.4)
  palm(l, 7.8, 0.3)
  palm(l, 3.6, 2.6)
}

export const LANDMARK_DRAWINGS: Record<LandmarkKind, (scene: LandmarkScene) => void> = {
  circus,
  strat,
  wynn,
  mirage,
  venetian,
  sphere,
  caesars,
  flamingo,
  highroller,
  bellagio,
  paris,
  hollywood,
  nyny,
  excalibur,
  mgm,
  luxor,
  mandalay,
}
