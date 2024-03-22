import { AbstractGameComponent } from './AbstractGameComponent.ts'
import { drawIsometricCube } from '../draw2d/drawiso.ts'

interface IsoCubeProps extends GameComponentProperties {
  width: number
  depth: number
  tileSize: number
  text?: string
}

export class IsoCubeComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoCubeProps

  public static readonly defaultProperties: IsoCubeProps = {
    x: 0,
    y: 0,
    width: 32,
    depth: 16,
    tileSize: 32,
    text: undefined,
  }

  constructor(properties: IsoCubeProps) {
    super({ ...IsoCubeComponent.defaultProperties, ...properties })
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const x = this.properties.x
    const y = this.properties.y
    if (x === undefined || y === undefined) return

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
