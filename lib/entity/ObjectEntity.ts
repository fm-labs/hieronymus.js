import { AbstractBaseEntity } from './AbstractBaseEntity.ts'

export class ObjectEntity extends AbstractBaseEntity implements IGameEntity {
  public static readonly defaultProperties: GameEntityProperties = {
    x: 0,
    y: 0,
  }
  constructor(properties?: GameEntityProperties) {
    properties = properties || {}
    super({ ...ObjectEntity.defaultProperties, ...properties })
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const x = this.properties.x
    const y = this.properties.y

    // @TODO: draw the object

    ctx.save()
    ctx.restore()
  }

  update(deltaTime: number): void {}
}
