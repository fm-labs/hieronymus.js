import type { GameComponentProperties, IGameComponent } from '@fmlabs/hieronymus'
import { AbstractGameComponent } from '@fmlabs/hieronymus'
import { drawIsoBox, drawIsoShadow } from './isocity.draw.ts'
import type { Direction } from './isocity.traffic.ts'

export interface IsoCityVehicleComponentProps extends GameComponentProperties {
  tileSize: number
  kind: 'car' | 'bus'
  color: string
  direction: Direction
}

/**
 * A car or bus. The position is the top corner of the cell the vehicle would occupy
 * if that cell was centered on it, so vehicles are depth-sorted like the buildings.
 */
export class IsoCityVehicleComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoCityVehicleComponentProps

  public static readonly defaultProperties: IsoCityVehicleComponentProps = {
    tileSize: 64,
    kind: 'car',
    color: '#e53935',
    direction: 'E',
  }

  public readonly componentType: string = 'IsoCityVehicle'

  constructor(properties: Partial<IsoCityVehicleComponentProps>) {
    super({ ...IsoCityVehicleComponent.defaultProperties, ...properties })
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { tileSize, kind, color, direction } = this.properties
    const x = this.x
    const y = this.y + tileSize / 4

    const length = kind === 'bus' ? 0.62 : 0.36
    const width = kind === 'bus' ? 0.22 : 0.2
    const height = kind === 'bus' ? 14 : 6
    const alongCols = direction === 'E' || direction === 'W'
    const cols = alongCols ? length : width
    const rows = alongCols ? width : length

    drawIsoShadow(ctx, tileSize, x, y, cols, rows)
    drawIsoBox(ctx, tileSize, x, y, { cols, rows, height, color })
    if (kind === 'bus') {
      // a band of windows all around, and a lighter roof
      drawIsoBox(ctx, tileSize, x, y, {
        cols: cols + 0.005,
        rows: rows + 0.005,
        height: 4,
        elevation: height - 7,
        color: '#263238',
      })
      drawIsoBox(ctx, tileSize, x, y, {
        cols,
        rows,
        height: 1,
        elevation: height,
        color: '#fafafa',
      })
    } else {
      // the cabin, a bit behind the middle of the car
      const v = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }[direction]
      const [dx, dy] = [(v[0] - v[1]) * -0.03 * tileSize, (v[0] + v[1]) * -0.015 * tileSize]
      drawIsoBox(ctx, tileSize, x + dx, y + dy, {
        cols: cols * (alongCols ? 0.55 : 0.85),
        rows: rows * (alongCols ? 0.85 : 0.55),
        height: 5,
        elevation: height,
        color: '#b3e5fc',
      })
    }
  }
}
