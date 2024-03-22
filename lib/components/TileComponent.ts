import { AbstractGameComponent } from './AbstractGameComponent.ts'

export interface TileComponentProps extends GameComponentProperties {
  width: number
  height: number
  color?: string
  backgroundColor?: string
  borderColor?: string
  text?: string
}

export class TileComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: TileComponentProps

  public static readonly defaultProperties: TileComponentProps = {
    x: 0,
    y: 0,
    width: 32,
    height: 32,
    // visible: true,
    // opacity: 1,
    // rotation: 0,
    // scaleX: 1,
    // scaleY: 1,
    // anchorX: 0,
    // anchorY: 0,
    color: 'rgba(0,0,0,0)',
    backgroundColor: 'rgba(0,0,0,0)',
    borderColor: 'rgba(0,0,0,0)',
    // borderWidth: 0,
    // borderRadius: 0,
    // shadowColor: 'rgba(0,0,0,0)',
    // shadowBlur: 0,
    // shadowOffsetX: 0,
    // shadowOffsetY: 0,
    // image: null,
    text: undefined,
    // font: null,
    // audio: null,
    // video: null,
    // children: [],
  }

  public readonly name: string

  constructor(properties: TileComponentProps) {
    super({
      ...TileComponent.defaultProperties,
      ...properties,
    })
    this.name = properties.name || 'TileEntity'
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const x = this.properties.x
    const y = this.properties.y
    if (x === undefined || y === undefined) return

    const width = this.properties.width
    const height = this.properties.height
    const fillColor = this.properties.backgroundColor
    const strokeColor = this.properties.borderColor
    const text = this.properties.text
    const textColor = this.properties.color

    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + width / 2, y + height / 2)
    ctx.lineTo(x, y + height)
    ctx.lineTo(x - width / 2, y + height / 2)
    ctx.closePath()

    // Fill the tile with a color
    if (fillColor) {
      ctx.fillStyle = fillColor
      ctx.fill()
    }

    // Stroke the tile with a border
    //ctx.strokeStyle = strokeColor
    //ctx.stroke()

    //ctx.fillStyle = 'rgba(255,0,0,0.92)'
    //ctx.fillText(`${x},${y}`, x, y)

    if (text) {
      if (textColor) {
        ctx.fillStyle = textColor
      }
      ctx.fillText(text, x - 10, y + height / 2)
    }
  }

  update(deltaTime: number): void {}
}
