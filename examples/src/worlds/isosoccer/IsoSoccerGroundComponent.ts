import type { GameComponentProperties, IGameComponent } from '@fmlabs/hieronymus'
import { AbstractGameComponent } from '@fmlabs/hieronymus'
import { cellPoint, fillPolygon, noise } from './isosoccer.draw.ts'
import type { CellKind } from './isosoccer.stadium.ts'

export interface IsoSoccerGroundComponentProps extends GameComponentProperties {
  tileSize: number
  kind: CellKind
  col: number
  row: number
  /** Position on the pitch, for the mowing stripes */
  x: number
}

/** The ground of one cell: mowed grass on the pitch, plain grass around it, concrete under the stands */
export class IsoSoccerGroundComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoSoccerGroundComponentProps

  public readonly componentType: string = 'IsoSoccerGround'

  constructor(properties: IsoSoccerGroundComponentProps) {
    super(properties)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { tileSize, kind, col, row, x } = this.properties
    const p = (dc: number, dr: number) => cellPoint(tileSize, this.x, this.y, dc, dr)
    const quad = (c0: number, r0: number, c1: number, r1: number, color: string) =>
      fillPolygon(ctx, [p(c0, r0), p(c1, r0), p(c1, r1), p(c0, r1)], color)

    switch (kind) {
      case 'pitch':
        // mowing stripes, three cells wide, across the pitch
        quad(0, 0, 1.01, 1.01, Math.floor(x / 3) % 2 ? '#4caf50' : '#43a047')
        return
      case 'apron':
      case 'goal':
      case 'boards':
        quad(0, 0, 1.01, 1.01, '#3d9142')
        return
      case 'concourse':
      case 'dugout':
        quad(0, 0, 1.01, 1.01, noise(col, row) > 0.5 ? '#9e9a91' : '#a5a198')
        return
      default:
        quad(0, 0, 1.01, 1.01, '#8a867e')
    }
  }
}
