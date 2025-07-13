import { AbstractGameComponent } from './AbstractGameComponent.ts'
import { drawIsometricHexagon } from '../draw2d/drawiso.ts'

interface IsoHexagonProps extends GameComponentProperties {
  sideLength: number
  depth: number
  tileSize: number
}

export class IsoHexagonComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoHexagonProps

  public static readonly defaultProperties: IsoHexagonProps = {
    x: 0,
    y: 0,
    sideLength: 32,
    depth: 16,
    tileSize: 32,
  }

  public readonly componentType: string = 'IsoHexagon'

  constructor(properties: IsoHexagonProps) {
    super({ ...IsoHexagonComponent.defaultProperties, ...properties })
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const x = this.properties.x
    const y = this.properties.y
    if (x === undefined || y === undefined) return

    const sideLength = this.properties.sideLength
    const depth = this.properties.depth
    const tileSize = this.properties.tileSize

    const tileCenterY = y + tileSize / 2 / 2
    drawIsometricHexagon(ctx, x, tileCenterY, sideLength, depth)
  }

  update(deltaTime: number): void {}
}
