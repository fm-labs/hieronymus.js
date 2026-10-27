import type { GameComponentProperties, IGameComponent } from '@fmlabs/world'
import { AbstractGameComponent } from '@fmlabs/world'
import { IsoPainter, isoOffset } from './isoairport.draw.ts'
import type { BuildingPiece } from './isoairport.map.ts'
import { BUILDING_DRAWINGS } from './isoairport.structures.ts'
import type { AirportScene } from './isoairport.world.ts'

export interface IsoAirportBuildingComponentProps extends GameComponentProperties {
  tileSize: number
  building: BuildingPiece
  scene: AirportScene
}

/**
 * A building, or one slice of a long building. It is placed on the front cell of its footprint,
 * so it is depth-sorted after everything behind it. The position is the top corner of that cell.
 */
export class IsoAirportBuildingComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoAirportBuildingComponentProps

  public readonly componentType: string = 'IsoAirportBuilding'

  constructor(properties: IsoAirportBuildingComponentProps) {
    super(properties)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { tileSize, building: b, scene } = this.properties
    // the drawing is positioned from the back corner of the whole building
    const front = { col: b.pieceCol + b.pieceCols - 1, row: b.pieceRow + b.pieceRows - 1 }
    const [dx, dy] = isoOffset(tileSize, b.col - front.col, b.row - front.row)
    const p = new IsoPainter(ctx, tileSize, scene.night, [this.x + dx, this.y + dy])
    BUILDING_DRAWINGS[b.kind]({
      p,
      char: b.char,
      cols: b.cols,
      rows: b.rows,
      col: b.col,
      row: b.row,
      piece: {
        col: b.pieceCol - b.col,
        row: b.pieceRow - b.row,
        cols: b.pieceCols,
        rows: b.pieceRows,
      },
      time: scene.time,
      night: scene.night,
      docked: scene.docked,
    })
    p.flush()
  }
}
