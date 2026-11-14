import type { GameComponentProperties, IGameComponent } from '@fmlabs/hieronimo'
import { AbstractGameComponent } from '@fmlabs/hieronimo'
import { cellPoint, fillPolygon, heightPx, strokeLine } from './isosoccer.draw.ts'
import { CROSSBAR } from './isosoccer.match.ts'

export interface IsoSoccerGoalComponentProps extends GameComponentProperties {
  tileSize: number
  /** 0: the goal at the small columns (x = 0), 1: the one at the large columns */
  end: 0 | 1
  /** Which cell of the goal mouth, 0 at the small rows */
  segment: number
  segments: number
}

/**
 * One cell-wide slice of a goal: crossbar, net, and a post at either side.
 * Goals are split into one component per cell, so players in front of or inside a goal sort correctly.
 */
export class IsoSoccerGoalComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoSoccerGoalComponentProps

  public readonly componentType: string = 'IsoSoccerGoal'

  constructor(properties: IsoSoccerGoalComponentProps) {
    super(properties)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { tileSize, end, segment, segments } = this.properties
    const p = (dc: number, dr: number, h = 0) => cellPoint(tileSize, this.x, this.y, dc, dr, h)
    const bar = CROSSBAR * heightPx(tileSize)
    const back = bar * 0.7
    // the goal line is on the pitch side of the cell
    const line = end === 0 ? 1 : 0
    const rear = end === 0 ? 0.1 : 0.9
    const net = 'rgba(255,255,255,0.18)'
    const mesh = 'rgba(255,255,255,0.45)'
    const white = '#fafafa'
    const postWidth = Math.max(2, tileSize / 22)

    const drawNet = () => {
      // the back, the roof, and the sides at the ends of the goal
      fillPolygon(ctx, [p(rear, 0), p(rear, 1), p(rear, 1, back), p(rear, 0, back)], net)
      fillPolygon(ctx, [p(line, 0, bar), p(line, 1, bar), p(rear, 1, back), p(rear, 0, back)], net)
      for (let i = 1; i < 4; i++) {
        const h = (back * i) / 4
        strokeLine(ctx, [p(rear, 0, h), p(rear, 1, h)], mesh, 1)
        strokeLine(ctx, [p(rear, i / 4), p(rear, i / 4, back), p(line, i / 4, bar)], mesh, 1)
      }
      for (const side of [0, 1]) {
        if (side === 0 ? segment !== 0 : segment !== segments - 1) continue
        fillPolygon(
          ctx,
          [p(line, side), p(rear, side), p(rear, side, back), p(line, side, bar)],
          net,
        )
        strokeLine(ctx, [p(line, side, bar), p(rear, side, back), p(rear, side)], mesh, 1)
      }
    }
    const drawFrame = () => {
      strokeLine(ctx, [p(line, 0, bar), p(line, 1, bar)], white, postWidth)
      if (segment === 0) strokeLine(ctx, [p(line, 0), p(line, 0, bar)], white, postWidth)
      if (segment === segments - 1) strokeLine(ctx, [p(line, 1), p(line, 1, bar)], white, postWidth)
    }

    // the near goal (end 1) has its frame behind the net as seen from the camera
    if (end === 0) {
      drawNet()
      drawFrame()
    } else {
      drawFrame()
      drawNet()
    }
  }
}
