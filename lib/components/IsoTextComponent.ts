import { AbstractGameComponent } from './AbstractGameComponent.ts'
import { degreeToRadian } from '../utils/mathutil.ts'

export interface IsoTextComponentProps extends GameComponentProperties {
  text: string
  font?: string
  color?: string
  direction?: CanvasDirection
  orientation?: 'vertical' | 'horizontal'
  skewOrientation?: 'upright' | 'flat'
  offset?: { x: number; y: number }
  //angle: number
}

export class IsoTextComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoTextComponentProps

  public static readonly defaultProperties: IsoTextComponentProps = {
    text: '',
    font: '12px Arial,Helvetica,sans-serif',
    color: 'rgba(238,238,238,1)',
    direction: 'ltr',
    orientation: 'vertical', // vertical | horizontal
    skewOrientation: 'flat', // upright | flat
    offset: { x: 0, y: 0 },
  }

  public readonly componentType: string = 'Text'

  constructor(properties: IsoTextComponentProps) {
    super({ ...IsoTextComponent.defaultProperties, ...properties })
  }

  draw(ctx: CanvasRenderingContext2D): void {
    //console.log('TextEntity.draw', this.properties)
    const x = this.x
    const y = this.y
    if (x === undefined || y === undefined) return

    const color = this.properties.color
    const text = this.properties.text
    const orientation = this.properties.orientation
    const font = this.properties.font

    //const angle = degreeToRadian(26.565)
    const angle = Math.atan(Math.sin(degreeToRadian(30)))
    const rotationAngle = orientation === 'vertical' ? -angle : angle
    let skewAngle = 0
    if (this.properties.skewOrientation === 'flat') {
      skewAngle = orientation === 'vertical' ? 0.75 : -0.75
    } else if (this.properties.skewOrientation === 'upright') {
      skewAngle = orientation === 'vertical' ? -angle : angle
    }

    //ctx.save()
    //ctx.direction = 'ltr'
    if (color) {
      ctx.fillStyle = color
    }
    if (font) {
      ctx.font = font
    }
    ctx.translate(x, y)
    ctx.rotate(rotationAngle)
    ctx.transform(1, 0, skewAngle, 1, 0, 0)
    //ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillText(text, 0, 0)
    // get text width
    //const textMetrics = ctx.measureText(text)
    //ctx.restore()

    //ctx.setTransform(1, 0.8, 0, 1, 0, 0)
    //ctx.transform(1, 0, 0, 1, 0, 0)
    //ctx.beginPath()
    //ctx.arc(0, 0, 20, 0, 2 * Math.PI)
    //ctx.closePath()
    //ctx.fill()
    ctx.restore()
  }

  update(deltaTime: number): void {}
}
