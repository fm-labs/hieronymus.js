import { AbstractGameComponent } from './AbstractGameComponent.ts'
import { degreeToRadian } from '../utils/mathutil.ts'

interface TextComponentProps extends GameComponentProperties {
  text: string
  font?: string
  color?: string
  direction?: CanvasDirection
  orientation?: 'vertical' | 'horizontal'
  skewOrientation?: 'upright' | 'flat'
  //angle: number
}

export class TextComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: TextComponentProps

  public static readonly defaultProperties: TextComponentProps = {
    x: 0,
    y: 0,
    text: '',
    font: '12px Arial,Helvetica,sans-serif',
    color: 'black',
    direction: 'ltr',
    orientation: 'vertical', // vertical | horizontal
    skewOrientation: 'flat', // upright | flat
  }
  constructor(properties: TextComponentProps) {
    super({ ...TextComponent.defaultProperties, ...properties })
  }

  draw(ctx: CanvasRenderingContext2D): void {
    //console.log('TextEntity.draw', this.properties)
    const x = this.properties.x
    const y = this.properties.y
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
    } else {
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
    //ctx.restore()

    //ctx.setTransform(1, 0.8, 0, 1, 0, 0)
    //ctx.transform(1, 0, 0, 1, 0, 0)
    //ctx.beginPath()
    //ctx.arc(0, 0, 20, 0, 2 * Math.PI)
    //ctx.closePath()
    //ctx.fill()
    //ctx.restore()
  }

  update(deltaTime: number): void {}
}
