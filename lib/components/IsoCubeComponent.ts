import { AbstractGameComponent } from './AbstractGameComponent.ts'
import { drawIsometricCube } from '../draw2d/drawiso.ts'
import { drawElevation } from '../draw2d/drawelevation.ts'

export interface IsoCubeComponentProps extends GameComponentProperties {
  tileSize: number
  width: number
  depth: number
  elevation?: number
  text?: string
}

export class IsoCubeComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoCubeComponentProps

  public static readonly defaultProperties: IsoCubeComponentProps = {
    tileSize: 0,
    width: 32,
    depth: 16,
    elevation: 0,
    text: undefined,
  }

  public readonly componentType: string = 'IsoCube'

  constructor(properties: IsoCubeComponentProps) {
    super({ ...IsoCubeComponent.defaultProperties, ...properties })
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const x = this.x
    const y = this.y
    if (x === undefined || y === undefined) return

    const text = this.properties.text

    const cubeWidth = this.properties.width
    //const cubeHeight = this.properties.height
    const cubeHeight = cubeWidth / 2
    const cubeDepth = this.properties.depth
    const tileSize = this.properties.tileSize

    // Define cube position

    const centerX = x
    const centerY = y + tileSize / 2 / 2

    // Elevation adjustment
    const elevation = this.properties.elevation || 0
    drawElevation(ctx, elevation, centerX, centerY)

    const cubeY = centerY - cubeHeight / 2 - cubeDepth - elevation

    // Translate to center of shape
    ctx.save()
    ctx.translate(centerX, cubeY)
    drawIsometricCube(ctx, 0, 0, cubeWidth, cubeHeight, cubeDepth, text)
    ctx.restore()
  }

  update(deltaTime: number): void {}
}
