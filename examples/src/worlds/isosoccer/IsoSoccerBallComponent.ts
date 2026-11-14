import type { GameComponentProperties, IGameComponent } from '@fmlabs/hieronymus'
import { AbstractGameComponent } from '@fmlabs/hieronymus'
import { heightPx } from './isosoccer.draw.ts'

export interface IsoSoccerBallComponentProps extends GameComponentProperties {
  tileSize: number
  /** Height above the grass, in cells */
  z: number
  /** Distance rolled, turns the patches */
  spin: number
}

/** The ball, with its shadow on the grass; the position is like a player's, at its ground point */
export class IsoSoccerBallComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoSoccerBallComponentProps

  public readonly componentType: string = 'IsoSoccerBall'

  constructor(properties: IsoSoccerBallComponentProps) {
    super(properties)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { tileSize, z, spin } = this.properties
    const u = tileSize / 64
    const x = this.x
    const y = this.y + tileSize / 4
    const r = 2.4 * u
    const lift = z * heightPx(tileSize)

    // the shadow gets smaller and lighter the higher the ball is
    const s = Math.max(0.4, 1 - z * 0.4)
    ctx.beginPath()
    ctx.ellipse(x + 1 * u, y, r * 1.2 * s, r * 0.6 * s, 0, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(0,0,0,${0.3 * s})`
    ctx.fill()

    const by = y - r - lift
    ctx.beginPath()
    ctx.arc(x, by, r, 0, Math.PI * 2)
    ctx.fillStyle = '#fafafa'
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 0.6 * u
    ctx.stroke()
    // a dark patch that moves as the ball rolls
    const a = spin * 3
    ctx.beginPath()
    ctx.arc(x + Math.cos(a) * r * 0.45, by + Math.sin(a) * r * 0.3, r * 0.38, 0, Math.PI * 2)
    ctx.fillStyle = '#212121'
    ctx.fill()
  }
}
