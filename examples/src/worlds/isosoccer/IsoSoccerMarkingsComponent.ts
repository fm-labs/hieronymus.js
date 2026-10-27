import type { GameComponentProperties, IGameComponent } from '@fmlabs/world'
import { AbstractGameComponent } from '@fmlabs/world'
import { cellPoint, strokeLine } from './isosoccer.draw.ts'
import { PITCH_LENGTH as L, PITCH_WIDTH as W } from './isosoccer.match.ts'

export interface IsoSoccerMarkingsComponentProps extends GameComponentProperties {
  tileSize: number
  /** Grid cell of the pitch corner (0, 0) */
  originCol: number
  originRow: number
}

// in pitch cells; the pitch is about 3.2 m per cell
const CENTER_CIRCLE = 2.9
const BOX_DEPTH = 5.2
const BOX_WIDTH = 12.6
const SIX_DEPTH = 1.7
const SIX_WIDTH = 5.7
const PENALTY_SPOT = 3.4

/**
 * All the white lines of the pitch, in one component placed at the top corner of grid cell (0, 0).
 * It lives in a layer between the ground and the depth-sorted layers, so it is drawn on the grass and below
 * everything standing on it.
 */
export class IsoSoccerMarkingsComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoSoccerMarkingsComponentProps

  public readonly componentType: string = 'IsoSoccerMarkings'

  constructor(properties: IsoSoccerMarkingsComponentProps) {
    super(properties)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { tileSize, originCol, originRow } = this.properties
    const at = (x: number, y: number) =>
      cellPoint(tileSize, this.x, this.y, originCol + x, originRow + y)
    const color = 'rgba(255,255,255,0.85)'
    const width = Math.max(1, tileSize / 32)
    const line = (points: Array<[number, number]>) =>
      strokeLine(
        ctx,
        points.map(([x, y]) => at(x, y)),
        color,
        width,
      )
    const rect = (x0: number, y0: number, x1: number, y1: number) =>
      line([
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
        [x0, y0],
      ])
    const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => {
      const points: Array<[number, number]> = []
      for (let i = 0; i <= 40; i++) {
        const a = a0 + ((a1 - a0) * i) / 40
        points.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
      }
      line(points)
    }
    const spot = (x: number, y: number) => {
      const [sx, sy] = at(x, y)
      ctx.beginPath()
      ctx.ellipse(sx, sy, width * 1.6, width * 0.8, 0, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
    }

    ctx.lineJoin = 'round'
    rect(0, 0, L, W)
    line([
      [L / 2, 0],
      [L / 2, W],
    ])
    arc(L / 2, W / 2, CENTER_CIRCLE, 0, Math.PI * 2)
    spot(L / 2, W / 2)

    for (const end of [0, 1]) {
      // mirror the near end for the far one
      const x = (v: number) => (end === 0 ? v : L - v)
      rect(x(0), (W - BOX_WIDTH) / 2, x(BOX_DEPTH), (W + BOX_WIDTH) / 2)
      rect(x(0), (W - SIX_WIDTH) / 2, x(SIX_DEPTH), (W + SIX_WIDTH) / 2)
      spot(x(PENALTY_SPOT), W / 2)
      // the part of the circle around the penalty spot that is outside the box
      const open = Math.acos((BOX_DEPTH - PENALTY_SPOT) / CENTER_CIRCLE)
      const facing = end === 0 ? 0 : Math.PI
      arc(x(PENALTY_SPOT), W / 2, CENTER_CIRCLE, facing - open, facing + open)
    }

    // corner arcs
    arc(0, 0, 0.35, 0, Math.PI / 2)
    arc(L, 0, 0.35, Math.PI / 2, Math.PI)
    arc(L, W, 0.35, Math.PI, Math.PI * 1.5)
    arc(0, W, 0.35, Math.PI * 1.5, Math.PI * 2)
  }
}
