import { AbstractBaseEntity } from './AbstractBaseEntity.ts'
import { degreeToRadian } from '../utils/mathutil.ts'

export class TextEntity extends AbstractBaseEntity implements IGameEntity {
  public static readonly defaultProperties: GameEntityProperties = {
    x: 0,
    y: 0,
    text: '',
    font: '12px Arial,Helvetica,sans-serif',
    color: 'yellow',
    direction: 'ltr',
    orientation: 'vertical', // vertical | horizontal
    angle: degreeToRadian(-25),
  }
  constructor(properties?: GameEntityProperties) {
    properties = properties || {}
    super({ ...TextEntity.defaultProperties, ...properties })
  }

  draw(ctx: CanvasRenderingContext2D): void {
    console.log('TextEntity.draw', this.properties)
    const x = this.properties.x
    const y = this.properties.y
    const color = this.properties.color
    const text = this.properties.text
    const orientation = this.properties.orientation
    const font = this.properties.font

    const angle = orientation === 'vertical' ? degreeToRadian(-25) : degreeToRadian(25)

    ctx.translate(x, y)
    ctx.direction = 'ltr'
    ctx.fillStyle = color
    ctx.font = font
    ctx.rotate(angle)
    ctx.fillText(text, 0, 0)
  }

  update(deltaTime: number): void {}
}
