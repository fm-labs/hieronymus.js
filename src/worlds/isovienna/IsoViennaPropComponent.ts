import type { GameComponentProperties, IGameComponent } from '../../../lib/game.types'
import { AbstractGameComponent } from '../../../lib'
import {
  along,
  building,
  hipRoof,
  IsoPainter,
  roofColor,
  shade,
  townHouse,
  tree,
  type Point,
} from './isovienna.draw.ts'
import type { PropKind, ViennaScene } from './isovienna.map.ts'

export interface IsoViennaPropComponentProps extends GameComponentProperties {
  tileSize: number
  kind: PropKind
  col: number
  row: number
  scene: ViennaScene
}

/** A small thing on one cell: a tree, a town house, a coffee house, a sausage stand, ... */
export class IsoViennaPropComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoViennaPropComponentProps

  public readonly componentType: string = 'IsoViennaProp'

  constructor(properties: IsoViennaPropComponentProps) {
    super(properties)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { tileSize, kind, col, row, scene } = this.properties
    // the center of the cell, also the origin of p.at()
    const x = this.x
    const y = this.y + tileSize / 4
    const p = new IsoPainter(ctx, tileSize, scene.night, [x, y])
    const seed = col * 131 + row * 17

    switch (kind) {
      case 'tree':
        return tree(p, x, y, 1.1, seed, scene.winter, scene.time)
      case 'house':
        return townHouse(p, x, y, seed, scene.winter)
      case 'cafe':
        return this.drawCafe(p, x, y, seed)
      case 'wurstel':
        return this.drawWurstelstand(p, x, y)
      case 'ubahn':
        return this.drawUBahn(p, x, y)
      case 'heuriger':
        return this.drawHeuriger(p, x, y, seed)
      case 'vines':
        return this.drawVines(p)
    }
  }

  /** A coffee house: an old house with a striped awning and a few tables outside */
  private drawCafe(p: IsoPainter, x: number, y: number, seed: number) {
    const { winter, night } = this.properties.scene
    const [bx, by] = p.at(-0.08, -0.08)
    const house = { cols: 0.66, rows: 0.66, height: 26, color: '#efe0c0' }
    building(
      p,
      bx,
      by,
      house.cols,
      house.rows,
      house.height,
      house.color,
      roofColor('#9a4a35', winter),
      seed,
      {
        roofHeight: 10,
        facade: { floors: 3, perCell: 3.6, skipGround: true },
      },
    )
    const [, right, front, left] = p.boxTop(bx, by, house)
    // the awning over the ground floor
    for (const [a, b] of [
      [left, front],
      [front, right],
    ] as Array<[Point, Point]>) {
      for (let s = 0; s < 6; s++) {
        const sa = along(a, b, s / 6)
        const sb = along(a, b, (s + 1) / 6)
        p.poly(
          [
            [sa[0], sa[1] + 17],
            [sb[0], sb[1] + 17],
            [sb[0] + (a === left ? -2 : 2), sb[1] + 22],
            [sa[0] + (a === left ? -2 : 2), sa[1] + 22],
          ],
          p.c(s % 2 ? '#fafafa' : '#7b1f2a'),
        )
      }
    }
    if (night > 0) p.light(...along(left, front, 0.5), 18, 'rgba(255,200,120,1)', night * 0.4)
    // tables with umbrellas on the pavement
    if (winter) return
    for (const [dx, dy] of [
      [-12, 14],
      [12, 14],
    ]) {
      p.cylinder(x + dx, y + dy, 0.015, 9, '#9e9e9e')
      p.cone(x + dx, y + dy, 0.16, 4, ['#fafafa', '#7b1f2a'], 9, 8)
      p.ctx.fillStyle = p.c('#5d4037')
      p.ctx.fillRect(x + dx - 3, y + dy - 4, 6, 1.5)
    }
  }

  /** A sausage stand, open late */
  private drawWurstelstand(p: IsoPainter, x: number, y: number) {
    const { night, time, winter } = this.properties.scene
    p.shadow(x, y, 0.5, 0.36)
    const stand = { cols: 0.5, rows: 0.36, height: 12, color: '#c8473a' }
    const [, , front, left] = p.box(x, y, stand)
    p.box(x, y, {
      cols: 0.6,
      rows: 0.46,
      height: 2,
      elevation: 12,
      color: winter ? '#f3f6fa' : '#fafafa',
    })
    // the serving hatch
    const a = along(left, front, 0.2)
    const b = along(left, front, 0.8)
    p.poly(
      [
        [a[0], a[1] + 3],
        [b[0], b[1] + 3],
        [b[0], b[1] + 8],
        [a[0], a[1] + 8],
      ],
      night > 0 ? '#ffd88a' : p.c('#5a3a30'),
    )
    p.text('WÜRSTEL', x, y - 19, 4.5, '#ffd54f', night > 0)
    if (night > 0) p.light(x, y - 8, 18, 'rgba(255,200,120,1)', night * 0.5)
    // steam from the grill
    const { ctx } = p
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    for (let i = 0; i < 3; i++) {
      const t = (time * 0.6 + i / 3) % 1
      ctx.globalAlpha = 0.6 * (1 - t)
      ctx.beginPath()
      ctx.arc(x + 4 + Math.sin(t * 6) * 2, y - 16 - t * 12, 1.5 + t * 2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  /** The entrance of an U-Bahn station with its blue sign */
  private drawUBahn(p: IsoPainter, x: number, y: number) {
    const { night } = this.properties.scene
    // the stairs going down, under a glass roof
    p.ground(-0.32, -0.12, 0.32, 0.18, '#3a3f45')
    p.box(x, y + 2, { cols: 0.66, rows: 0.36, height: 1.5, elevation: 10, color: '#bcd7e6' })
    for (const [dc, dr] of [
      [-0.3, -0.15],
      [0.3, -0.15],
      [-0.3, 0.15],
      [0.3, 0.15],
    ]) {
      const [px, py] = p.at(dc, dr)
      p.ctx.fillStyle = p.c('#78909c')
      p.ctx.fillRect(px - 0.6, py - 10 + 2, 1.2, 10)
    }
    // the pole with the U
    const [sx, sy] = p.at(0.32, 0.3)
    p.cylinder(sx, sy, 0.03, 26, '#cfd8dc')
    const { ctx } = p
    const top = sy - 38
    if (night > 0) p.light(sx, top + 6, 14, 'rgba(80,140,255,1)', night * 0.6)
    ctx.fillStyle = night > 0 ? '#2a5fd6' : p.c('#1f4fb4')
    ctx.fillRect(sx - 6, top, 12, 12)
    p.text('U', sx, top + 6.5, 10, '#ffffff', night > 0)
  }

  /** A wine tavern with a bunch of pine branches over the door: open! */
  private drawHeuriger(p: IsoPainter, x: number, y: number, seed: number) {
    const { night, winter } = this.properties.scene
    building(p, x, y, 0.8, 0.55, 14, '#f4efe2', roofColor('#a9563c', winter), seed, {
      roofHeight: 10,
      facade: { floors: 1, perCell: 2, tall: 0.6 },
    })
    const [, , front, left] = p.boxTop(x, y, { cols: 0.8, rows: 0.55, height: 14, color: '' })
    const [dx, dy] = along(left, front, 0.25)
    p.ctx.fillStyle = p.c('#6d4c35')
    p.ctx.fillRect(dx - 2, dy + 6, 4, 8)
    // the "Buschen" and a lantern
    p.ctx.fillStyle = p.c('#2f5d2f')
    p.ctx.beginPath()
    p.ctx.arc(dx + 6, dy + 2, 3.5, 0, Math.PI * 2)
    p.ctx.fill()
    if (night > 0) p.light(dx + 6, dy + 6, 16, 'rgba(255,190,100,1)', night * 0.7)
    // a long table with benches
    const [tx, ty] = p.at(-0.1, 0.38)
    p.box(tx, ty, { cols: 0.5, rows: 0.12, height: 4, color: '#8a6040' })
    p.box(tx - 3, ty + 2, { cols: 0.5, rows: 0.06, height: 2, color: shade('#8a6040', -0.1) })
    // a little roof over the garden
    if (!winter) {
      const [ax, ay] = p.at(-0.1, 0.38)
      hipRoof(p, ax, ay, 0.6, 0.3, 3, '#4f8d3f', 12)
    }
  }

  /** Rows of vines on stakes */
  private drawVines(p: IsoPainter) {
    const { col, row, scene } = this.properties
    const { ctx } = p
    for (const r of [-0.25, 0.25]) {
      for (let i = 0; i < 5; i++) {
        const [px, py] = p.at(-0.4 + i * 0.2, r)
        ctx.fillStyle = p.c('#7a5a3a')
        ctx.fillRect(px - 0.5, py - 9, 1, 9)
        if (scene.winter) continue
        ctx.fillStyle = p.c((col + row + i) % 3 ? '#5f9a3e' : '#6fa646')
        ctx.beginPath()
        ctx.ellipse(px, py - 7, 4, 3, 0, 0, Math.PI * 2)
        ctx.fill()
        // grapes in late summer
        if (i % 2) {
          ctx.fillStyle = p.c('#6a3a7a')
          ctx.fillRect(px + 1, py - 5, 1.5, 2)
        }
      }
    }
  }
}
