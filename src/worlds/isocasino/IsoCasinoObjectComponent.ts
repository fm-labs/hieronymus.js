import type { GameComponentProperties, IGameComponent } from '../../../lib/game.types'
import { AbstractGameComponent } from '../../../lib'
import { drawIsoBox, drawIsoShadow, isoBoxTop, shadeColor } from '../isocity/isocity.draw.ts'
import {
  drawFaceRect,
  drawIsoCylinder,
  drawIsoDisc,
  drawWheel,
  isoRadii,
  shadeHex,
} from './isocasino.draw.ts'
import type { ObjectKind } from './isocasino.floor.ts'

export interface IsoCasinoObjectComponentProps extends GameComponentProperties {
  tileSize: number
  kind: ObjectKind
  /** Main color, e.g. of a slot cabinet, a sofa or a wall */
  color?: string
  /** In use by a guest: screens light up, wheels spin, cards are dealt */
  active?: boolean
  /** Walls: height in pixels */
  height?: number
  /** Progressive slots: the current jackpot in dollars */
  jackpot?: number
}

const ROULETTE_COLORS = Array.from({ length: 18 }, (_, i) =>
  i === 0 ? '#2e7d32' : i % 2 ? '#c62828' : '#212121',
)
const MONEY_WHEEL_COLORS = ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#fb8c00']
const SCREEN_COLORS = ['#ff4081', '#7c4dff', '#18ffff', '#ffd740', '#69f0ae']

const WOOD = '#5d4037'
const FELT = '#2e7d32'

/**
 * A slot machine, a gaming table or a piece of inventory standing on one cell.
 * The position is the top corner of the cell, so it is depth-sorted like the other tiles.
 */
export class IsoCasinoObjectComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoCasinoObjectComponentProps

  public static readonly defaultProperties: IsoCasinoObjectComponentProps = {
    tileSize: 64,
    kind: 'slot',
    active: false,
  }

  public readonly componentType: string = 'IsoCasinoObject'

  /** Seconds since start, drives the animations. Starts random, so machines don't blink in sync. */
  private time = Math.random() * 100

  constructor(properties: Partial<IsoCasinoObjectComponentProps>) {
    super({ ...IsoCasinoObjectComponent.defaultProperties, ...properties })
  }

  update(deltaTime: number): void {
    this.time += deltaTime / 1000
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // center of the cell
    const x = this.x
    const y = this.y + this.properties.tileSize / 4

    switch (this.properties.kind) {
      case 'wall':
        return this.drawWall(ctx, x, y)
      case 'slot':
        return this.drawSlot(ctx, x, y, false)
      case 'progressive':
        return this.drawSlot(ctx, x, y, true)
      case 'blackjack':
        return this.drawCardTable(ctx, x, y, FELT)
      case 'baccarat':
        return this.drawCardTable(ctx, x, y, '#1e4d8c')
      case 'craps':
        return this.drawCraps(ctx, x, y)
      case 'roulette':
        return this.drawRoulette(ctx, x, y)
      case 'poker':
        return this.drawPoker(ctx, x, y)
      case 'wheel':
        return this.drawMoneyWheel(ctx, x, y)
      case 'podium':
        return this.drawPodium(ctx, x, y)
      case 'cashier':
        return this.drawCashier(ctx, x, y)
      case 'bar':
        return this.drawBar(ctx, x, y)
      case 'stool':
        return this.drawStool(ctx, x, y)
      case 'sofa':
        return this.drawSofa(ctx, x, y)
      case 'loungeTable':
        return this.drawLoungeTable(ctx, x, y)
      case 'plant':
        return this.drawPlant(ctx, x, y)
      case 'atm':
        return this.drawAtm(ctx, x, y)
      case 'desk':
        return this.drawDesk(ctx, x, y)
      case 'pillar':
        return this.drawPillar(ctx, x, y)
    }
  }

  private get ts() {
    return this.properties.tileSize
  }

  private drawWall(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const { color = '#cfc4b0', height = 12 } = this.properties
    drawIsoBox(ctx, this.ts, x, y, { cols: 1, rows: 1, height, color })
    // a darker trim along the top
    drawIsoBox(ctx, this.ts, x, y, {
      cols: 1,
      rows: 1,
      height: 3,
      elevation: height - 3,
      color: shadeHex(color, -0.25),
    })
  }

  private drawSlot(ctx: CanvasRenderingContext2D, x: number, y: number, progressive: boolean) {
    const { color = '#37474f', active } = this.properties
    const size = progressive ? 0.62 : 0.48
    const height = progressive ? 40 : 30
    const box = { cols: size, rows: size, height, color }
    drawIsoShadow(ctx, this.ts, x, y, size, size)
    drawIsoBox(ctx, this.ts, x, y, box)

    // the screen on the front-left side, and a button panel below it
    const [, right, front, left] = isoBoxTop(this.ts, x, y, box)
    const frame = Math.floor(this.time * 3)
    const screen = active ? SCREEN_COLORS[frame % SCREEN_COLORS.length] : '#263238'
    drawFaceRect(ctx, left, front, 0.15, 0.85, 4, height * 0.5, screen)
    if (active) {
      // spinning reels: three lighter bars
      for (let i = 0; i < 3; i++) {
        const t0 = 0.2 + i * 0.22
        drawFaceRect(ctx, left, front, t0, t0 + 0.16, 7, height * 0.5 - 3, 'rgba(255,255,255,0.45)')
      }
    }
    drawFaceRect(ctx, left, front, 0.15, 0.85, height * 0.6, height * 0.68, '#ffca28')
    drawFaceRect(ctx, front, right, 0.15, 0.85, 4, height * 0.5, shadeColor(color, -0.5))

    // the topper light: blinks while the machine is in use
    const on = !active || Math.floor(this.time * 4) % 2 === 0
    const topper = progressive ? '#ffd600' : '#ff5252'
    drawIsoBox(ctx, this.ts, x, y, {
      cols: size * 0.8,
      rows: size * 0.8,
      height: progressive ? 10 : 5,
      elevation: height,
      color: on ? topper : shadeHex(topper, -0.4),
    })

    if (progressive && this.properties.jackpot !== undefined) {
      const text = `$${Math.floor(this.properties.jackpot).toLocaleString('en-US')}`
      ctx.font = 'bold 10px Arial'
      ctx.textAlign = 'center'
      const width = ctx.measureText(text).width + 8
      const ty = y - height - 22
      ctx.fillStyle = 'rgba(0,0,0,0.75)'
      ctx.fillRect(x - width / 2, ty - 10, width, 14)
      ctx.fillStyle = '#ffd600'
      ctx.fillText(text, x, ty + 1)
    }
  }

  /** Blackjack and baccarat: a wooden rim around the felt, cards on the felt while in use */
  private drawCardTable(ctx: CanvasRenderingContext2D, x: number, y: number, felt: string) {
    drawIsoShadow(ctx, this.ts, x, y, 0.85, 0.7)
    drawIsoBox(ctx, this.ts, x, y, { cols: 0.85, rows: 0.7, height: 10, color: WOOD })
    drawIsoBox(ctx, this.ts, x, y, {
      cols: 0.72,
      rows: 0.58,
      height: 0,
      elevation: 10,
      color: felt,
    })
    // the dealer's chip tray at the back
    drawIsoBox(ctx, this.ts, x, y - this.ts * 0.07, {
      cols: 0.3,
      rows: 0.1,
      height: 2,
      elevation: 10,
      color: '#d4af37',
    })
    if (this.properties.active) {
      ctx.fillStyle = '#fafafa'
      const dealt = 1 + (Math.floor(this.time) % 3)
      for (let i = 0; i < dealt; i++) ctx.fillRect(x - 10 + i * 7, y - 12, 5, 4)
    }
  }

  private drawCraps(ctx: CanvasRenderingContext2D, x: number, y: number) {
    drawIsoShadow(ctx, this.ts, x, y, 0.95, 0.75)
    drawIsoBox(ctx, this.ts, x, y, { cols: 0.95, rows: 0.75, height: 13, color: WOOD })
    drawIsoBox(ctx, this.ts, x, y, {
      cols: 0.82,
      rows: 0.62,
      height: 0,
      elevation: 13,
      color: FELT,
    })
    // the pass line
    drawIsoBox(ctx, this.ts, x, y, {
      cols: 0.6,
      rows: 0.04,
      height: 0,
      elevation: 13,
      color: '#fafafa',
    })
    if (this.properties.active) {
      // two dice tumbling across the felt
      const t = (this.time * 0.7) % 1
      for (let i = 0; i < 2; i++) {
        drawIsoBox(ctx, this.ts, x - 12 + t * 22 + i * 5, y - 13 + i * 3, {
          cols: 0.05,
          rows: 0.05,
          height: 3,
          elevation: 13,
          color: '#fafafa',
        })
      }
    }
  }

  private drawRoulette(ctx: CanvasRenderingContext2D, x: number, y: number) {
    this.drawCardTable(ctx, x, y, FELT)
    // the wheel sits at one end of the table, it only spins while in use
    const wx = x + this.ts * 0.14
    const wy = y + this.ts * 0.02
    drawIsoCylinder(ctx, this.ts, wx, wy, 0.15, 4, WOOD, 10)
    const [rx] = isoRadii(this.ts, 0.12)
    const angle = this.properties.active ? this.time * 4 : 0
    drawWheel(ctx, wx, wy - 14, rx, ROULETTE_COLORS, angle, true)
  }

  private drawPoker(ctx: CanvasRenderingContext2D, x: number, y: number) {
    drawIsoDisc(ctx, this.ts, x + 4, y + 2, 0.42, 'rgba(0,0,0,0.2)')
    // chairs around the table: the back ones first, the table, then the front ones
    const chair = (dCol: number, dRow: number) => {
      const cx = x + (dCol - dRow) * (this.ts / 2) * 0.42
      const cy = y + (dCol + dRow) * (this.ts / 4) * 0.42
      drawIsoCylinder(ctx, this.ts, cx, cy, 0.07, 9, '#3e2723')
    }
    chair(0, -1)
    chair(-1, 0)
    chair(1, 0)
    drawIsoCylinder(ctx, this.ts, x, y, 0.36, 10, WOOD)
    drawIsoDisc(ctx, this.ts, x, y, 0.29, FELT, 10)
    chair(0, 1)
    if (this.properties.active) {
      // chips in the pot
      for (let i = 0; i < 3; i++) {
        drawIsoCylinder(
          ctx,
          this.ts,
          x - 5 + i * 5,
          y,
          0.03,
          2 + i,
          ['#e53935', '#1e88e5', '#fafafa'][i],
          10,
        )
      }
    }
  }

  private drawMoneyWheel(ctx: CanvasRenderingContext2D, x: number, y: number) {
    drawIsoShadow(ctx, this.ts, x, y, 0.4, 0.3)
    drawIsoBox(ctx, this.ts, x, y, { cols: 0.4, rows: 0.3, height: 16, color: WOOD })
    drawIsoBox(ctx, this.ts, x, y, {
      cols: 0.08,
      rows: 0.08,
      height: 20,
      elevation: 16,
      color: '#d4af37',
    })
    const angle = this.time * (this.properties.active ? 3 : 0.3)
    const radius = this.ts * 0.32
    ctx.beginPath()
    ctx.arc(x, y - 36 - radius * 0.6, radius + 3, 0, Math.PI * 2)
    ctx.fillStyle = '#d4af37'
    ctx.fill()
    drawWheel(
      ctx,
      x,
      y - 36 - radius * 0.6,
      radius,
      [...MONEY_WHEEL_COLORS, ...MONEY_WHEEL_COLORS],
      angle,
      false,
    )
  }

  private drawPodium(ctx: CanvasRenderingContext2D, x: number, y: number) {
    drawIsoShadow(ctx, this.ts, x, y, 0.6, 0.4)
    drawIsoBox(ctx, this.ts, x, y, { cols: 0.6, rows: 0.4, height: 16, color: '#3e2723' })
    // a monitor
    drawIsoBox(ctx, this.ts, x, y, {
      cols: 0.2,
      rows: 0.04,
      height: 9,
      elevation: 16,
      color: '#263238',
    })
  }

  private drawCashier(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const counter = { cols: 1, rows: 0.7, height: 18, color: '#4e342e' }
    drawIsoBox(ctx, this.ts, x, y, counter)
    drawIsoBox(ctx, this.ts, x, y, {
      cols: 1,
      rows: 0.7,
      height: 2,
      elevation: 18,
      color: '#d4af37',
    })
    // glass above the counter
    ctx.globalAlpha = 0.35
    drawIsoBox(ctx, this.ts, x, y, {
      cols: 1,
      rows: 0.06,
      height: 18,
      elevation: 20,
      color: '#b3e5fc',
    })
    ctx.globalAlpha = 1
  }

  private drawBar(ctx: CanvasRenderingContext2D, x: number, y: number) {
    drawIsoBox(ctx, this.ts, x, y, { cols: 0.55, rows: 1, height: 18, color: '#4e342e' })
    drawIsoBox(ctx, this.ts, x, y, {
      cols: 0.6,
      rows: 1,
      height: 3,
      elevation: 18,
      color: '#8d6e63',
    })
    // bottles
    ;['#2e7d32', '#ffb300', '#c62828'].forEach((color, i) => {
      drawIsoCylinder(ctx, this.ts, x + 4, y - 6 + i * 6, 0.025, 9, color, 21)
    })
  }

  private drawStool(ctx: CanvasRenderingContext2D, x: number, y: number) {
    drawIsoCylinder(ctx, this.ts, x, y, 0.03, 12, '#424242')
    drawIsoCylinder(ctx, this.ts, x, y, 0.1, 3, '#b71c1c', 12)
  }

  private drawSofa(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const { color = '#6a1b9a' } = this.properties
    drawIsoShadow(ctx, this.ts, x, y, 0.8, 0.45)
    // the back rest is behind the seat
    drawIsoBox(ctx, this.ts, x, y - this.ts * 0.06, { cols: 0.8, rows: 0.12, height: 18, color })
    drawIsoBox(ctx, this.ts, x, y + this.ts * 0.02, {
      cols: 0.8,
      rows: 0.35,
      height: 8,
      color: shadeHex(color, 0.1),
    })
  }

  private drawLoungeTable(ctx: CanvasRenderingContext2D, x: number, y: number) {
    drawIsoDisc(ctx, this.ts, x + 3, y + 2, 0.2, 'rgba(0,0,0,0.2)')
    drawIsoCylinder(ctx, this.ts, x, y, 0.03, 9, '#424242')
    drawIsoCylinder(ctx, this.ts, x, y, 0.2, 2, '#d4af37', 9)
    drawIsoCylinder(ctx, this.ts, x - 3, y, 0.03, 6, '#e1f5fe', 11)
  }

  private drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number) {
    drawIsoShadow(ctx, this.ts, x, y, 0.3, 0.3)
    drawIsoBox(ctx, this.ts, x, y, { cols: 0.26, rows: 0.26, height: 11, color: '#bf6f3a' })
    const leaves: Array<[number, number, number, string]> = [
      [-5, -19, 8, '#2e7d32'],
      [5, -20, 8, '#388e3c'],
      [0, -27, 9, '#43a047'],
    ]
    for (const [dx, dy, r, color] of leaves) {
      ctx.beginPath()
      ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
    }
  }

  private drawAtm(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const box = { cols: 0.4, rows: 0.4, height: 30, color: '#455a64' }
    drawIsoShadow(ctx, this.ts, x, y, box.cols, box.rows)
    drawIsoBox(ctx, this.ts, x, y, box)
    const [, , front, left] = isoBoxTop(this.ts, x, y, box)
    drawFaceRect(ctx, left, front, 0.2, 0.8, 5, 13, '#4fc3f7')
    drawFaceRect(ctx, left, front, 0.3, 0.7, 17, 19, '#212121')
  }

  private drawDesk(ctx: CanvasRenderingContext2D, x: number, y: number) {
    drawIsoShadow(ctx, this.ts, x, y, 0.9, 0.55)
    drawIsoBox(ctx, this.ts, x, y, { cols: 0.9, rows: 0.55, height: 14, color: '#3e2723' })
    drawIsoBox(ctx, this.ts, x, y, {
      cols: 0.92,
      rows: 0.57,
      height: 2,
      elevation: 14,
      color: '#8d6e63',
    })
  }

  private drawPillar(ctx: CanvasRenderingContext2D, x: number, y: number) {
    drawIsoShadow(ctx, this.ts, x, y, 0.4, 0.4)
    drawIsoBox(ctx, this.ts, x, y, { cols: 0.4, rows: 0.4, height: 6, color: '#d4af37' })
    drawIsoBox(ctx, this.ts, x, y, {
      cols: 0.32,
      rows: 0.32,
      height: 48,
      elevation: 6,
      color: '#e8dfcc',
    })
    drawIsoBox(ctx, this.ts, x, y, {
      cols: 0.42,
      rows: 0.42,
      height: 5,
      elevation: 54,
      color: '#d4af37',
    })
  }
}
