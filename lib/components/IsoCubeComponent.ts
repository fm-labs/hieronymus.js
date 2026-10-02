import type { GameComponentProperties, IGameComponent } from '../game.types'
import { AbstractGameComponent } from './AbstractGameComponent'
import { drawIsometricCube } from '../draw2d/drawiso'
import { drawElevation } from '../draw2d/drawelevation'

export interface IsoCubeComponentProps extends GameComponentProperties {
  tileSize: number
  width: number
  depth: number
  elevation?: number
  text?: string
  offset?: { x: number; y: number }
  lineDash?: number[]
}

export class IsoCubeComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoCubeComponentProps

  public static readonly defaultProperties: IsoCubeComponentProps = {
    tileSize: 0,
    width: 32,
    depth: 16,
    elevation: 0,
    text: undefined,
    offset: { x: 0, y: 0 },
    lineDash: [4, 0],
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

    const offset = this.properties.offset || { x: 0, y: 0 }
    const centerX = x + offset.x
    const centerY = y + tileSize / 2 / 2 + offset.y

    // Elevation adjustment
    const elevation = this.properties.elevation || 0
    drawElevation(ctx, elevation, centerX, centerY)

    const cubeY = centerY - cubeHeight / 2 - cubeDepth - elevation

    // Translate to center of shape
    ctx.save()
    ctx.translate(centerX, cubeY)
    drawIsometricCube(ctx, 0, 0, cubeWidth, cubeHeight, cubeDepth, text, this.properties.lineDash)
    ctx.restore()
  }

  update(deltaTime: number): void {}
}
