import type { GameComponentProperties, IGameComponent } from '@fmlabs/world'
import { AbstractGameComponent } from '@fmlabs/world'

export interface IsoSnakeBoardComponentProps extends GameComponentProperties {
  columns: number
  rows: number
  tileSize: number
  thickness?: number
  colorA?: string
  colorB?: string
  sideColor?: string
}

/**
 * The playing field as an isometric slab: a checkerboard of tile diamonds on top of a raised block.
 * The position is the top corner of cell (0, 0).
 */
export class IsoSnakeBoardComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoSnakeBoardComponentProps

  public static readonly defaultProperties: IsoSnakeBoardComponentProps = {
    columns: 16,
    rows: 16,
    tileSize: 64,
    thickness: 16,
    colorA: '#2e4a2e',
    colorB: '#355735',
    sideColor: '#5d4037',
  }

  public readonly componentType: string = 'IsoSnakeBoard'

  constructor(properties: Partial<IsoSnakeBoardComponentProps>) {
    super({ ...IsoSnakeBoardComponent.defaultProperties, ...properties })
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const { columns, rows, tileSize, thickness, colorA, colorB, sideColor } = this.properties
    const hw = tileSize / 2
    const hh = tileSize / 4
    const toScreen = (col: number, row: number): [number, number] => [
      this.x + (col - row) * hw,
      this.y + (col + row) * hh,
    ]

    // slab sides below the front edges
    const left = toScreen(0, rows)
    const front = toScreen(columns, rows)
    const right = toScreen(columns, 0)
    const t = thickness!
    ctx.fillStyle = sideColor!
    ctx.beginPath()
    ctx.moveTo(left[0], left[1])
    ctx.lineTo(front[0], front[1])
    ctx.lineTo(right[0], right[1])
    ctx.lineTo(right[0], right[1] + t)
    ctx.lineTo(front[0], front[1] + t)
    ctx.lineTo(left[0], left[1] + t)
    ctx.closePath()
    ctx.fill()
    // darken the right side
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.beginPath()
    ctx.moveTo(front[0], front[1])
    ctx.lineTo(right[0], right[1])
    ctx.lineTo(right[0], right[1] + t)
    ctx.lineTo(front[0], front[1] + t)
    ctx.closePath()
    ctx.fill()

    // checkerboard top
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const [x, y] = toScreen(col, row)
        ctx.fillStyle = (row + col) % 2 === 0 ? colorA! : colorB!
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + hw, y + hh)
        ctx.lineTo(x, y + hh * 2)
        ctx.lineTo(x - hw, y + hh)
        ctx.closePath()
        ctx.fill()
      }
    }
  }

  update(deltaTime: number): void {}
}
