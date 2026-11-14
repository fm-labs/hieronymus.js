import type { GameComponentProperties, IGameComponent } from '@fmlabs/hieronymus'
import { AbstractGameComponent } from '@fmlabs/hieronymus'

export interface IsoCasinoSelectionComponentProps extends GameComponentProperties {
  tileSize: number
  visible: boolean
}

/** A pulsing outline around the selected cell. The position is the top corner of the cell. */
export class IsoCasinoSelectionComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoCasinoSelectionComponentProps

  public static readonly defaultProperties: IsoCasinoSelectionComponentProps = {
    tileSize: 64,
    visible: false,
  }

  public readonly componentType: string = 'IsoCasinoSelection'

  private time = 0

  constructor(properties: Partial<IsoCasinoSelectionComponentProps>) {
    super({ ...IsoCasinoSelectionComponent.defaultProperties, ...properties })
  }

  update(deltaTime: number): void {
    this.time += deltaTime / 1000
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.properties.visible) return
    const hw = this.properties.tileSize / 2
    const hh = this.properties.tileSize / 4
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(this.time * 6)
    ctx.strokeStyle = '#ffeb3b'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(this.x, this.y)
    ctx.lineTo(this.x + hw, this.y + hh)
    ctx.lineTo(this.x, this.y + hh * 2)
    ctx.lineTo(this.x - hw, this.y + hh)
    ctx.closePath()
    ctx.stroke()
  }
}
