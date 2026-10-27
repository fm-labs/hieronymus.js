import type { GameComponentProperties, IGameComponent } from '@fmlabs/world'
import { AbstractGameComponent } from '@fmlabs/world'
import { isoOffset } from './isocity.draw.ts'
import type { Direction } from './isocity.traffic.ts'

export interface IsoCityRoadComponentProps extends GameComponentProperties {
  tileSize: number
  /** The neighbors this road connects to */
  connections: Direction[]
  color?: string
  sidewalkColor?: string
  markingColor?: string
}

/**
 * A road tile: asphalt with a sidewalk on the sides without a connection,
 * dashed center lines on straight roads and crosswalks at junctions.
 * The position is the top corner of the cell.
 */
export class IsoCityRoadComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoCityRoadComponentProps

  public static readonly defaultProperties: IsoCityRoadComponentProps = {
    tileSize: 64,
    connections: [],
    color: '#55595e',
    sidewalkColor: '#b9b4aa',
    markingColor: '#f5f1e6',
  }

  public readonly componentType: string = 'IsoCityRoad'

  constructor(properties: Partial<IsoCityRoadComponentProps>) {
    super({ ...IsoCityRoadComponent.defaultProperties, ...properties })
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { tileSize, connections, color, sidewalkColor, markingColor } = this.properties
    const has = (d: Direction) => connections.includes(d)
    // a point on the cell, in cell units from its top corner (0..1 along columns and rows)
    const at = (col: number, row: number): [number, number] => {
      const [dx, dy] = isoOffset(tileSize, col, row)
      return [this.x + dx, this.y + dy]
    }
    const quad = (points: Array<[number, number]>, fill: string) => {
      ctx.beginPath()
      ctx.moveTo(...at(...points[0]))
      points.slice(1).forEach((p) => ctx.lineTo(...at(...p)))
      ctx.closePath()
      ctx.fillStyle = fill
      ctx.fill()
    }

    // sidewalk below, asphalt inset on the sides without a connection
    const s = 0.14
    quad(
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ],
      sidewalkColor!,
    )
    const c0 = has('W') ? 0 : s
    const c1 = has('E') ? 1 : 1 - s
    const r0 = has('N') ? 0 : s
    const r1 = has('S') ? 1 : 1 - s
    quad(
      [
        [c0, r0],
        [c1, r0],
        [c1, r1],
        [c0, r1],
      ],
      color!,
    )

    ctx.strokeStyle = markingColor!
    const straightEW = has('E') && has('W') && !has('N') && !has('S')
    const straightNS = has('N') && has('S') && !has('E') && !has('W')
    if (straightEW || straightNS) {
      // dashed center line
      ctx.lineWidth = 1.5
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(...(straightEW ? at(0, 0.5) : at(0.5, 0)))
      ctx.lineTo(...(straightEW ? at(1, 0.5) : at(0.5, 1)))
      ctx.stroke()
      ctx.setLineDash([])
    } else if (connections.length >= 3) {
      // crosswalk stripes at each connected side
      ctx.lineWidth = 2
      for (const d of connections) {
        for (let i = 0; i < 4; i++) {
          const t = 0.25 + i * 0.17
          const [a, b]: Array<[number, number]> =
            d === 'N'
              ? [
                  [t, 0.04],
                  [t, 0.14],
                ]
              : d === 'S'
                ? [
                    [t, 0.86],
                    [t, 0.96],
                  ]
                : d === 'W'
                  ? [
                      [0.04, t],
                      [0.14, t],
                    ]
                  : [
                      [0.86, t],
                      [0.96, t],
                    ]
          ctx.beginPath()
          ctx.moveTo(...at(...a))
          ctx.lineTo(...at(...b))
          ctx.stroke()
        }
      }
    }
  }
}
