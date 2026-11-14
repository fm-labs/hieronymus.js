import type { GameComponentProperties, IGameComponent } from '@fmlabs/hieronymus'
import { AbstractGameComponent } from '@fmlabs/hieronymus'
import { IsoPainter } from './isoairport.draw.ts'
import type { PropKind } from './isoairport.map.ts'
import { PROP_DRAWINGS } from './isoairport.structures.ts'
import type { AirportScene } from './isoairport.world.ts'

export interface IsoAirportPropComponentProps extends GameComponentProperties {
  tileSize: number
  kind: PropKind
  col: number
  row: number
  scene: AirportScene
}

/** A tree, a floodlight, a fuel tank, a radar... on one cell. The position is the top corner of the cell. */
export class IsoAirportPropComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoAirportPropComponentProps

  public readonly componentType: string = 'IsoAirportProp'

  constructor(properties: IsoAirportPropComponentProps) {
    super(properties)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { tileSize, kind, col, row, scene } = this.properties
    const p = new IsoPainter(ctx, tileSize, scene.night)
    PROP_DRAWINGS[kind]({
      p,
      x: this.x,
      y: this.y + tileSize / 4,
      col,
      row,
      time: scene.time,
      night: scene.night,
    })
  }
}
