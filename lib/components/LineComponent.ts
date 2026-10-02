import type { Screen2DPosition, GameComponentProperties, IGameComponent } from '../game.types'
import { AbstractGameComponent } from './AbstractGameComponent'

export interface LineComponentProps extends GameComponentProperties {
  lineWidth: number
  lineDash?: number[]
  to: Screen2DPosition[]
  strokeColor?: string
  offset?: { x: number; y: number }
}

export class LineComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: LineComponentProps

  public static readonly defaultProperties: LineComponentProps = {
    lineWidth: 3,
    lineDash: [5, 1],
    to: [{ x: 0, y: 0 }],
    strokeColor: 'rgba(0,0,0,0)',
    offset: { x: 0, y: 0 },
  }

  public readonly componentType: string = 'Line'
  public readonly name: string

  private lastLineLength = 0

  constructor(properties: LineComponentProps) {
    super({
      ...LineComponent.defaultProperties,
      ...properties,
    })
    this.name = properties.name || 'LineEntity'
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const offsetX = this.properties.offset?.x || 0
    const offsetY = this.properties.offset?.y || 0
    const x = this.x
    const y = this.y
    if (x === undefined || y === undefined) return

    const width = this.properties.lineWidth
    const strokeColor = this.properties.strokeColor

    ctx.beginPath()
    ctx.moveTo(x + offsetX, y + offsetY)
    for (const to of this.properties.to) {
      if (to.x === undefined || to.y === undefined) continue
      ctx.lineTo(to.x + offsetX, to.y + offsetY)
    }
    ctx.lineWidth = width
    ctx.setLineDash([13, 5])
    if (strokeColor) {
      ctx.strokeStyle = strokeColor
      ctx.strokeStyle = 'rgba(42,169,186,0.7)'
    }
    ctx.stroke()
    if (this.lastLineLength > 24) {
      this.lastLineLength = 20
    }
  }

  update(deltaTime: number): void {}
}
