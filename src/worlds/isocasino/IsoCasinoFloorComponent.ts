import type { GameComponentProperties, IGameComponent } from '../../../lib/game.types'
import { AbstractGameComponent } from '../../../lib'
import { isoOffset } from '../isocity/isocity.draw.ts'
import type { FloorStyle } from './isocasino.floor.ts'

export interface IsoCasinoFloorComponentProps extends GameComponentProperties {
  tileSize: number
  style: FloorStyle
  /** Base color and accent color */
  colors: [string, string]
  col: number
  row: number
}

/**
 * A floor tile: patterned carpet, two-tone felt, marble or wooden planks.
 * The position is the top corner of the cell.
 */
export class IsoCasinoFloorComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoCasinoFloorComponentProps

  public static readonly defaultProperties: IsoCasinoFloorComponentProps = {
    tileSize: 64,
    style: 'carpet',
    colors: ['#7b1f2b', '#c9a227'],
    col: 0,
    row: 0,
  }

  public readonly componentType: string = 'IsoCasinoFloor'

  constructor(properties: Partial<IsoCasinoFloorComponentProps>) {
    super({ ...IsoCasinoFloorComponent.defaultProperties, ...properties })
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { tileSize, style, colors, col, row } = this.properties
    const [base, accent] = colors
    // a point on the cell, in cell units from its top corner
    const at = (c: number, r: number): [number, number] => {
      const [dx, dy] = isoOffset(tileSize, c, r)
      return [this.x + dx, this.y + dy]
    }
    const diamond = (c0: number, r0: number, c1: number, r1: number, fill: string) => {
      ctx.beginPath()
      ctx.moveTo(...at(c0, r0))
      ctx.lineTo(...at(c1, r0))
      ctx.lineTo(...at(c1, r1))
      ctx.lineTo(...at(c0, r1))
      ctx.closePath()
      ctx.fillStyle = fill
      ctx.fill()
    }

    const checker = (col + row) % 2 === 0
    diamond(0, 0, 1, 1, style === 'felt' || style === 'marble' ? (checker ? base : accent) : base)

    if (style === 'carpet') {
      // a small accent diamond in every cell, a hollow one on every other cell
      ctx.globalAlpha = 0.55
      diamond(0.4, 0.4, 0.6, 0.6, accent)
      if (checker) {
        ctx.globalAlpha = 0.35
        ctx.strokeStyle = accent
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(...at(0.22, 0.22))
        ctx.lineTo(...at(0.78, 0.22))
        ctx.lineTo(...at(0.78, 0.78))
        ctx.lineTo(...at(0.22, 0.78))
        ctx.closePath()
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    } else if (style === 'marble') {
      // a faint vein
      ctx.strokeStyle = 'rgba(120,110,95,0.25)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(...at(0.15, 0.7))
      ctx.quadraticCurveTo(...at(0.5, 0.45), ...at(0.85, 0.35))
      ctx.stroke()
    } else if (style === 'wood') {
      // planks along the rows
      ctx.strokeStyle = accent
      ctx.lineWidth = 1
      for (const t of [0.25, 0.5, 0.75]) {
        ctx.beginPath()
        ctx.moveTo(...at(t, 0))
        ctx.lineTo(...at(t, 1))
        ctx.stroke()
      }
    }
  }
}
