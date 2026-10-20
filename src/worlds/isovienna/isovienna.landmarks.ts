/**
 * The landmarks of the 'isovienna' world, drawn from boxes, roofs, domes and spires.
 *
 * Each landmark fills its whole footprint. Its parts are positioned in footprint cells,
 * (0, 0) is the back corner and (cols, rows) the front corner, and drawn back to front.
 */
import {
  along,
  ball,
  building,
  COPPER,
  cornice,
  dome,
  facade,
  flag,
  GOLD,
  hipRoof,
  horseman,
  IMPERIAL_YELLOW,
  IsoPainter,
  isoOffset,
  isoRadii,
  noise,
  roofColor,
  shade,
  spire,
  topiary,
  tree,
  type Point,
} from './isovienna.draw.ts'
import type { LandmarkKind } from './isovienna.map.ts'

export type LandmarkScene = {
  p: IsoPainter
  cols: number
  rows: number
  /** Seconds, for animations */
  time: number
  /** 0 by day, 1 at night */
  night: number
  winter: boolean
}

type L = LandmarkScene

const WATER = '#3d8fb8'
const GRAVEL = '#e7ddc6'
const STONE = '#efe7d6'

/** Queue a part of a landmark at a footprint point; `depth` moves it forward in the drawing order */
function part(l: L, col: number, row: number, draw: (x: number, y: number) => void, depth = 0) {
  l.p.later(col + depth, row, () => {
    const [x, y] = l.p.at(col, row)
    draw(x, y)
  })
}

/** Flat things on the ground, drawn before everything else of the landmark */
function flat(l: L, draw: () => void) {
  l.p.later(-100, 0, draw)
}

const lawnColor = (l: L) => (l.winter ? '#e9eef2' : '#86b65a')

function lawn(l: L, c0: number, r0: number, c1: number, r1: number) {
  flat(l, () => l.p.ground(c0, r0, c1, r1, lawnColor(l)))
}

function pond(l: L, c0: number, r0: number, c1: number, r1: number) {
  flat(l, () => {
    l.p.ground(c0 - 0.08, r0 - 0.08, c1 + 0.08, r1 + 0.08, '#e3dccb')
    l.p.ground(c0, r0, c1, r1, l.winter ? '#a9c6d6' : WATER)
    glints(l, (c0 + c1) / 2, (r0 + r1) / 2, (c1 - c0) * 0.4, (r1 - r0) * 0.4, 5)
  })
}

function glints(l: L, col: number, row: number, a: number, b: number, count: number) {
  if (l.winter) return
  const { ctx } = l.p
  ctx.strokeStyle = l.night > 0.5 ? 'rgba(255,220,160,0.5)' : 'rgba(255,255,255,0.6)'
  ctx.lineWidth = 1.2
  for (let i = 0; i < count; i++) {
    const t = (l.time * 0.15 + noise(i, 3)) % 1
    const [x, y] = l.p.at(col + (noise(i, 1) * 2 - 1) * a, row + (noise(i, 2) * 2 - 1) * b)
    ctx.globalAlpha = Math.sin(t * Math.PI)
    ctx.beginPath()
    ctx.moveTo(x - 4 + t * 4, y)
    ctx.lineTo(x + 1 + t * 4, y)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

function treeAt(l: L, col: number, row: number, size = 1) {
  part(l, col, row, (x, y) =>
    tree(l.p, x, y, size, Math.round(col * 17 + row * 31), l.winter, l.time),
  )
}

/** Warm floodlight on a monument at night */
function floodlight(l: L, col: number, row: number, radius: number, height: number) {
  if (l.night <= 0) return
  part(
    l,
    col,
    row,
    (x, y) => l.p.light(x, y - height, radius, 'rgba(255,196,120,1)', l.night * 0.22),
    -0.01,
  )
}

/** A point of a wall face, `u` along the bottom edge from a to b, `v` pixels up */
const onWall = (a: Point, b: Point, u: number, v: number): Point => {
  const point = along(a, b, u)
  return [point[0], point[1] - v]
}

/** Dark arches along the bottom of a wall face, e.g. an arcade */
function arcade(
  p: IsoPainter,
  a: Point,
  b: Point,
  count: number,
  height: number,
  color = '#4a3f38',
) {
  const { ctx } = p
  for (let i = 0; i < count; i++) {
    const s = along(a, b, (i + 0.2) / count)
    const e = along(a, b, (i + 0.8) / count)
    const lit = p.night > 0
    ctx.fillStyle = lit ? `rgba(255,200,120,${0.4 + p.night * 0.5})` : p.c(color)
    ctx.beginPath()
    ctx.moveTo(s[0], s[1])
    ctx.lineTo(s[0], s[1] - height * 0.65)
    ctx.quadraticCurveTo(
      (s[0] + e[0]) / 2,
      (s[1] + e[1]) / 2 - height * 1.05,
      e[0],
      e[1] - height * 0.65,
    )
    ctx.lineTo(e[0], e[1])
    ctx.closePath()
    ctx.fill()
  }
}

/** A row of columns along a wall, from a to b */
function columns(
  p: IsoPainter,
  a: Point,
  b: Point,
  count: number,
  height: number,
  color = '#faf6ec',
) {
  for (let i = 0; i < count; i++) {
    const [x, y] = along(a, b, (i + 0.5) / count)
    p.cylinder(x, y, 0.035, height, color)
  }
}

/**
 * A temple front: columns along the wall facing the rows (left face) and a triangular gable.
 * Centered on (x, y), `cols` wide.
 */
function templeFront(
  p: IsoPainter,
  x: number,
  y: number,
  cols: number,
  height: number,
  count: number,
  elevation = 0,
) {
  const depth = 0.45
  const floor = { cols, rows: depth, height: 3, elevation, color: '#eae3d3' }
  p.box(x, y, floor)
  const [, , front, left] = p.boxTop(x, y, floor)
  columns(p, left, front, count, height)
  const roof = { cols, rows: depth, height: 4, elevation: elevation + 3 + height, color: '#f3eee3' }
  const [back, right, rfront, rleft] = p.box(x, y, roof)
  // the gable over the front
  const peak: Point = [(rleft[0] + rfront[0]) / 2, (rleft[1] + rfront[1]) / 2 - cols * 9]
  const peakBack: Point = [(back[0] + right[0]) / 2, (back[1] + right[1]) / 2 - cols * 9]
  p.poly([peak, rfront, right, peakBack], shade(p.c('#e6dfcf'), -0.3))
  p.poly([rleft, rfront, peak], p.c('#f6f2e8'))
  // a relief in the gable
  p.poly(
    [
      along(rleft, peak, 0.35),
      along(rfront, peak, 0.35),
      along(along(rleft, rfront, 0.5), peak, 0.12),
    ],
    shade(p.c('#f6f2e8'), -0.12),
  )
}

/** A steep cathedral roof with zigzag rows of glazed tiles on the side facing the viewer */
function tiledRoof(
  l: L,
  x: number,
  y: number,
  cols: number,
  rows: number,
  height: number,
  elevation: number,
) {
  const { p } = l
  hipRoof(p, x, y, cols, rows, height, roofColor('#c9a043', l.winter), elevation)
  if (l.winter) return
  const a = cols / 2
  const b = rows / 2
  const pt = (dc: number, dr: number, h = 0): Point => {
    const [dx, dy] = isoOffset(p.tileSize, dc, dr)
    return [x + dx, y - elevation + dy - h]
  }
  const left = pt(-a, b)
  const front = pt(a, b)
  const r1 = pt(-a + b, 0, height)
  const r2 = pt(a - b, 0, height)
  const at = (u: number, v: number) => along(along(left, front, u), along(r1, r2, u), v)
  const { ctx } = p
  ctx.lineWidth = 1.8
  const stripes: Array<[number, string]> = [
    [0.18, '#2d6a4b'],
    [0.36, '#262626'],
    [0.54, '#2d6a4b'],
    [0.72, '#f3ead2'],
  ]
  for (const [v, color] of stripes) {
    ctx.strokeStyle = p.c(color)
    ctx.beginPath()
    for (let i = 0; i <= 28; i++) {
      const [px, py] = at(0.06 + (i / 28) * 0.88, v + (i % 2 ? 0.06 : -0.06))
      if (i) ctx.lineTo(px, py)
      else ctx.moveTo(px, py)
    }
    ctx.stroke()
  }
}

/** A Gothic tower: stages getting narrower, pinnacles, and a tall spire. Returns the apex. */
function gothicTower(
  l: L,
  x: number,
  y: number,
  size: number,
  stages: number[],
  spireHeight: number,
  color: string,
  seed: number,
): Point {
  const { p } = l
  p.shadow(x, y, size, size)
  let elevation = 0
  let width = size
  stages.forEach((height, i) => {
    const box = { cols: width, rows: width, height, elevation, color }
    p.box(x, y, box)
    facade(p, x, y, box, seed + i, {
      floors: Math.max(1, Math.round(height / 22)),
      perCell: 2.4,
      arched: true,
      tall: 0.6,
      glass: '#5a5060',
    })
    // pinnacles on the corners of the stage
    const [back, right, front, left] = p.boxTop(x, y, box)
    for (const corner of [back, left, right, front]) {
      p.pyramid(corner[0], corner[1] + 2, 0.08, 0.08, 9, color, 0)
    }
    elevation += height
    width *= 0.82
  })
  return spire(p, x, y, width, spireHeight, shade(color, -0.05), elevation)
}

// —— the landmarks ——

function stephansdom(l: L) {
  const { p } = l
  const stone = '#d6c6a6'
  floodlight(l, 3, 2, 130, 60)
  // the unfinished north tower with its Renaissance cap
  part(l, 3.2, 0.55, (x, y) => {
    const box = { cols: 0.85, rows: 0.85, height: 62, color: stone }
    p.box(x, y, box)
    facade(p, x, y, box, 311, { floors: 2, perCell: 2, arched: true, glass: '#5a5060' })
    p.cylinder(x, y, 0.3, 6, stone, 62)
    dome(p, x, y, 0.32, 13, COPPER, 68)
  })
  // the west front with the two Heathen Towers
  part(l, 0.55, 2.0, (x, y) => {
    for (const r of [-0.5, 0.5]) {
      const [tx, ty] = isoOffset(p.tileSize, 0, r)
      p.box(x + tx, y + ty, { cols: 0.3, rows: 0.3, height: 54, color: stone })
      spire(p, x + tx, y + ty, 0.3, 18, shade(stone, -0.08), 54)
    }
    const front = { cols: 0.4, rows: 0.8, height: 40, color: stone }
    p.box(x, y, front)
  })
  // the nave with its famous tiled roof
  part(l, 2.85, 2.0, (x, y) => {
    const nave = { cols: 4.3, rows: 1.5, height: 36, color: stone }
    p.shadow(x, y, nave.cols, nave.rows)
    p.box(x, y, nave)
    facade(p, x, y, nave, 301, {
      floors: 1,
      perCell: 1.4,
      tall: 0.75,
      arched: true,
      glass: '#4d4066',
    })
    // buttresses
    const [, , front, left] = p.boxTop(x, y, nave)
    for (let i = 1; i < 6; i++) {
      const [bx, by] = along(left, front, i / 6)
      p.box(bx, by + nave.height, {
        cols: 0.1,
        rows: 0.12,
        height: nave.height + 4,
        color: shade(stone, -0.05),
      })
      p.pyramid(bx, by + nave.height, 0.1, 0.12, 8, stone, nave.height + 4)
    }
    tiledRoof(l, x, y, 4.4, 1.6, 62, 36)
  })
  // the choir
  part(l, 5.35, 2.0, (x, y) => {
    const choir = { cols: 0.7, rows: 1.3, height: 32, color: stone }
    p.box(x, y, choir)
    facade(p, x, y, choir, 302, {
      floors: 1,
      perCell: 1.6,
      tall: 0.75,
      arched: true,
      glass: '#4d4066',
    })
    hipRoof(p, x, y, 0.74, 1.34, 34, roofColor('#c9a043', l.winter), 32)
  })
  // the south tower, 136 m: the "Steffl"
  part(l, 3.3, 3.25, (x, y) => gothicTower(l, x, y, 0.95, [46, 34, 26], 78, '#cdbb98', 321))
}

function hofburg(l: L) {
  const { p, time } = l
  lawn(l, 0.3, 2.2, 3.6, 4.8)
  flat(l, () => {
    p.ground(1.7, 2.2, 2.1, 4.8, GRAVEL)
    p.ground(0.3, 3.3, 3.6, 3.6, GRAVEL)
  })
  floodlight(l, 3, 2, 120, 30)
  // the old palace along the back
  part(l, 2.7, 0.9, (x, y) => {
    building(p, x, y, 5.0, 1.2, 30, '#efe6d3', roofColor('#5f8f7c', l.winter), 401, {
      roofHeight: 14,
      facade: { floors: 3, perCell: 2.6, arched: true },
    })
  })
  // the dome over St. Michael's gate
  part(l, 0.75, 1.1, (x, y) => {
    building(p, x, y, 1.1, 1.1, 34, '#f1e9d8', roofColor('#5f8f7c', l.winter), 402, {
      roofHeight: 0,
      facade: { floors: 3, perCell: 2, arched: true },
    })
    p.cylinder(x, y, 0.42, 12, '#f1e9d8', 34)
    dome(p, x, y, 0.46, 30, roofColor(COPPER, l.winter), 46)
  })
  // the Neue Burg: a curved wing around the Heldenplatz, with a colonnade
  const segments = 7
  for (let i = 0; i < segments; i++) {
    const angle = (i / (segments - 1)) * (Math.PI / 2.2)
    const col = 1.9 + Math.cos(angle) * 3.3
    const row = 1.9 + Math.sin(angle) * 2.6
    const middle = i === 3
    part(l, col, row, (x, y) => {
      const height = middle ? 38 : 30
      building(p, x, y, 0.8, 0.8, height, '#ece2cd', roofColor('#5f8f7c', l.winter), 410 + i, {
        roofHeight: middle ? 14 : 8,
        facade: { floors: 3, perCell: 2.4, arched: true },
      })
      // columns on the side facing the square
      const [, , front, left] = p.boxTop(x, y, { cols: 0.86, rows: 0.86, height: 0, color: '' })
      columns(p, [left[0] - 2, left[1] + 2], [front[0] - 2, front[1] + 2], 4, height * 0.6)
    })
  }
  part(l, 3.0, 0.9, (x, y) => flag(p, x, y - 44, 18, ['#ed2939', '#ffffff', '#ed2939'], time), 0.01)
  // Prince Eugene and Archduke Charles on horseback
  part(l, 1.1, 2.8, (x, y) => horseman(p, x, y, 1.2))
  part(l, 2.5, 4.2, (x, y) => horseman(p, x, y, 1.2))
  treeAt(l, 0.5, 4.6)
  treeAt(l, 1.2, 4.6)
}

function staatsoper(l: L) {
  const { p } = l
  floodlight(l, 2, 1.8, 90, 30)
  part(l, 2.0, 1.2, (x, y) => {
    building(p, x, y, 3.4, 1.9, 28, '#e8dbbf', roofColor('#5f8f7a', l.winter), 501, {
      roofHeight: 18,
      facade: { floors: 2, perCell: 2.2, arched: true, tall: 0.6 },
    })
  })
  // the stage tower above the roof
  part(
    l,
    1.3,
    1.2,
    (x, y) => {
      building(p, x, y, 0.9, 1.4, 24, '#e2d3b4', roofColor('#5f8f7a', l.winter), 502, {
        elevation: 28,
        roofHeight: 14,
        facade: { floors: 1, perCell: 1.5, arched: true },
      })
    },
    0.5,
  )
  // the loggia facing the Ring, with statues on its roof
  part(l, 2.0, 2.45, (x, y) => {
    const loggia = { cols: 2.4, rows: 0.5, height: 22, color: '#efe4cc' }
    p.box(x, y, loggia)
    const [, , front, left] = p.boxTop(x, y, loggia)
    arcade(p, [left[0], left[1] + 22], [front[0], front[1] + 22], 5, 13)
    arcade(p, [left[0], left[1] + 9], [front[0], front[1] + 9], 5, 6, '#6a5a4d')
    cornice(p, x, y, loggia, 20)
    for (let i = 0; i < 5; i++) {
      const [sx, sy] = along(left, front, (i + 0.5) / 5)
      p.ctx.fillStyle = p.c('#4f6f60')
      p.ctx.fillRect(sx - 1, sy - 7, 2, 6)
      ball(p, sx, sy - 8, 1.3, '#4f6f60')
    }
  })
  // a banner for tonight's opera
  part(l, 3.6, 2.6, (x, y) => {
    const { ctx } = p
    ctx.fillStyle = p.c('#9b1b30')
    ctx.fillRect(x - 3, y - 30, 6, 22)
    p.text('♪', x, y - 19, 7, '#ffe9a8', true)
  })
}

function burgtheater(l: L) {
  const { p } = l
  floodlight(l, 1.5, 1.8, 70, 30)
  part(l, 1.5, 1.0, (x, y) => {
    building(p, x, y, 2.4, 1.1, 26, '#efe3cb', roofColor('#5f8f7a', l.winter), 601, {
      roofHeight: 16,
      facade: { floors: 2, perCell: 2.2, arched: true },
    })
  })
  // the staircase wings
  for (const col of [0.45, 2.55]) {
    part(l, col, 1.6, (x, y) => {
      building(p, x, y, 0.8, 1.0, 30, '#ebdfc6', roofColor('#5f8f7a', l.winter), 602 + col, {
        roofHeight: 16,
        facade: { floors: 2, perCell: 2, arched: true },
      })
    })
  }
  // the curved middle with the auditorium
  part(l, 1.5, 1.95, (x, y) => {
    p.shadow(x, y, 1.4, 1.4)
    p.cylinder(x, y, 0.7, 24, '#efe3cb')
    const [rx, ry] = isoRadii(p.tileSize, 0.7)
    const { ctx } = p
    for (let i = 0; i < 7; i++) {
      const angle = Math.PI * (0.12 + (i / 6) * 0.76)
      const wx = x + Math.cos(angle) * rx * 0.98
      const wy = y + Math.sin(angle) * ry * 0.98
      ctx.fillStyle = p.night > 0 ? `rgba(255,205,130,${0.5 + p.night * 0.5})` : p.c('#5a5048')
      ctx.fillRect(wx - 1.5, wy - 18, 3, 8)
      ctx.fillRect(wx - 1.5, wy - 7, 3, 5)
    }
    dome(p, x, y, 0.72, 12, roofColor('#5f8f7a', l.winter), 24, false)
    // Apollo with the muses on top
    ball(p, x, y - 40, 2.2)
    p.ctx.fillStyle = p.c(GOLD)
    p.ctx.fillRect(x - 1, y - 39, 2, 4)
  })
}

function rathaus(l: L) {
  const { p, winter, night, time } = l
  if (winter) flat(l, () => p.ground(0.2, 2.6, 3.8, 3.9, '#e2ddd3'))
  else lawn(l, 0.2, 2.65, 3.8, 3.9)
  floodlight(l, 2, 1.6, 100, 50)
  // corner towers
  for (const [c, r] of [
    [0.35, 0.55],
    [3.65, 0.55],
  ]) {
    part(l, c, r, (x, y) => {
      p.box(x, y, { cols: 0.36, rows: 0.36, height: 46, color: '#d5cdbd' })
      spire(p, x, y, 0.38, 22, roofColor('#59636e', winter), 46)
    })
  }
  part(l, 2.0, 1.25, (x, y) => {
    building(p, x, y, 3.6, 1.5, 32, '#d8d0c0', roofColor('#59636e', winter), 701, {
      roofHeight: 24,
      facade: { floors: 3, perCell: 2.6, arched: true, glass: '#47506a' },
    })
  })
  for (const [c, r] of [
    [0.35, 1.95],
    [3.65, 1.95],
  ]) {
    part(l, c, r, (x, y) => {
      p.box(x, y, { cols: 0.36, rows: 0.36, height: 46, color: '#d5cdbd' })
      spire(p, x, y, 0.38, 22, roofColor('#59636e', winter), 46)
    })
  }
  // the main tower with the Rathausmann on top
  part(l, 2.0, 2.15, (x, y) => {
    const apex = gothicTower(l, x, y, 0.62, [44, 26, 18], 40, '#d3cab8', 711)
    const { ctx } = p
    ctx.fillStyle = p.c('#2f2f33')
    ctx.fillRect(apex[0] - 1, apex[1] - 8, 2.2, 7)
    ctx.beginPath()
    ctx.arc(apex[0], apex[1] - 9, 1.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = p.c('#2f2f33')
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(apex[0] + 2, apex[1] - 2)
    ctx.lineTo(apex[0] + 2, apex[1] - 16)
    ctx.stroke()
    p.poly(
      [
        [apex[0] + 2, apex[1] - 16],
        [apex[0] + 7, apex[1] - 15 + Math.sin(time * 4)],
        [apex[0] + 2, apex[1] - 13],
      ],
      p.c('#ed2939'),
    )
  })
  if (winter) {
    // the Christmas market: wooden huts and a big tree with lights
    for (let i = 0; i < 6; i++) {
      const c = 0.5 + i * 0.6
      for (const r of [2.85, 3.6]) {
        if (r > 3 && (i === 2 || i === 3)) continue
        part(l, c, r, (x, y) => {
          p.box(x, y, { cols: 0.4, rows: 0.3, height: 8, color: '#8a5a3a' })
          hipRoof(p, x, y, 0.46, 0.36, 6, '#f4f6f8', 8)
          if (night > 0) p.light(x, y - 4, 10, 'rgba(255,190,110,1)', night * 0.6)
        })
      }
    }
    part(l, 2.0, 3.55, (x, y) => {
      p.cone(x, y, 0.32, 44, '#2e5d34', 4, 10)
      const { ctx } = p
      for (let i = 0; i < 18; i++) {
        const t = noise(i, 9)
        const h = 6 + t * 36
        const w = (1 - (h - 4) / 44) * 18
        const on = night > 0 || Math.floor(time * 2 + i) % 3 === 0
        ctx.fillStyle = on ? ['#ffe08a', '#ff6b6b', '#ffffff'][i % 3] : p.c('#a08850')
        ctx.beginPath()
        ctx.arc(x + (noise(i, 4) - 0.5) * w, y - h, 1.2, 0, Math.PI * 2)
        ctx.fill()
      }
      p.text('★', x, y - 50, 9, '#ffd54f', true)
    })
  } else {
    treeAt(l, 0.5, 3.1)
    treeAt(l, 0.6, 3.7)
    treeAt(l, 3.4, 3.1)
    treeAt(l, 3.5, 3.7)
    // a fountain in front
    part(l, 2.0, 3.3, (x, y) => {
      p.disc(x, y, 0.3, '#e3dccb')
      p.disc(x, y, 0.24, WATER)
      p.ctx.strokeStyle = 'rgba(255,255,255,0.8)'
      p.ctx.lineWidth = 1.5
      p.ctx.beginPath()
      p.ctx.moveTo(x, y)
      p.ctx.lineTo(x, y - 9 - Math.sin(time * 3) * 2)
      p.ctx.stroke()
    })
  }
}

function parlament(l: L) {
  const { p, time } = l
  floodlight(l, 2, 1.6, 90, 30)
  part(l, 2.0, 1.15, (x, y) => {
    const podium = { cols: 3.7, rows: 1.9, height: 8, color: '#e8e2d2' }
    p.shadow(x, y, podium.cols, podium.rows)
    p.box(x, y, podium)
    building(p, x, y, 3.4, 1.6, 24, '#f1ecdf', '#e4ded0', 801, {
      elevation: 8,
      roofHeight: 0,
      facade: { floors: 2, perCell: 2.4, tall: 0.55 },
    })
    // the bronze chariots on the corners of the roof
    const [back, right, front, left] = p.boxTop(x, y, {
      cols: 3.2,
      rows: 1.4,
      height: 32,
      color: '',
    })
    for (const [cx, cy] of [back, right, left, front]) {
      p.ctx.fillStyle = p.c('#4f7a68')
      p.ctx.beginPath()
      p.ctx.ellipse(cx, cy - 3, 4, 2.5, 0, 0, Math.PI * 2)
      p.ctx.fill()
      p.ctx.fillRect(cx - 1, cy - 9, 2, 6)
    }
  })
  // the temple front
  part(l, 2.0, 2.15, (x, y) => templeFront(p, x, y - 8, 1.5, 22, 6, 0))
  // Pallas Athene with her golden helmet
  part(l, 2.0, 2.72, (x, y) => {
    p.disc(x, y, 0.32, '#e3dccb')
    p.disc(x, y, 0.27, l.winter ? '#a9c6d6' : WATER)
    p.box(x, y, { cols: 0.14, rows: 0.14, height: 16, color: '#efe9db' })
    const { ctx } = p
    ctx.fillStyle = p.c('#4f7a68')
    ctx.fillRect(x - 2, y - 27, 4, 11)
    ball(p, x, y - 29, 2.2)
    ctx.strokeStyle = p.c(GOLD)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x + 3, y - 16)
    ctx.lineTo(x + 3, y - 34)
    ctx.stroke()
  })
  part(l, 3.6, 2.6, (x, y) => flag(p, x, y, 26, ['#ed2939', '#ffffff', '#ed2939'], time))
  part(l, 0.4, 2.6, (x, y) => flag(p, x, y, 26, ['#003399', '#003399', '#ffcc00'], time + 1))
}

function votivkirche(l: L) {
  const { p } = l
  lawn(l, 0.1, 0.1, 3.9, 3.9)
  floodlight(l, 2.5, 2, 90, 60)
  treeAt(l, 0.5, 0.6)
  treeAt(l, 1.5, 0.4)
  part(l, 1.55, 2.0, (x, y) => {
    building(p, x, y, 2.4, 1.1, 30, '#e9e4d8', roofColor('#8b6f5c', l.winter), 901, {
      roofHeight: 28,
      facade: { floors: 1, perCell: 1.5, tall: 0.75, arched: true, glass: '#47507a' },
    })
  })
  // the transept with a small spire on the crossing
  part(
    l,
    1.35,
    2.0,
    (x, y) => {
      building(p, x, y, 0.7, 2.0, 30, '#e9e4d8', roofColor('#8b6f5c', l.winter), 902, {
        roofHeight: 26,
        facade: { floors: 1, perCell: 1.2, tall: 0.75, arched: true, glass: '#47507a' },
      })
      spire(p, x, y, 0.2, 30, '#c6bfae', 52)
    },
    0.05,
  )
  // the twin spires on the west front
  part(l, 3.1, 1.45, (x, y) => gothicTower(l, x, y, 0.55, [40, 22, 14], 62, '#e3ddcf', 911))
  part(l, 3.1, 2.0, (x, y) => {
    const front = { cols: 0.42, rows: 0.6, height: 46, color: '#e6e0d2' }
    p.box(x, y, front)
    const [, right, ffront] = p.boxTop(x, y, front)
    // the rose window
    const [cx, cy] = along(ffront, right, 0.5)
    p.ctx.fillStyle = p.night > 0 ? `rgba(255,200,130,${0.4 + p.night * 0.5})` : p.c('#4b5a8a')
    p.ctx.beginPath()
    p.ctx.ellipse(cx, cy + 14, 4, 5, 0, 0, Math.PI * 2)
    p.ctx.fill()
    p.pyramid(x, y, 0.42, 0.6, 14, '#e6e0d2', 46)
  })
  part(l, 3.1, 2.55, (x, y) => gothicTower(l, x, y, 0.55, [40, 22, 14], 62, '#e3ddcf', 912))
  treeAt(l, 0.6, 3.5)
  treeAt(l, 2.0, 3.6)
  treeAt(l, 3.5, 3.5)
}

function museum(l: L, x: number, y: number, seed: number) {
  const { p } = l
  const roof = roofColor('#7d8985', l.winter)
  building(p, x, y, 5.2, 1.1, 28, '#e7dcc3', roof, seed, {
    roofHeight: 12,
    facade: { floors: 3, perCell: 2.2, arched: true },
  })
  // pavilions at the ends and in the middle
  for (const dc of [-2.3, 2.3]) {
    const [dx, dy] = isoOffset(p.tileSize, dc, 0)
    building(p, x + dx, y + dy, 0.7, 1.2, 32, '#e3d7bd', roof, seed + dc, {
      roofHeight: 12,
      facade: { floors: 3, perCell: 2, arched: true },
    })
  }
  p.cylinder(x, y, 0.4, 14, '#e7dcc3', 34)
  const top = dome(p, x, y, 0.44, 30, roofColor(COPPER, l.winter), 48)
  ball(p, top[0], top[1] - 2, 1.8)
}

function museums(l: L) {
  const { p } = l
  lawn(l, 0.3, 1.6, 5.7, 3.4)
  flat(l, () => {
    p.ground(2.8, 1.6, 3.2, 3.4, GRAVEL)
    p.ground(0.3, 2.35, 5.7, 2.65, GRAVEL)
    for (const [c, r] of [
      [0.7, 1.85],
      [3.5, 1.85],
      [0.7, 2.85],
      [3.5, 2.85],
    ]) {
      p.ground(c, r, c + 1.8, r + 0.3, l.winter ? '#cfd8d2' : '#4f8a46')
    }
  })
  floodlight(l, 3, 2.5, 150, 30)
  // the Natural History Museum at the back, the Art History Museum in front
  part(l, 3.0, 0.75, (x, y) => museum(l, x, y, 1001))
  for (const c of [0.8, 2.2, 3.8, 5.2]) {
    part(l, c, 1.75, (x, y) => topiary(p, x, y, 14, l.winter))
    part(l, c, 3.25, (x, y) => topiary(p, x, y, 14, l.winter))
  }
  // Empress Maria Theresa on her throne
  part(l, 3.0, 2.5, (x, y) => {
    p.box(x, y, { cols: 0.7, rows: 0.7, height: 4, color: '#ddd5c4' })
    p.box(x, y, { cols: 0.42, rows: 0.42, height: 18, elevation: 4, color: '#e9e2d2' })
    const { ctx } = p
    ctx.fillStyle = p.c('#4f7a68')
    ctx.beginPath()
    ctx.ellipse(x, y - 28, 5, 6, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x, y - 36, 2.2, 0, Math.PI * 2)
    ctx.fill()
    for (const dc of [-0.28, 0.28]) {
      const [dx, dy] = isoOffset(p.tileSize, dc, 0.28)
      horseman(p, x + dx, y + dy - 4, 0.55)
    }
  })
  part(l, 3.0, 4.25, (x, y) => museum(l, x, y, 1002))
}

function karlskirche(l: L) {
  const { p, time } = l
  pond(l, 0.4, 3.15, 3.6, 3.85)
  floodlight(l, 1.8, 1.8, 110, 70)
  part(l, 1.8, 0.85, (x, y) => {
    building(p, x, y, 1.8, 1.2, 30, STONE, roofColor(COPPER, l.winter), 1101, {
      roofHeight: 12,
      facade: { floors: 2, perCell: 2, arched: true },
    })
  })
  // the drum and the great dome
  part(l, 1.8, 1.55, (x, y) => {
    p.cylinder(x, y, 0.72, 50, STONE)
    const [rx, ry] = isoRadii(p.tileSize, 0.72)
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI * (0.15 + (i / 5) * 0.7)
      p.ctx.fillStyle = p.night > 0 ? `rgba(255,205,130,${0.4 + p.night * 0.5})` : p.c('#5a5560')
      p.ctx.fillRect(x + Math.cos(angle) * rx - 1.5, y + Math.sin(angle) * ry - 44, 3, 10)
    }
    const top = dome(p, x, y, 0.76, 46, roofColor(COPPER, l.winter), 50)
    ball(p, top[0], top[1] - 2, 1.8)
  })
  // the wings with their bell pavilions
  part(l, 1.8, 2.3, (x, y) => {
    building(p, x, y, 3.4, 0.55, 24, STONE, STONE, 1102, {
      roofHeight: 0,
      facade: { floors: 2, perCell: 2, arched: true },
    })
    for (const dc of [-1.5, 1.5]) {
      const [dx, dy] = isoOffset(p.tileSize, dc, 0)
      building(p, x + dx, y + dy, 0.5, 0.6, 38, STONE, roofColor(COPPER, l.winter), 1103 + dc, {
        roofHeight: 0,
        facade: { floors: 3, perCell: 2, arched: true },
      })
      dome(p, x + dx, y + dy, 0.28, 12, roofColor(COPPER, l.winter), 38)
    }
  })
  // the portico
  part(l, 1.8, 2.75, (x, y) => templeFront(p, x, y, 1.3, 22, 6), 0.01)
  // the two triumphal columns with their spiral reliefs
  for (const c of [0.65, 2.95]) {
    part(
      l,
      c,
      2.8,
      (x, y) => {
        p.box(x, y, { cols: 0.38, rows: 0.38, height: 8, color: STONE })
        p.cylinder(x, y, 0.14, 70, '#ebe3d1', 8)
        const { ctx } = p
        const [rx] = isoRadii(p.tileSize, 0.14)
        ctx.strokeStyle = p.c('#b9ad95')
        ctx.lineWidth = 1
        for (let i = 0; i < 9; i++) {
          const bottom = y - 12 - i * 7.5
          ctx.beginPath()
          ctx.moveTo(x - rx, bottom)
          ctx.lineTo(x + rx, bottom - 6)
          ctx.stroke()
        }
        p.box(x, y, { cols: 0.32, rows: 0.32, height: 4, elevation: 78, color: STONE })
        dome(p, x, y, 0.13, 8, GOLD, 82, false)
        ball(p, x, y - 92, 2)
      },
      0.6,
    )
  }
  // Henry Moore's bronze in the pond
  part(l, 2.8, 3.5, (x, y) => {
    const { ctx } = p
    ctx.fillStyle = p.c('#3c3a33')
    ctx.beginPath()
    ctx.ellipse(x, y - 5, 6, 5, 0.3 + Math.sin(time * 0.1) * 0.01, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x + 5, y - 9, 3, 6, -0.4, 0, Math.PI * 2)
    ctx.fill()
  })
}

function secession(l: L) {
  const { p } = l
  floodlight(l, 1, 1, 50, 30)
  part(l, 1.0, 1.0, (x, y) => {
    const hall = { cols: 1.3, rows: 1.3, height: 22, color: '#f6f4ec' }
    p.shadow(x, y, hall.cols, hall.rows)
    // pylons at the back
    const [back, right, front, left] = p.boxTop(x, y, {
      cols: 0.95,
      rows: 0.95,
      height: 0,
      color: '',
    })
    for (const [px, py] of [back, right, left])
      p.box(px, py, { cols: 0.24, rows: 0.24, height: 32, color: '#f6f4ec' })
    p.box(x, y, hall)
    // a golden band under the roof
    cornice(p, x, y, hall, 18, '#d9b044')
    p.box(front[0], front[1], { cols: 0.24, rows: 0.24, height: 32, color: '#f6f4ec' })
    // the dome of 3,000 gilded laurel leaves
    const cx = x
    const cy = y - 46
    const { ctx } = p
    const glow = ctx.createRadialGradient(cx - 5, cy - 5, 2, cx, cy, 15)
    glow.addColorStop(0, p.c('#ffe48a'))
    glow.addColorStop(1, p.c('#b8862a'))
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(cx, cy, 14, 0, Math.PI * 2)
    ctx.fill()
    for (let i = 0; i < 70; i++) {
      const angle = noise(i, 1) * Math.PI * 2
      const r = Math.sqrt(noise(i, 2)) * 13
      ctx.fillStyle = noise(i, 3) > 0.5 ? p.c('#fff0a8') : p.c('#9a6f1c')
      ctx.fillRect(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, 1.6, 1.2)
    }
    if (l.night > 0) p.light(cx, cy, 26, 'rgba(255,210,100,1)', l.night * 0.5)
    // the entrance
    const [ex, ey] = along(left, front, 0.5)
    ctx.fillStyle = p.c('#3d3a33')
    ctx.fillRect(ex - 3, ey - 9, 6, 9)
  })
}

const AWNINGS = [
  ['#c62828', '#fafafa'],
  ['#2e7d32', '#fafafa'],
  ['#f9a825', '#fafafa'],
  ['#1565c0', '#fafafa'],
]

function naschmarkt(l: L) {
  const { p, night } = l
  flat(l, () => p.ground(0.1, 0.9, 4.9, 1.1, GRAVEL))
  for (const row of [0.5, 1.5]) {
    for (let i = 0; i < 6; i++) {
      const col = 0.45 + i * 0.82
      part(l, col, row, (x, y) => {
        const stall = { cols: 0.68, rows: 0.55, height: 11, color: '#d9e3cf' }
        p.shadow(x, y, stall.cols, stall.rows)
        p.box(x, y, stall)
        hipRoof(p, x, y, 0.74, 0.62, 7, roofColor('#6f9a84', l.winter), 11)
        // a striped awning over the front, and crates of fruit
        const [, , front, left] = p.boxTop(x, y, stall)
        const colors = AWNINGS[(i + Math.round(row)) % AWNINGS.length]
        for (let s = 0; s < 6; s++) {
          const a = along(left, front, s / 6)
          const b = along(left, front, (s + 1) / 6)
          p.poly([a, b, [b[0] - 2, b[1] + 6], [a[0] - 2, a[1] + 6]], p.c(colors[s % 2]))
        }
        const fruit = ['#e53935', '#fb8c00', '#fdd835', '#7cb342', '#8e24aa']
        for (let f = 0; f < 5; f++) {
          const [fx, fy] = along(left, front, (f + 0.5) / 5)
          p.ctx.fillStyle = p.c(fruit[(f + i) % fruit.length])
          p.ctx.fillRect(fx - 2, fy + 8, 4, 2.5)
        }
        if (night > 0) p.light(x, y - 6, 16, 'rgba(255,200,120,1)', night * 0.45)
      })
    }
  }
}

function belvedere(l: L) {
  const { p } = l
  lawn(l, 0.3, 1.9, 7.7, 4.85)
  flat(l, () => {
    p.ground(3.65, 1.9, 4.35, 4.85, GRAVEL)
    p.ground(0.3, 3.55, 7.7, 3.8, GRAVEL)
  })
  pond(l, 1.2, 2.25, 6.8, 3.15)
  floodlight(l, 4, 1.4, 160, 30)
  const roof = roofColor('#5f9a82', l.winter)
  part(l, 0.6, 1.0, (x, y) => {
    building(p, x, y, 0.95, 1.2, 30, '#f3eee3', roof, 1201, {
      roofHeight: 0,
      facade: { floors: 2, perCell: 2, arched: true },
    })
    dome(p, x, y, 0.38, 18, roof, 30)
  })
  part(l, 4.0, 1.0, (x, y) => {
    building(p, x, y, 6.0, 1.1, 24, '#f3eee3', roof, 1202, {
      roofHeight: 12,
      facade: { floors: 2, perCell: 2.4, arched: true },
    })
  })
  // the central pavilion with its curved roof
  part(
    l,
    4.0,
    1.15,
    (x, y) => {
      building(p, x, y, 1.5, 1.4, 32, '#f6f1e6', roof, 1203, {
        roofHeight: 0,
        facade: { floors: 3, perCell: 2, arched: true },
      })
      dome(p, x, y, 0.6, 16, roof, 32, false)
      const [, , front, left] = p.boxTop(x, y, { cols: 1.5, rows: 1.4, height: 32, color: '' })
      arcade(p, [left[0], left[1] + 32], [front[0], front[1] + 32], 3, 10)
    },
    0.02,
  )
  part(l, 7.4, 1.0, (x, y) => {
    building(p, x, y, 0.95, 1.2, 30, '#f3eee3', roof, 1204, {
      roofHeight: 0,
      facade: { floors: 2, perCell: 2, arched: true },
    })
    dome(p, x, y, 0.38, 18, roof, 30)
  })
  for (const c of [0.8, 1.8, 2.8, 5.2, 6.2, 7.2]) {
    part(l, c, 3.45, (x, y) => topiary(p, x, y, 13, l.winter))
    part(l, c, 4.6, (x, y) => topiary(p, x, y, 13, l.winter))
  }
  // sphinxes along the path
  for (const r of [4.1, 4.6]) {
    for (const c of [3.55, 4.45]) {
      part(l, c, r, (x, y) => {
        p.box(x, y, { cols: 0.14, rows: 0.24, height: 4, color: '#ddd4c2' })
        p.ctx.fillStyle = p.c('#cfc4ad')
        p.ctx.beginPath()
        p.ctx.ellipse(x, y - 7, 4, 2.5, 0.4, 0, Math.PI * 2)
        p.ctx.fill()
        p.ctx.beginPath()
        p.ctx.arc(x - 3, y - 10, 1.8, 0, Math.PI * 2)
        p.ctx.fill()
      })
    }
  }
}

function schoenbrunn(l: L) {
  const { p, time, winter } = l
  flat(l, () => {
    p.ground(0.2, 1.7, 10.8, 5.9, GRAVEL)
    // the flower beds of the Great Parterre
    for (const [c0, c1] of [
      [1.0, 2.7],
      [3.1, 4.8],
      [6.2, 7.9],
      [8.3, 10.0],
    ]) {
      for (const [r0, r1] of [
        [2.0, 3.0],
        [3.3, 4.3],
      ]) {
        p.ground(c0, r0, c1, r1, winter ? '#e9eef2' : '#79ad55')
        if (winter) continue
        const { ctx } = p
        for (let i = 0; i < 14; i++) {
          const [fx, fy] = p.at(
            c0 + 0.1 + noise(c0, r0, i) * (c1 - c0 - 0.2),
            r0 + 0.1 + noise(r0, c0, i) * (r1 - r0 - 0.2),
          )
          ctx.fillStyle = p.c(['#e53935', '#fdd835', '#f06292', '#ffffff'][i % 4])
          ctx.fillRect(fx, fy, 2.5, 1.5)
        }
      }
    }
    // the hill of the Gloriette
    p.groundEllipse(5.5, 5.35, 3.0, 0.75, winter ? '#f1f4f7' : '#8fbf60')
  })
  floodlight(l, 5.5, 1.0, 200, 30)
  const roof = roofColor('#7d8a84', winter)
  // the palace in Schönbrunn yellow
  part(l, 5.5, 0.8, (x, y) => {
    building(p, x, y, 9.4, 1.0, 30, IMPERIAL_YELLOW, roof, 1301, {
      roofHeight: 12,
      trim: '#fff8e6',
      facade: { floors: 3, perCell: 3, tall: 0.55, glass: '#3e4a44' },
    })
  })
  for (const c of [0.9, 10.1]) {
    part(l, c, 1.5, (x, y) => {
      building(p, x, y, 1.1, 1.0, 26, IMPERIAL_YELLOW, roof, 1302 + c, {
        roofHeight: 10,
        trim: '#fff8e6',
        facade: { floors: 3, perCell: 3, tall: 0.55, glass: '#3e4a44' },
      })
    })
  }
  // the middle risalit with the double staircase
  part(l, 5.5, 1.45, (x, y) => {
    const box = { cols: 2.0, rows: 0.4, height: 34, color: '#f3c95a' }
    p.box(x, y, box)
    facade(p, x, y, box, 1305, { floors: 3, perCell: 3, tall: 0.6, glass: '#3e4a44', arched: true })
    cornice(p, x, y, box, 32, '#fff8e6')
    p.box(x, y + 6, { cols: 1.2, rows: 0.25, height: 6, color: '#f4efe2' })
    flag(p, x, y - 34, 16, ['#ed2939', '#ffffff', '#ed2939'], time)
  })
  // hedges along the sides
  for (const c of [0.4, 10.6]) {
    part(l, c, 3.6, (x, y) =>
      p.box(x, y, { cols: 0.25, rows: 3.6, height: 12, color: roofColor('#3d6e38', winter) }),
    )
  }
  for (const c of [2.95, 5.15, 5.85, 8.05]) {
    for (const r of [2.15, 3.15, 4.15]) part(l, c, r, (x, y) => topiary(p, x, y, 11, winter))
  }
  // the Neptune fountain
  part(l, 5.5, 4.55, (x, y) => {
    p.disc(x, y, 0.62, '#e3dccb')
    p.disc(x, y, 0.55, winter ? '#a9c6d6' : WATER)
    p.box(x, y - 2, { cols: 0.6, rows: 0.16, height: 12, color: '#efe9da' })
    p.ctx.fillStyle = p.c('#f2eee4')
    p.ctx.beginPath()
    p.ctx.ellipse(x, y - 18, 4, 6, 0, 0, Math.PI * 2)
    p.ctx.fill()
    if (!winter) {
      p.ctx.strokeStyle = 'rgba(255,255,255,0.75)'
      p.ctx.lineWidth = 1.2
      for (const dx of [-10, 0, 10]) {
        const h = 8 + Math.sin(time * 3 + dx) * 2
        p.ctx.beginPath()
        p.ctx.moveTo(x + dx, y - 2)
        p.ctx.quadraticCurveTo(x + dx * 1.2, y - 2 - h, x + dx * 1.6, y)
        p.ctx.stroke()
      }
    }
  })
  // the Gloriette on the hill
  part(l, 5.5, 5.35, (x, y) => {
    const y0 = y - 6
    const hall = { cols: 4.0, rows: 0.4, height: 18, color: '#f3f0e6' }
    p.shadow(x, y0, hall.cols, hall.rows)
    p.box(x, y0, hall)
    const [, , front, left] = p.boxTop(x, y0, hall)
    arcade(p, [left[0], left[1] + 18], [front[0], front[1] + 18], 11, 13, '#6e8a96')
    cornice(p, x, y0, hall, 16)
    const middle = { cols: 1.1, rows: 0.44, height: 26, color: '#f3f0e6' }
    p.box(x, y0, middle)
    const [, , mfront, mleft] = p.boxTop(x, y0, middle)
    arcade(p, [mleft[0], mleft[1] + 26], [mfront[0], mfront[1] + 26], 3, 18, '#6e8a96')
    cornice(p, x, y0, middle, 24)
    // the imperial eagle on top
    p.ctx.fillStyle = p.c('#3a3a36')
    p.ctx.beginPath()
    p.ctx.ellipse(x, y0 - 32, 6, 3, 0, 0, Math.PI * 2)
    p.ctx.fill()
    ball(p, x, y0 - 36, 2)
  })
}

function stadtpark(l: L) {
  const { p, time, night } = l
  lawn(l, 0.05, 0.05, 4.95, 4.95)
  flat(l, () => {
    p.ground(0.05, 1.8, 4.95, 2.1, GRAVEL)
    p.ground(2.2, 0.05, 2.5, 4.95, GRAVEL)
    p.groundEllipse(1.2, 3.5, 0.95, 0.75, '#e3dccb')
    p.groundEllipse(1.2, 3.5, 0.85, 0.65, l.winter ? '#a9c6d6' : WATER)
    glints(l, 1.2, 3.5, 0.5, 0.4, 3)
  })
  // ducks on the pond
  if (!l.winter) {
    for (let i = 0; i < 3; i++) {
      const angle = time * 0.2 + i * 2.1
      part(l, 1.2 + Math.cos(angle) * 0.5, 3.5 + Math.sin(angle) * 0.38, (x, y) => {
        p.ctx.fillStyle = p.c(i ? '#7b5b3a' : '#2e6b3a')
        p.ctx.beginPath()
        p.ctx.ellipse(x, y - 1, 2.5, 1.5, 0, 0, Math.PI * 2)
        p.ctx.fill()
        p.ctx.beginPath()
        p.ctx.arc(x + 2, y - 3, 1.1, 0, Math.PI * 2)
        p.ctx.fill()
      })
    }
  }
  // the Kursalon
  part(l, 3.6, 0.75, (x, y) => {
    building(p, x, y, 2.2, 0.9, 22, '#f4e8c8', roofColor('#7a8c84', l.winter), 1401, {
      roofHeight: 10,
      facade: { floors: 2, perCell: 2.4, arched: true, tall: 0.65 },
    })
  })
  treeAt(l, 0.5, 0.6)
  treeAt(l, 1.5, 0.9)
  treeAt(l, 0.6, 2.5)
  treeAt(l, 4.4, 2.6)
  treeAt(l, 2.8, 4.4)
  treeAt(l, 4.3, 4.3)
  treeAt(l, 2.9, 3.0)
  // Johann Strauss with his violin, all in gold, under a marble arch
  part(l, 3.6, 2.4, (x, y) => {
    const marble = '#f6f3ec'
    const [lx, ly] = isoOffset(p.tileSize, -0.35, 0)
    const [rx, ry] = isoOffset(p.tileSize, 0.35, 0)
    p.box(x, y, { cols: 0.9, rows: 0.3, height: 3, color: marble })
    p.box(x + lx, y + ly, { cols: 0.14, rows: 0.18, height: 28, color: marble })
    p.box(x + rx, y + ry, { cols: 0.14, rows: 0.18, height: 28, color: marble })
    p.box(x, y, { cols: 0.86, rows: 0.2, height: 5, elevation: 28, color: marble })
    p.box(x, y, { cols: 0.14, rows: 0.14, height: 7, elevation: 3, color: marble })
    const { ctx } = p
    const gold = p.c(GOLD)
    ctx.fillStyle = gold
    ctx.fillRect(x - 2, y - 21, 4, 11)
    ctx.beginPath()
    ctx.arc(x, y - 23, 2, 0, Math.PI * 2)
    ctx.fill()
    // the violin and the bow, swaying in waltz time
    const bow = Math.sin(time * Math.PI * 1.5) * 0.3
    ctx.fillRect(x + 1, y - 21, 5, 2)
    ctx.strokeStyle = gold
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(x - 2, y - 19)
    ctx.lineTo(x + 6 * Math.cos(bow), y - 25 + 6 * Math.sin(bow))
    ctx.stroke()
    if (night > 0) p.light(x, y - 18, 22, 'rgba(255,214,110,1)', night * 0.55)
    if (Math.floor(time) % 3 === 0)
      p.text('♫', x + 9, y - 32 - (time % 1) * 6, 7, l.night > 0.5 ? '#ffe9a8' : '#7a5b20', true)
  })
}

function musikverein(l: L) {
  const { p } = l
  floodlight(l, 1.5, 1, 60, 24)
  part(l, 1.5, 0.9, (x, y) => {
    building(p, x, y, 2.6, 1.3, 26, '#e1ad78', roofColor('#a95b3d', l.winter), 1501, {
      roofHeight: 12,
      trim: '#f4ead6',
      facade: { floors: 2, perCell: 2, arched: true, tall: 0.6 },
    })
  })
  part(l, 1.5, 1.6, (x, y) => {
    templeFront(p, x, y, 1.1, 20, 4)
    p.text('♪', x - 8, y - 34, 7, GOLD, true)
  })
}

function prater(l: L) {
  const { p, time, night } = l
  lawn(l, 0.05, 0.05, 6.95, 3.95)
  flat(l, () => {
    p.ground(0.05, 3.2, 6.95, 3.5, GRAVEL)
    p.ground(1.7, 1.2, 4.6, 3.2, GRAVEL)
  })
  // the swing carousel
  part(l, 0.9, 2.2, (x, y) => {
    p.cylinder(x, y, 0.25, 4, '#d8cbb0')
    p.cylinder(x, y, 0.05, 66, '#e2e2e2', 4)
    const spin = time * 1.6
    const [rx, ry] = isoRadii(p.tileSize, 0.75)
    const top = y - 64
    const { ctx } = p
    p.cone(x, top + 4, 0.35, 8, ['#d32f2f', '#fdd835'], 0, 12)
    for (let i = 0; i < 10; i++) {
      const angle = spin + (i / 10) * Math.PI * 2
      const sx = x + Math.cos(angle) * rx
      const sy = top + 22 + Math.sin(angle) * ry
      ctx.strokeStyle = p.c('#9e9e9e')
      ctx.lineWidth = 0.6
      ctx.beginPath()
      ctx.moveTo(x + Math.cos(angle) * rx * 0.4, top + Math.sin(angle) * ry * 0.4)
      ctx.lineTo(sx, sy)
      ctx.stroke()
      ctx.fillStyle = night > 0.5 ? '#ffe08a' : p.c(['#1e88e5', '#e53935', '#fdd835'][i % 3])
      ctx.fillRect(sx - 1.5, sy, 3, 2.5)
    }
  })
  // the Riesenrad: the wheel turns in the plane along the columns
  part(l, 3.1, 2.0, (x, y) => {
    const { ctx } = p
    const hubHeight = 66
    const radius = 54
    const half = 1.6
    const hub: Point = [x, y - hubHeight]
    const turn = time * 0.06
    const rim = (angle: number, scale = 1): Point => {
      const [dx, dy] = isoOffset(p.tileSize, Math.cos(angle) * half * scale, 0)
      return [hub[0] + dx, hub[1] + dy - Math.sin(angle) * radius * scale]
    }
    // the base with the ticket hall
    const hall = { cols: 1.2, rows: 0.7, height: 10, color: '#b71c1c' }
    p.shadow(x, y, 1.4, 1.0)
    p.box(x, y + 6, hall)
    p.box(x, y + 6, { cols: 1.24, rows: 0.74, height: 2, elevation: 10, color: '#fafafa' })
    // legs
    ctx.strokeStyle = p.c('#5d4c40')
    ctx.lineWidth = 2.2
    for (const [dc, dr] of [
      [-0.6, -0.5],
      [0.6, -0.5],
      [-0.6, 0.5],
      [0.6, 0.5],
    ]) {
      const [dx, dy] = isoOffset(p.tileSize, dc * 0.4, dr)
      ctx.beginPath()
      ctx.moveTo(x + dx, y + dy)
      ctx.lineTo(hub[0], hub[1])
      ctx.stroke()
    }
    // spokes and the double rim
    ctx.strokeStyle = p.c('#4e3f35')
    ctx.lineWidth = 0.7
    for (let i = 0; i < 30; i++) {
      const [sx, sy] = rim(turn + (i / 30) * Math.PI * 2)
      ctx.beginPath()
      ctx.moveTo(hub[0], hub[1])
      ctx.lineTo(sx, sy)
      ctx.stroke()
    }
    for (const scale of [1, 0.92]) {
      ctx.lineWidth = scale === 1 ? 2 : 1
      ctx.beginPath()
      for (let i = 0; i <= 60; i++) {
        const [rx, ry] = rim((i / 60) * Math.PI * 2, scale)
        if (i) ctx.lineTo(rx, ry)
        else ctx.moveTo(rx, ry)
      }
      ctx.stroke()
    }
    if (night > 0) {
      ctx.fillStyle = `rgba(255,236,170,${night})`
      for (let i = 0; i < 40; i++) {
        const [bx, by] = rim(turn + (i / 40) * Math.PI * 2)
        ctx.fillRect(bx - 0.8, by - 0.8, 1.6, 1.6)
      }
    }
    // the red gondolas hang below the rim
    for (let i = 0; i < 15; i++) {
      const [gx, gy] = rim(turn + (i / 15) * Math.PI * 2)
      p.box(gx, gy + 9, { cols: 0.2, rows: 0.12, height: 7, color: '#c62828' })
      ctx.fillStyle = night > 0.5 ? '#ffe9a8' : p.c('#e3f2fd')
      ctx.fillRect(gx - 3, gy + 1, 3, 2.5)
    }
    p.cylinder(hub[0], hub[1] + 3, 0.06, 6, '#3e3e3e')
  })
  // the carousel
  part(l, 5.7, 2.2, (x, y) => {
    p.cylinder(x, y, 0.62, 4, '#f3e5c8')
    p.cylinder(x, y, 0.08, 18, '#f3e5c8', 4)
    const [rx, ry] = isoRadii(p.tileSize, 0.48)
    const { ctx } = p
    for (let i = 0; i < 8; i++) {
      const angle = time * 0.8 + (i / 8) * Math.PI * 2
      const bob = Math.sin(time * 3 + i) * 2
      ctx.fillStyle = p.c(['#fafafa', '#8d6e63', '#ffcc80'][i % 3])
      ctx.fillRect(x + Math.cos(angle) * rx - 2.5, y - 10 + Math.sin(angle) * ry + bob, 5, 3)
    }
    p.cone(x, y, 0.66, 12, ['#d32f2f', '#fafafa', GOLD], 22, 16)
    if (night > 0) p.light(x, y - 18, 22, 'rgba(255,214,140,1)', night * 0.6)
  })
  // the chestnuts of the Hauptallee
  for (let c = 0.4; c < 7; c += 1.05) treeAt(l, c, 3.75, 0.9)
  part(l, 4.6, 3.0, (x, y) => {
    const { ctx } = p
    ctx.font = 'bold 7px Arial'
    const text = 'PRATER'
    const width = ctx.measureText(text).width + 8
    p.cylinder(x, y, 0.03, 22, '#9e9e9e')
    ctx.fillStyle = p.c('#b71c1c')
    ctx.fillRect(x - width / 2, y - 34, width, 11)
    p.text(text, x, y - 28.5, 7, '#ffffff', night > 0)
  })
}

function donauturm(l: L) {
  const { p, time, night } = l
  lawn(l, 0.05, 0.05, 2.95, 2.95)
  flat(l, () => {
    p.groundEllipse(1.5, 1.5, 1.0, 1.0, GRAVEL)
    p.groundEllipse(1.5, 1.5, 0.75, 0.75, l.winter ? '#e9eef2' : '#c46a8a')
    p.groundEllipse(1.5, 1.5, 0.55, 0.55, lawnColor(l))
  })
  treeAt(l, 0.4, 0.5)
  treeAt(l, 2.6, 0.4)
  treeAt(l, 0.4, 2.6)
  part(l, 1.5, 1.5, (x, y) => {
    p.shadow(x, y, 0.8, 0.8)
    p.cylinder(x, y, 0.32, 8, '#e3e6e8')
    p.cylinder(x, y, 0.15, 92, '#eceeef', 8)
    p.cylinder(x, y, 0.12, 82, '#e6e9eb', 100)
    // the revolving restaurant
    p.cylinder(x, y, 0.4, 8, '#e9edf0', 182)
    p.cylinder(x, y, 0.43, 8, '#37474f', 190)
    const { ctx } = p
    const [rx, ry] = isoRadii(p.tileSize, 0.43)
    ctx.fillStyle = night > 0 ? `rgba(255,214,140,${0.4 + night * 0.6})` : 'rgba(190,225,255,0.8)'
    for (let i = 0; i < 9; i++) {
      const angle = Math.PI * ((i / 9 + time / 60) % 1)
      ctx.fillRect(x + Math.cos(angle) * rx - 1.5, y - 196 + Math.sin(angle) * ry, 3, 4)
    }
    p.cylinder(x, y, 0.36, 5, '#e9edf0', 198)
    p.cylinder(x, y, 0.24, 6, '#dfe3e6', 203)
    // the antenna with red and white stripes
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = p.c(i % 2 ? '#fafafa' : '#e53935')
      ctx.fillRect(x - 1, y - 215 - i * 6, 2, 6)
    }
    if (Math.floor(time * 1.5) % 2 === 0) {
      ctx.fillStyle = '#ff3d3d'
      ctx.beginPath()
      ctx.arc(x, y - 252, 1.8, 0, Math.PI * 2)
      ctx.fill()
      p.light(x, y - 252, 10, 'rgba(255,60,60,1)', 0.3 + night * 0.6)
    }
  })
}

const HUNDERTWASSER_COLORS = [
  '#e8543f',
  '#f2c330',
  '#3a7cc2',
  '#f4efe4',
  '#d98e4a',
  '#6aa84f',
  '#c94f7c',
]

function hundertwasser(l: L) {
  const { p } = l
  lawn(l, 0.05, 0.05, 2.95, 2.95)
  const blocks: Array<[number, number, number, number, number]> = [
    [0.85, 0.85, 1.3, 1.2, 46],
    [2.1, 0.9, 1.2, 1.2, 36],
    [0.9, 2.1, 1.2, 1.2, 30],
    [2.1, 2.1, 1.2, 1.2, 22],
  ]
  blocks.forEach(([c, r, cols, rows, height], index) => {
    part(l, c, r, (x, y) => {
      const box = { cols, rows, height, color: '#f4efe4' }
      p.shadow(x, y, cols, rows)
      p.box(x, y, box)
      // colored patches, no two alike
      const [, right, front, left] = p.boxTop(x, y, box)
      const faces: Array<[Point, Point, number]> = [
        [left, front, -0.02],
        [front, right, -0.28],
      ]
      faces.forEach(([a, b, dark], face) => {
        const strips = 3
        for (let s = 0; s < strips; s++) {
          const color =
            HUNDERTWASSER_COLORS[Math.floor(noise(index, s, face) * HUNDERTWASSER_COLORS.length)]
          const top = 4 + noise(index, s, face + 5) * 10
          const sa = along(a, b, s / strips)
          const sb = along(a, b, (s + 1) / strips)
          p.poly(
            [
              [sa[0], sa[1] + top],
              [sb[0], sb[1] + top + (noise(s, index) - 0.5) * 6],
              [sb[0], sb[1] + height],
              [sa[0], sa[1] + height],
            ],
            shade(p.c(color), dark),
          )
        }
        // windows of every size, and a checkered band at the bottom
        for (let w = 0; w < 7; w++) {
          const u = 0.1 + noise(index, w, face) * 0.8
          const v = 6 + noise(w, index, face) * (height - 14)
          const [wx, wy] = onWall(a, b, u, -v)
          const size = 2 + noise(w, face, index) * 2.5
          p.ctx.fillStyle =
            p.night > 0 && noise(w, index, 9) > 0.4 ? '#ffd88a' : shade(p.c('#3d4652'), dark)
          p.ctx.fillRect(wx - size / 2, wy, size, size * 1.3)
        }
        for (let k = 0; k < 8; k++) {
          const ka = along(a, b, k / 8)
          const kb = along(a, b, (k + 1) / 8)
          p.poly(
            [
              [ka[0], ka[1] + height - 3],
              [kb[0], kb[1] + height - 3],
              [kb[0], kb[1] + height],
              [ka[0], ka[1] + height],
            ],
            k % 2 ? p.c('#222222') : p.c('#fafafa'),
          )
        }
      })
      // grass and a tree on the roof
      p.box(x, y, {
        cols: cols - 0.05,
        rows: rows - 0.05,
        height: 2,
        elevation: height,
        color: roofColor('#6aa84f', l.winter),
      })
      tree(p, x + 6, y - height, 0.7, index * 7, l.winter, l.time)
      if (index === 0) {
        // the golden onion dome
        const [ox, oy] = [x - 8, y - height - 4]
        p.cylinder(ox, oy + 2, 0.12, 6, '#f4efe4')
        const { ctx } = p
        ctx.fillStyle = p.c(GOLD)
        ctx.beginPath()
        ctx.ellipse(ox, oy - 10, 6, 7, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(ox - 2, oy - 15)
        ctx.lineTo(ox, oy - 24)
        ctx.lineTo(ox + 2, oy - 15)
        ctx.fill()
      }
    })
  })
}

export const LANDMARK_DRAWINGS: Record<LandmarkKind, (l: LandmarkScene) => void> = {
  stephansdom,
  hofburg,
  staatsoper,
  burgtheater,
  rathaus,
  parlament,
  votivkirche,
  museums,
  karlskirche,
  secession,
  naschmarkt,
  belvedere,
  schoenbrunn,
  stadtpark,
  musikverein,
  prater,
  donauturm,
  hundertwasser,
}

/** Monuments that are floodlit at night, so they stay brighter than the rest of the city */
export const FLOODLIT: Record<LandmarkKind, boolean> = {
  stephansdom: true,
  hofburg: true,
  staatsoper: true,
  burgtheater: true,
  rathaus: true,
  parlament: true,
  votivkirche: true,
  museums: true,
  karlskirche: true,
  secession: true,
  naschmarkt: false,
  belvedere: true,
  schoenbrunn: true,
  stadtpark: false,
  musikverein: true,
  prater: false,
  donauturm: false,
  hundertwasser: false,
}
