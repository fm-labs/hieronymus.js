import { AbstractGameComponent } from './AbstractGameComponent.ts'
import { degreeToRadian } from '../utils/mathutil.ts'

export interface TextComponentProps extends GameComponentProperties {
  text: string
  font?: string
  color?: string
  direction?: CanvasDirection
  orientation?: 'vertical' | 'horizontal'
  inverse?: boolean
  angle?: number // custom angle in degrees
}

export class TextComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: TextComponentProps

  public static readonly defaultProperties: TextComponentProps = {
    text: '',
    font: '12px Arial,Helvetica,sans-serif',
    color: 'rgba(238,238,238,1)',
    direction: 'ltr',
    orientation: 'vertical', // vertical | horizontal
    inverse: false,
    angle: 0,
  }

  public readonly componentType: string = 'Text'

  constructor(properties: TextComponentProps) {
    super({ ...TextComponent.defaultProperties, ...properties })
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

    let angle = this.properties.angle || 0
    if (angle === 0) {
      angle = orientation === 'vertical' ? 90 : 0
      if (this.properties.inverse) {
        angle = -angle
      }
    }

    // let skewAngle = 0
    // if (this.properties.skewOrientation === 'flat') {
    //   skewAngle = orientation === 'vertical' ? 0.75 : -0.75
    // } else if (this.properties.skewOrientation === 'upright') {
    //   skewAngle = orientation === 'vertical' ? -angle : angle
    // }

    ctx.save()
    //ctx.direction = 'ltr'
    ctx.translate(x, y)
    // orientation / rotation
    ctx.rotate(degreeToRadian(angle))

    // skew
    //ctx.transform(1, 0, skewAngle, 1, 0, 0)
    //ctx.setTransform(1, 0, 0, 1, 0, 0)

    // text
    if (color) {
      ctx.fillStyle = color
    }
    if (font) {
      ctx.font = font
    }
    ctx.fillText(text, 0, 0)

    ctx.restore()
  }

  update(deltaTime: number): void {}
}
