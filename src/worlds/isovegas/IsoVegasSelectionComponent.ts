import type { GameComponentProperties, IGameComponent } from '../../../lib/game.types'
import { AbstractGameComponent } from '../../../lib'
import { isoOffset } from './isovegas.draw.ts'

export interface IsoVegasSelectionComponentProps extends GameComponentProperties {
  tileSize: number
  /** The size of the selected footprint, in cells */
  cols: number
  rows: number
  visible: boolean
}

/** A pulsing outline around the selected footprint. The position is its top corner. */
export class IsoVegasSelectionComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoVegasSelectionComponentProps

  public readonly componentType: string = 'IsoVegasSelection'

  private time = 0

  constructor(properties: Partial<IsoVegasSelectionComponentProps>) {
    super({ tileSize: 64, cols: 1, rows: 1, visible: false, ...properties })
  }

  update(deltaTime: number): void {
    this.time += deltaTime / 1000
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const { tileSize, cols, rows, visible } = this.properties
    if (!visible) return
    const corners = [
      [0, 0],
      [cols, 0],
      [cols, rows],
      [0, rows],
    ].map(([c, r]) => {
      const [dx, dy] = isoOffset(tileSize, c, r)
      return [this.x + dx, this.y + dy]
    })
    ctx.beginPath()
    corners.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.closePath()
    ctx.strokeStyle = `rgba(255,215,64,${0.6 + 0.4 * Math.sin(this.time * 5)})`
    ctx.lineWidth = 3
    ctx.setLineDash([10, 6])
    ctx.lineDashOffset = -this.time * 20
    ctx.stroke()
  }
}
