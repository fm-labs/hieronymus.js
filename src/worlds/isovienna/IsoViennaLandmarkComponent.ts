import type { GameComponentProperties, IGameComponent } from '../../../lib/game.types'
import { AbstractGameComponent } from '../../../lib'
import { IsoPainter, isoOffset } from './isovienna.draw.ts'
import { FLOODLIT, LANDMARK_DRAWINGS } from './isovienna.landmarks.ts'
import type { LandmarkKind, ViennaScene } from './isovienna.map.ts'

export interface IsoViennaLandmarkComponentProps extends GameComponentProperties {
  tileSize: number
  kind: LandmarkKind
  /** The size of the footprint, in cells */
  cols: number
  rows: number
  scene: ViennaScene
}

/**
 * A landmark covering several cells. It is placed on the front cell of its footprint,
 * so it is depth-sorted after everything behind it. The position is the top corner of that cell.
 */
export class IsoViennaLandmarkComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoViennaLandmarkComponentProps

  public readonly componentType: string = 'IsoViennaLandmark'

  constructor(properties: IsoViennaLandmarkComponentProps) {
    super(properties)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { tileSize, kind, cols, rows, scene } = this.properties
    // the back corner of the footprint
    const [dx, dy] = isoOffset(tileSize, -(cols - 1), -(rows - 1))
    // floodlit monuments get less dark at night
    const darkness = scene.night * (FLOODLIT[kind] ? 0.5 : 1)
    const p = new IsoPainter(ctx, tileSize, darkness, [this.x + dx, this.y + dy])
    LANDMARK_DRAWINGS[kind]({
      p,
      cols,
      rows,
      time: scene.time,
      night: scene.night,
      winter: scene.winter,
    })
    p.flush()
  }
}
