import type { GameComponentProperties, IGameComponent } from '../../../lib/game.types'
import { AbstractGameComponent } from '../../../lib'
import { strokeLine, TEAM_COLORS } from './isosoccer.draw.ts'
import type { Team, Vec } from './isosoccer.match.ts'

export interface IsoSoccerPlayerComponentProps extends GameComponentProperties {
  tileSize: number
  team: Team
  number: number
  keeper: boolean
  /** Unit vector on the pitch */
  facing: Vec
  /** Distance run, for the legs */
  stride: number
  /** Controlled from the keyboard */
  selected: boolean
  skin: string
}

/**
 * A player. Like the vehicles of 'isocity', the position is the top corner of a cell centered on the
 * player, so players sort against the goals and each other by where they stand.
 */
export class IsoSoccerPlayerComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoSoccerPlayerComponentProps

  public readonly componentType: string = 'IsoSoccerPlayer'

  constructor(properties: IsoSoccerPlayerComponentProps) {
    super(properties)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { tileSize, team, number, keeper, facing, stride, selected, skin } = this.properties
    const u = tileSize / 64
    const x = this.x
    const y = this.y + tileSize / 4
    const kit = TEAM_COLORS[team]
    const shirt = keeper ? kit.keeper : kit.shirt

    // the direction the player looks at, on screen
    const fx = (facing.x - facing.y) / 2
    const fy = (facing.x + facing.y) / 4
    const fl = Math.hypot(fx, fy) || 1
    const sx = fx / fl
    const sy = fy / fl

    if (selected) {
      ctx.beginPath()
      ctx.ellipse(x, y, 9 * u, 4.5 * u, 0, 0, Math.PI * 2)
      ctx.strokeStyle = '#ffeb3b'
      ctx.lineWidth = 2 * u
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.ellipse(x + 1 * u, y + 0.5 * u, 5 * u, 2.4 * u, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.fill()

    // legs swing along the running direction
    const swing = Math.sin(stride * 7) * 3.2 * u
    const hip = y - 9 * u
    for (const side of [-1, 1]) {
      const fx0 = x + side * 1.6 * u + sx * swing * side
      const fy0 = y + sy * swing * side * 0.5
      strokeLine(
        ctx,
        [
          [x + side * 1.4 * u, hip],
          [fx0, fy0 - 1 * u],
        ],
        kit.socks,
        2.2 * u,
      )
      strokeLine(
        ctx,
        [
          [x + side * 1.4 * u, hip],
          [x + side * 1.5 * u + sx * swing * side * 0.5, hip + 3.5 * u],
        ],
        skin,
        2.2 * u,
      )
      ctx.fillStyle = '#212121'
      ctx.fillRect(fx0 - 1.4 * u, fy0 - 1.4 * u, 2.8 * u, 1.6 * u)
    }
    // shorts and shirt
    ctx.fillStyle = keeper ? '#212121' : kit.shorts
    ctx.fillRect(x - 3.2 * u, hip - 1.5 * u, 6.4 * u, 3.5 * u)
    ctx.fillStyle = shirt
    roundRect(ctx, x - 3.6 * u, hip - 8.5 * u, 7.2 * u, 7.5 * u, 2 * u)
    // arms swing the other way
    for (const side of [-1, 1]) {
      const ax = x + side * 3.8 * u - sx * swing * side * 0.6
      strokeLine(
        ctx,
        [
          [x + side * 3.2 * u, hip - 7.5 * u],
          [ax, hip - 3 * u],
        ],
        shirt,
        2 * u,
      )
    }
    // the number, when the back faces the camera
    if (sy < -0.2 && u >= 0.75) {
      ctx.fillStyle = '#fafafa'
      ctx.font = `bold ${Math.round(5 * u)}px Arial`
      ctx.textAlign = 'center'
      ctx.fillText(String(number), x, hip - 3 * u)
    }
    // head and hair
    ctx.beginPath()
    ctx.arc(x, hip - 11 * u, 2.8 * u, 0, Math.PI * 2)
    ctx.fillStyle = skin
    ctx.fill()
    ctx.beginPath()
    ctx.arc(
      x - sx * 0.6 * u,
      hip - 11.8 * u - sy * 0.4 * u,
      2.6 * u,
      Math.PI * 1.05,
      Math.PI * 1.95,
    )
    ctx.fillStyle = '#3e2723'
    ctx.fill()

    if (selected) {
      // an arrow above the head
      const top = hip - 17 * u
      ctx.beginPath()
      ctx.moveTo(x, top + 4 * u)
      ctx.lineTo(x - 3 * u, top)
      ctx.lineTo(x + 3 * u, top)
      ctx.closePath()
      ctx.fillStyle = '#ffeb3b'
      ctx.fill()
    }
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
  ctx.fill()
}
