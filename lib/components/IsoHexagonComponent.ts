import type { GameComponentProperties, IGameComponent } from '../game.types'
import { AbstractGameComponent } from './AbstractGameComponent'
import { drawIsometricHexagon } from '../draw2d/drawiso'

export interface IsoHexagonComponentProps extends GameComponentProperties {
  sideLength: number
  depth: number
  tileSize: number
}

export class IsoHexagonComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoHexagonComponentProps

  public static readonly defaultProperties: IsoHexagonComponentProps = {
    sideLength: 32,
    depth: 16,
    tileSize: 32,
  }

  public readonly componentType: string = 'IsoHexagon'

  constructor(properties: IsoHexagonComponentProps) {
    super({ ...IsoHexagonComponent.defaultProperties, ...properties })
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const x = this.x
    const y = this.y
    if (x === undefined || y === undefined) return

    const sideLength = this.properties.sideLength
    const depth = this.properties.depth
    const tileSize = this.properties.tileSize

    const tileCenterY = y + tileSize / 2 / 2
    drawIsometricHexagon(ctx, x, tileCenterY, sideLength, depth)
  }

  update(deltaTime: number): void {}
}
