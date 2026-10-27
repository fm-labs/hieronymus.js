import type { GameComponentProperties, IGameComponent } from '@fmlabs/world'
import { AbstractGameComponent } from '@fmlabs/world'

export interface SnakeBoardComponentProps extends GameComponentProperties {
  columns: number
  rows: number
  tileSize: number
  colorA?: string
  colorB?: string
  borderColor?: string
}

/**
 * The playing field: a checkerboard with a border, drawn from its top-left corner.
 */
export class SnakeBoardComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: SnakeBoardComponentProps

  public static readonly defaultProperties: SnakeBoardComponentProps = {
    columns: 20,
    rows: 20,
    tileSize: 32,
    colorA: '#1b2a1b',
    colorB: '#213321',
    borderColor: '#8bc34a',
  }

  public readonly componentType: string = 'SnakeBoard'

  constructor(properties: Partial<SnakeBoardComponentProps>) {
    super({ ...SnakeBoardComponent.defaultProperties, ...properties })
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const { columns, rows, tileSize, colorA, colorB, borderColor } = this.properties

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        ctx.fillStyle = (row + col) % 2 === 0 ? colorA! : colorB!
        ctx.fillRect(this.x + col * tileSize, this.y + row * tileSize, tileSize, tileSize)
      }
    }

    ctx.strokeStyle = borderColor!
    ctx.lineWidth = 4
    ctx.strokeRect(this.x - 2, this.y - 2, columns * tileSize + 4, rows * tileSize + 4)
  }

  update(deltaTime: number): void {}
}
