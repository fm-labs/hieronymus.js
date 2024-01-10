import { AbstractBaseEntity } from './AbstractBaseEntity.ts'
import { drawIsometricHexagon } from '../draw2d/drawiso.ts'

export class IsoHexagon extends AbstractBaseEntity implements IGameEntity {
  public static readonly defaultProperties: GameEntityProperties = {
    x: 0,
    y: 0,
    sideLength: 32,
    depth: 16,
    tileSize: 32,
  }
  constructor(properties?: GameEntityProperties) {
    properties = properties || {}
    super({ ...IsoHexagon.defaultProperties, ...properties })
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const x = this.properties.x
    const y = this.properties.y
    const sideLength = this.properties.sideLength
    const depth = this.properties.depth
    const tileSize = this.properties.tileSize

    const tileCenterY = y + tileSize / 2 / 2
    drawIsometricHexagon(ctx, x, tileCenterY, sideLength, depth)
  }

  update(deltaTime: number): void {}
}
