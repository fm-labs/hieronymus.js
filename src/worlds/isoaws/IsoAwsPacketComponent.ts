import type { GameComponentProperties, IGameComponent } from '../../../lib/game.types'
import { AbstractGameComponent } from '../../../lib'
import type { Direction } from '../isocity/isocity.traffic.ts'
import { IsoPainter, isVisible, type AwsScene } from './isoaws.draw.ts'

export interface IsoAwsPacketComponentProps extends GameComponentProperties {
  tileSize: number
  color: string
  direction: Direction
  scene: AwsScene
}

/**
 * A data packet driving along the roads: a small glowing capsule.
 * The position is the top corner of the cell centered on it, so it is depth-sorted like the buildings.
 */
export class IsoAwsPacketComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoAwsPacketComponentProps

  public readonly componentType: string = 'IsoAwsPacket'

  constructor(properties: IsoAwsPacketComponentProps) {
    super(properties)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { tileSize, color, direction, scene } = this.properties
    const x = this.x
    const y = this.y + tileSize / 4
    if (!isVisible(scene, x, y, 40)) return
    const p = new IsoPainter(ctx, tileSize, scene.night)
    const alongCols = direction === 'E' || direction === 'W'
    const cols = alongCols ? 0.3 : 0.16
    const rows = alongCols ? 0.16 : 0.3
    p.light(x, y - 3, 14, color, 0.25 + scene.night * 0.45)
    p.shadow(x, y, cols, rows)
    p.box(x, y, { cols, rows, height: 5, color, elevation: 1 })
    // a bright stripe on top, lit at night
    p.box(x, y, { cols: cols * 0.6, rows: rows * 0.6, height: 1, elevation: 6, color: '#ffffff' })
  }
}
