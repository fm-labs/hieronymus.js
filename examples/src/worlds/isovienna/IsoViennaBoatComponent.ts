import type { GameComponentProperties, IGameComponent } from '@fmlabs/world'
import { AbstractGameComponent } from '@fmlabs/world'
import { IsoPainter } from './isovienna.draw.ts'
import type { ViennaScene } from './isovienna.map.ts'

export interface IsoViennaBoatComponentProps extends GameComponentProperties {
  tileSize: number
  /** Going east (towards larger columns) or west */
  east: boolean
  /** 1 on open water, fading out under a bridge */
  opacity: number
  scene: ViennaScene
}

/** A white river boat on the Danube Canal. The position is the top corner of a cell centered on it. */
export class IsoViennaBoatComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoViennaBoatComponentProps

  public readonly componentType: string = 'IsoViennaBoat'

  constructor(properties: IsoViennaBoatComponentProps) {
    super(properties)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { tileSize, east, opacity, scene } = this.properties
    if (opacity <= 0) return
    const p = new IsoPainter(ctx, tileSize, scene.night)
    const x = this.x
    const y = this.y + tileSize / 4
    ctx.save()
    ctx.globalAlpha = opacity
    // the wake behind the boat
    const back = east ? -1 : 1
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 1
    for (const side of [-3, 3]) {
      ctx.beginPath()
      ctx.moveTo(x + back * 22, y + back * 11 + side)
      ctx.lineTo(x + back * 40, y + back * 20 + side * 2)
      ctx.stroke()
    }
    p.box(x, y, { cols: 0.9, rows: 0.24, height: 5, color: '#fafafa' })
    p.box(x, y, { cols: 0.92, rows: 0.26, height: 1.5, elevation: 2, color: '#1e63c4' })
    p.box(x, y, { cols: 0.55, rows: 0.18, height: 5, elevation: 5, color: '#eceff1' })
    p.box(x, y, {
      cols: 0.56,
      rows: 0.19,
      height: 2,
      elevation: 7,
      color: scene.night > 0.3 ? '#ffe3a0' : '#4f6b80',
    })
    if (scene.night > 0) p.light(x, y - 6, 22, 'rgba(255,220,150,1)', scene.night * 0.4)
    ctx.restore()
  }
}
