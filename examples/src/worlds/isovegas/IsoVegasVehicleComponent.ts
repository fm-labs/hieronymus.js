import type { GameComponentProperties, IGameComponent } from '@fmlabs/world'
import { AbstractGameComponent } from '@fmlabs/world'
import { DIRECTION_VECTORS, type Direction } from '../isocity/isocity.traffic.ts'
import { IsoPainter, isoOffset } from './isovegas.draw.ts'
import type { VegasScene } from './isovegas.map.ts'

export type VegasVehicleKind = 'car' | 'taxi' | 'limo' | 'bus'

export interface IsoVegasVehicleComponentProps extends GameComponentProperties {
  tileSize: number
  kind: VegasVehicleKind
  color: string
  direction: Direction
  scene: VegasScene
}

const SIZES: Record<VegasVehicleKind, { length: number; width: number; height: number }> = {
  car: { length: 0.34, width: 0.2, height: 6 },
  taxi: { length: 0.34, width: 0.2, height: 6 },
  limo: { length: 0.62, width: 0.2, height: 6 },
  bus: { length: 0.62, width: 0.24, height: 22 },
}

/**
 * A car, a taxi, a stretch limo or a double-decker bus, with headlights at night.
 * The position is the top corner of a cell centered on the vehicle.
 */
export class IsoVegasVehicleComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoVegasVehicleComponentProps

  public readonly componentType: string = 'IsoVegasVehicle'

  constructor(properties: IsoVegasVehicleComponentProps) {
    super(properties)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { tileSize, kind, color, direction, scene } = this.properties
    const p = new IsoPainter(ctx, tileSize, scene.night)
    const x = this.x
    const y = this.y + tileSize / 4
    const { length, width, height } = SIZES[kind]
    const v = DIRECTION_VECTORS[direction]
    const alongCols = v.col !== 0
    const cols = alongCols ? length : width
    const rows = alongCols ? width : length

    // headlights shine on the road ahead
    if (scene.night > 0) {
      const [hx, hy] = isoOffset(tileSize, v.col * (length / 2 + 0.2), v.row * (length / 2 + 0.2))
      p.light(x + hx, y + hy, 16, 'rgba(255,240,190,1)', scene.night * 0.5)
    }
    p.shadow(x, y, cols, rows)
    p.box(x, y, { cols, rows, height, color })

    if (kind === 'bus') {
      for (const elevation of [5, 14]) {
        p.box(x, y, {
          cols: cols + 0.005,
          rows: rows + 0.005,
          height: 4,
          elevation,
          color: '#263238',
        })
      }
      p.box(x, y, { cols, rows, height: 1, elevation: height, color: '#fafafa' })
    } else {
      // the cabin, a bit behind the middle
      const [dx, dy] = isoOffset(tileSize, -v.col * 0.04, -v.row * 0.04)
      p.box(x + dx, y + dy, {
        cols: cols * (alongCols ? 0.55 : 0.85),
        rows: rows * (alongCols ? 0.85 : 0.55),
        height: 4,
        elevation: height,
        color: kind === 'limo' ? '#37474f' : '#b3e5fc',
      })
      if (kind === 'taxi') {
        p.box(x + dx, y + dy, {
          cols: 0.06,
          rows: 0.06,
          height: 3,
          elevation: height + 4,
          color: '#fafafa',
        })
      }
    }

    if (scene.night > 0) {
      const [fx, fy] = isoOffset(tileSize, (v.col * length) / 2, (v.row * length) / 2)
      const [bx, by] = isoOffset(tileSize, (-v.col * length) / 2, (-v.row * length) / 2)
      ctx.globalAlpha = scene.night
      ctx.fillStyle = '#fff6d0'
      ctx.beginPath()
      ctx.arc(x + fx, y + fy - 3, 1.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ff3030'
      ctx.beginPath()
      ctx.arc(x + bx, y + by - 3, 1.4, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
  }
}
