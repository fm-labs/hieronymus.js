import { AbstractBaseEntity } from './AbstractBaseEntity.ts'
import { drawIsometricCube } from '../draw2d/drawiso.ts'

export class IsoCube extends AbstractBaseEntity implements IGameEntity {
  public static readonly defaultProperties: GameEntityProperties = {
    x: 0,
    y: 0,
    width: 32,
    //height: 16,
    depth: 16,
    tileSize: 32,
    text: 'Cube',
  }
  constructor(properties?: GameEntityProperties) {
    properties = properties || {}
    super({ ...IsoCube.defaultProperties, ...properties })
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const x = this.properties.x
    const y = this.properties.y
    const text = this.properties.text

    const cubeWidth = this.properties.width
    //const cubeHeight = this.properties.height
    const cubeHeight = cubeWidth / 2
    const cubeDepth = this.properties.depth
    const tileSize = this.properties.tileSize

    // Define cube position
    const tileCenterY = y + tileSize / 2 / 2
    const cubeY = tileCenterY - cubeHeight / 2 - cubeDepth
    drawIsometricCube(ctx, x, cubeY, cubeWidth, cubeHeight, cubeDepth, text)
  }

  update(deltaTime: number): void {}
}
