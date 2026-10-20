import type { GameComponentProperties, IGameComponent } from '../../../lib/game.types'
import { AbstractGameComponent } from '../../../lib'
import { IsoPainter, shade } from './isovegas.draw.ts'
import { drawPalm } from './isovegas.landmarks.ts'
import type { PropKind, VegasScene } from './isovegas.map.ts'

export interface IsoVegasPropComponentProps extends GameComponentProperties {
  tileSize: number
  kind: PropKind
  col: number
  row: number
  scene: VegasScene
}

/** A small thing standing on one cell: a palm, a cactus, a chapel, a motel or the welcome sign */
export class IsoVegasPropComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoVegasPropComponentProps

  public readonly componentType: string = 'IsoVegasProp'

  constructor(properties: IsoVegasPropComponentProps) {
    super(properties)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { tileSize, kind, col, row, scene } = this.properties
    const p = new IsoPainter(ctx, tileSize, scene.night)
    // the center of the cell
    const x = this.x
    const y = this.y + tileSize / 4

    switch (kind) {
      case 'palm':
        return drawPalm(p, x, y, 30, scene.time, col * 13 + row * 7)
      case 'cactus':
        return this.drawCactus(p, x, y)
      case 'chapel':
        return this.drawChapel(p, x, y)
      case 'motel':
        return this.drawMotel(p, x, y)
      case 'welcome':
        return this.drawWelcomeSign(p, x, y)
    }
  }

  private drawCactus(p: IsoPainter, x: number, y: number) {
    const { ctx } = p
    const green = p.c('#4f8a3c')
    ctx.lineCap = 'round'
    ctx.strokeStyle = green
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x, y - 22)
    ctx.stroke()
    ctx.lineWidth = 3.5
    ctx.strokeStyle = shade(green, -0.15)
    ctx.beginPath()
    ctx.moveTo(x, y - 9)
    ctx.lineTo(x - 7, y - 9)
    ctx.lineTo(x - 7, y - 17)
    ctx.moveTo(x, y - 13)
    ctx.lineTo(x + 6, y - 13)
    ctx.lineTo(x + 6, y - 19)
    ctx.stroke()
  }

  private drawChapel(p: IsoPainter, x: number, y: number) {
    const { ctx } = p
    const { time, night } = this.properties.scene
    p.shadow(x, y, 0.5, 0.6)
    const box = { cols: 0.5, rows: 0.6, height: 14, color: '#fbfaf6' }
    const [back, right, front, left] = p.box(x, y, box)
    // a gable roof along the rows
    const ridgeFront: [number, number] = [(left[0] + front[0]) / 2, (left[1] + front[1]) / 2 - 8]
    const ridgeBack: [number, number] = [(back[0] + right[0]) / 2, (back[1] + right[1]) / 2 - 8]
    p.poly([ridgeFront, front, right, ridgeBack], shade(p.c('#9aa6b2'), -0.2))
    p.poly([left, front, ridgeFront], p.c('#fbfaf6'))
    // the steeple
    const [sx, sy] = [ridgeBack[0] - 4, ridgeBack[1] + 14]
    p.box(sx, sy, { cols: 0.12, rows: 0.12, height: 8, elevation: 18, color: '#fbfaf6' })
    p.pyramid(sx, sy, 0.12, 0.12, 9, '#9aa6b2', 26)
    // a neon heart
    const beat = 1 + Math.max(0, Math.sin(time * 6)) * 0.15
    p.text('♥', x + 12, y - 26, 12 * beat, '#ff3d7f', true)
    if (night > 0) p.light(x + 12, y - 26, 14, 'rgba(255,60,130,1)', night * 0.4)
    ctx.fillStyle = p.c('#7a5a3a')
    const [dx, dy] = [(left[0] + front[0]) / 2, (left[1] + front[1]) / 2]
    ctx.fillRect(dx - 2, dy + 6, 4, 8)
  }

  private drawMotel(p: IsoPainter, x: number, y: number) {
    const { ctx } = p
    const { time, night } = this.properties.scene
    p.shadow(x, y, 0.8, 0.5)
    const [, , front, left] = p.box(x, y, { cols: 0.8, rows: 0.5, height: 11, color: '#f2d7a0' })
    // doors
    for (let i = 0; i < 4; i++) {
      const t = (i + 0.4) / 4
      const dx = left[0] + (front[0] - left[0]) * t
      const dy = left[1] + (front[1] - left[1]) * t
      ctx.fillStyle = p.c(['#2e7d9a', '#c0573e'][i % 2])
      ctx.fillRect(dx - 1.5, dy + 3, 3, 7)
    }
    // the sign, with an arrow that blinks
    p.cylinder(x + 18, y - 4, 0.03, 22, '#8d8d8d')
    p.box(x + 18, y - 4, { cols: 0.45, rows: 0.08, height: 9, elevation: 22, color: '#263238' })
    p.text('MOTEL', x + 16, y - 30, 6, '#ff3d3d', true)
    if (Math.floor(time * 2) % 2 === 0) p.text('➜', x + 26, y - 38, 8, '#ffd23f', true)
    if (night > 0) p.light(x + 16, y - 30, 16, 'rgba(255,60,60,1)', night * 0.3)
  }

  private drawWelcomeSign(p: IsoPainter, x: number, y: number) {
    const { ctx } = p
    const { time, night } = this.properties.scene
    const post = p.c('#cfd8dc')
    ctx.fillStyle = post
    ctx.fillRect(x - 10, y - 24, 3, 24)
    ctx.fillRect(x + 7, y - 24, 3, 24)
    const board: Array<[number, number]> = [
      [x - 28, y - 37],
      [x, y - 56],
      [x + 28, y - 37],
      [x, y - 20],
    ]
    p.poly(board, p.c('#fbfaf2'))
    p.text('WELCOME', x, y - 45, 6, '#e53935', night > 0)
    p.text('to Fabulous', x, y - 40, 4, '#1e63c4')
    p.text('LAS VEGAS', x, y - 34, 7, '#e53935', night > 0)
    p.text('NEVADA', x, y - 28, 3.5, '#1e63c4')
    // the red star on top
    p.text('✦', x, y - 60, 10, '#e53935', night > 0)
    // chasing bulbs around the board
    for (let i = 0; i < 24; i++) {
      const t = i / 24
      const side = Math.floor(t * 4)
      const a = board[side]
      const b = board[(side + 1) % 4]
      const s = t * 4 - side
      const on = Math.floor(time * 6 + i) % 4 !== 0
      ctx.fillStyle = on ? '#fff59d' : p.c('#b0a070')
      ctx.beginPath()
      ctx.arc(a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, 1.2, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
