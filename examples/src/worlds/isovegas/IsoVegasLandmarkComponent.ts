import type { GameComponentProperties, IGameComponent } from '@fmlabs/hieronimo'
import { AbstractGameComponent } from '@fmlabs/hieronimo'
import { IsoPainter, isoOffset } from './isovegas.draw.ts'
import { LANDMARK_DRAWINGS } from './isovegas.landmarks.ts'
import type { LandmarkKind, VegasScene } from './isovegas.map.ts'

export interface IsoVegasLandmarkComponentProps extends GameComponentProperties {
  tileSize: number
  kind: LandmarkKind
  /** The size of the footprint, in cells */
  cols: number
  rows: number
  scene: VegasScene
}

/**
 * A landmark covering several cells. It is placed on the front cell of its footprint,
 * so it is depth-sorted after everything behind it. The position is the top corner of that cell.
 */
export class IsoVegasLandmarkComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoVegasLandmarkComponentProps

  public readonly componentType: string = 'IsoVegasLandmark'

  constructor(properties: IsoVegasLandmarkComponentProps) {
    super(properties)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { tileSize, kind, cols, rows, scene } = this.properties
    // the back corner of the footprint
    const [dx, dy] = isoOffset(tileSize, -(cols - 1), -(rows - 1))
    const p = new IsoPainter(ctx, tileSize, scene.night, [this.x + dx, this.y + dy])
    LANDMARK_DRAWINGS[kind]({ p, cols, rows, time: scene.time, night: scene.night })
    p.flush()
  }
}
