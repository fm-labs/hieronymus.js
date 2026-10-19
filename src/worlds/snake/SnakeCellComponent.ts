import type {
  GameComponentProperties,
  IGameComponent,
  MoveDirection,
} from '../../../lib/game.types'
import { AbstractGameComponent } from '../../../lib'

export interface SnakeCellComponentProps extends GameComponentProperties {
  size: number
  kind: 'head' | 'body' | 'food'
  color?: string
  direction?: MoveDirection // head only, used to place the eyes
}

/**
 * A single square cell of the snake (or the food), drawn at its top-left corner
 * as placed by the orthogonal grid projection.
 */
export class SnakeCellComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: SnakeCellComponentProps

  public static readonly defaultProperties: SnakeCellComponentProps = {
    size: 32,
    kind: 'body',
    color: '#4caf50',
    direction: 'right',
  }

  public readonly componentType: string = 'SnakeCell'

  constructor(properties: Partial<SnakeCellComponentProps>) {
    super({ ...SnakeCellComponent.defaultProperties, ...properties })
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const { size, kind, color } = this.properties
    const pad = Math.max(1, Math.round(size * 0.06))

    ctx.fillStyle = color || '#4caf50'
    if (kind === 'food') {
      ctx.beginPath()
      ctx.arc(this.x + size / 2, this.y + size / 2, size / 2 - pad * 2, 0, Math.PI * 2)
      ctx.fill()
      return
    }

    ctx.beginPath()
    ctx.roundRect(this.x + pad, this.y + pad, size - pad * 2, size - pad * 2, size * 0.2)
    ctx.fill()

    if (kind === 'head') this.drawEyes(ctx)
  }

  private drawEyes(ctx: CanvasRenderingContext2D) {
    const { size, direction } = this.properties
    const cx = this.x + size / 2
    const cy = this.y + size / 2
    const forward = size * 0.18
    const side = size * 0.2
    const radius = Math.max(1.5, size * 0.08)

    let eyes: [number, number][]
    switch (direction) {
      case 'up':
        eyes = [
          [cx - side, cy - forward],
          [cx + side, cy - forward],
        ]
        break
      case 'down':
        eyes = [
          [cx - side, cy + forward],
          [cx + side, cy + forward],
        ]
        break
      case 'left':
        eyes = [
          [cx - forward, cy - side],
          [cx - forward, cy + side],
        ]
        break
      default:
        eyes = [
          [cx + forward, cy - side],
          [cx + forward, cy + side],
        ]
    }

    ctx.fillStyle = '#111'
    for (const [ex, ey] of eyes) {
      ctx.beginPath()
      ctx.arc(ex, ey, radius, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  update(deltaTime: number): void {}
}
