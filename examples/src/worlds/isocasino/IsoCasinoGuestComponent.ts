import type { GameComponentProperties, IGameComponent } from '@fmlabs/world'
import { AbstractGameComponent } from '@fmlabs/world'
import { drawIsoCylinder, drawIsoDisc } from './isocasino.draw.ts'

export interface IsoCasinoGuestComponentProps extends GameComponentProperties {
  tileSize: number
  shirt: string
  skin: string
}

/**
 * A guest walking through the casino. The position is the top corner of a cell centered on the guest,
 * so guests are depth-sorted like the machines.
 */
export class IsoCasinoGuestComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoCasinoGuestComponentProps

  public static readonly defaultProperties: IsoCasinoGuestComponentProps = {
    tileSize: 64,
    shirt: '#1e88e5',
    skin: '#f1c27d',
  }

  public readonly componentType: string = 'IsoCasinoGuest'

  constructor(properties: Partial<IsoCasinoGuestComponentProps>) {
    super({ ...IsoCasinoGuestComponent.defaultProperties, ...properties })
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { tileSize, shirt, skin } = this.properties
    const x = this.x
    const y = this.y + tileSize / 4
    drawIsoDisc(ctx, tileSize, x + 2, y + 1, 0.09, 'rgba(0,0,0,0.25)')
    drawIsoCylinder(ctx, tileSize, x, y, 0.05, 7, '#37474f')
    drawIsoCylinder(ctx, tileSize, x, y, 0.07, 9, shirt, 7)
    ctx.beginPath()
    ctx.arc(x, y - 20, 4, 0, Math.PI * 2)
    ctx.fillStyle = skin
    ctx.fill()
  }
}
