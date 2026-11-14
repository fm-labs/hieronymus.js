import type { GameComponentProperties, IGameComponent } from '@fmlabs/hieronymus'
import { AbstractGameComponent } from '@fmlabs/hieronymus'
import type { Direction } from '../isocity/isocity.traffic.ts'
import { IsoPainter, mix, noise } from './isovegas.draw.ts'
import type { Ground, VegasScene } from './isovegas.map.ts'

export interface IsoVegasGroundComponentProps extends GameComponentProperties {
  tileSize: number
  ground: Ground
  col: number
  row: number
  /** The neighbors a road connects to */
  connections: Direction[]
  scene: VegasScene
}

/**
 * The ground of one cell: desert sand, the plaza of a hotel, the median of the Strip, or a road.
 * The position is the top corner of the cell.
 */
export class IsoVegasGroundComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoVegasGroundComponentProps

  public readonly componentType: string = 'IsoVegasGround'

  constructor(properties: IsoVegasGroundComponentProps) {
    super(properties)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { tileSize, ground, col, row, scene } = this.properties
    const p = new IsoPainter(ctx, tileSize, scene.night, [this.x, this.y])
    const cell = (c0: number, r0: number, c1: number, r1: number, color: string) =>
      p.ground(c0, r0, c1, r1, color)

    switch (ground) {
      case 'desert': {
        cell(0, 0, 1, 1, mix('#e6c793', '#d8b47c', noise(col, row)))
        // pebbles
        ctx.fillStyle = p.c('#b8935e')
        for (let i = 0; i < 3; i++) {
          const [x, y] = p.at(0.15 + noise(col, row, i) * 0.7, 0.15 + noise(row, col, i) * 0.7)
          ctx.fillRect(x, y, 2, 1)
        }
        return
      }
      case 'plaza':
        cell(0, 0, 1, 1, (col + row) % 2 ? '#dcd5c7' : '#d3cbbb')
        return
      case 'median':
        cell(0, 0, 1, 1, '#cfc2a4')
        cell(0.15, 0, 0.85, 1, '#78a75a')
        return
      case 'road':
        return this.drawRoad(p)
    }
  }

  private drawRoad(p: IsoPainter) {
    const { connections, scene } = this.properties
    const { ctx } = p
    const has = (d: Direction) => connections.includes(d)
    const s = 0.14
    p.ground(0, 0, 1, 1, '#c9c1b3')
    p.ground(
      has('W') ? 0 : s,
      has('N') ? 0 : s,
      has('E') ? 1 : 1 - s,
      has('S') ? 1 : 1 - s,
      '#46494f',
    )

    const line = (a: [number, number], b: [number, number]) => {
      ctx.beginPath()
      ctx.moveTo(...p.at(...a))
      ctx.lineTo(...p.at(...b))
      ctx.stroke()
    }
    ctx.strokeStyle = p.c('#f1ead6')
    const straightEW = has('E') && has('W') && !has('N') && !has('S')
    const straightNS = has('N') && has('S') && !has('E') && !has('W')
    if (straightEW || straightNS) {
      ctx.lineWidth = 1.5
      ctx.setLineDash([5, 5])
      if (straightEW) line([0, 0.5], [1, 0.5])
      else line([0.5, 0], [0.5, 1])
      ctx.setLineDash([])
    } else if (connections.length >= 3) {
      ctx.lineWidth = 2
      for (const d of connections) {
        for (let i = 0; i < 4; i++) {
          const t = 0.25 + i * 0.17
          if (d === 'N') line([t, 0.04], [t, 0.14])
          else if (d === 'S') line([t, 0.86], [t, 0.96])
          else if (d === 'W') line([0.04, t], [0.14, t])
          else line([0.86, t], [0.96, t])
        }
      }
    }
    // the glow of the neon at night
    if (scene.night > 0) {
      ctx.globalAlpha = scene.night * 0.16
      p.ground(0, 0, 1, 1, '#ffb070', true)
      ctx.globalAlpha = 1
    }
  }
}
