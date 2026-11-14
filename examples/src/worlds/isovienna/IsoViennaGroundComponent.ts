import type { GameComponentProperties, IGameComponent } from '@fmlabs/hieronymus'
import { AbstractGameComponent } from '@fmlabs/hieronymus'
import { LANE_OFFSET, type Direction } from '../isocity/isocity.traffic.ts'
import { IsoPainter, mix, noise, type Point } from './isovienna.draw.ts'
import type { Ground, ViennaScene } from './isovienna.map.ts'

export interface IsoViennaGroundComponentProps extends GameComponentProperties {
  tileSize: number
  ground: Ground
  col: number
  row: number
  /** The neighbors a road connects to */
  connections: Direction[]
  /** The neighbors the tram tracks connect to (only on the Ring) */
  tracks: Direction[]
  /** The neighbors of a water cell that are land */
  banks: Direction[]
  scene: ViennaScene
}

const EDGE: Record<Direction, Point> = { N: [0.5, 0], E: [1, 0.5], S: [0.5, 1], W: [0, 0.5] }
/** The right-hand side of a direction, in cells */
const RIGHT: Record<Direction, Point> = { N: [1, 0], E: [0, 1], S: [-1, 0], W: [0, -1] }

/**
 * The ground of one cell: lawn, cobblestones, water, a street, the Ring with its tram tracks,
 * or a bridge over the Danube Canal. The position is the top corner of the cell.
 */
export class IsoViennaGroundComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoViennaGroundComponentProps

  public readonly componentType: string = 'IsoViennaGround'

  constructor(properties: IsoViennaGroundComponentProps) {
    super(properties)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { tileSize, ground, col, row, scene } = this.properties
    const p = new IsoPainter(ctx, tileSize, scene.night, [this.x, this.y])
    const snow = scene.winter

    switch (ground) {
      case 'lawn':
        p.ground(
          0,
          0,
          1,
          1,
          snow
            ? mix('#eef2f5', '#e3e9ee', noise(col, row))
            : mix('#8dbb5f', '#7fb056', noise(col, row)),
        )
        return
      case 'pavement':
      case 'plaza':
        return this.drawCobbles(p)
      case 'water':
        return this.drawWater(p)
      case 'bridge':
        this.drawWater(p)
        return this.drawRoad(p, true)
      case 'road':
      case 'ring':
        return this.drawRoad(p, false)
    }
  }

  private drawCobbles(p: IsoPainter) {
    const { col, row, scene } = this.properties
    p.ground(0, 0, 1, 1, scene.winter ? '#e4e7ea' : (col + row) % 2 ? '#d9d2c4' : '#d2cabb')
    const { ctx } = p
    ctx.strokeStyle = p.c(scene.winter ? '#d4d9de' : '#c5bcab')
    ctx.lineWidth = 0.6
    for (let i = 1; i < 4; i++) {
      ctx.beginPath()
      ctx.moveTo(...p.at(0, i / 4))
      ctx.lineTo(...p.at(1, i / 4))
      ctx.stroke()
    }
  }

  private drawWater(p: IsoPainter) {
    const { col, row, scene } = this.properties
    p.ground(0, 0, 1, 1, scene.winter ? '#6f9fbd' : '#3f8fba')
    // ripples drifting downstream
    const { ctx } = p
    ctx.strokeStyle = scene.night > 0.5 ? 'rgba(255,214,150,0.35)' : 'rgba(255,255,255,0.45)'
    ctx.lineWidth = 1
    for (let i = 0; i < 2; i++) {
      const t = (scene.time * 0.12 + noise(col, row, i)) % 1
      const [x, y] = p.at(t, 0.25 + noise(row, col, i) * 0.5)
      ctx.globalAlpha = Math.sin(t * Math.PI)
      ctx.beginPath()
      ctx.moveTo(x - 4, y)
      ctx.lineTo(x + 3, y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    // stone embankments towards the land
    const { banks } = this.properties
    const stone = '#b8ae9c'
    if (banks.includes('N')) p.ground(0, 0, 1, 0.08, stone)
    if (banks.includes('S')) p.ground(0, 0.92, 1, 1, stone)
    if (banks.includes('W')) p.ground(0, 0, 0.08, 1, stone)
    if (banks.includes('E')) p.ground(0.92, 0, 1, 1, stone)
  }

  private drawRoad(p: IsoPainter, bridge: boolean) {
    const { connections, tracks, scene } = this.properties
    const { ctx } = p
    const has = (d: Direction) => connections.includes(d)
    const s = 0.14
    if (!bridge) p.ground(0, 0, 1, 1, scene.winter ? '#e1e5e8' : '#cfc8ba')
    const asphalt = scene.winter ? '#6d7177' : '#4b4e54'
    p.ground(
      has('W') ? 0 : s,
      has('N') ? 0 : s,
      has('E') ? 1 : 1 - s,
      has('S') ? 1 : 1 - s,
      asphalt,
    )
    if (bridge) {
      // railings on both sides
      ctx.strokeStyle = p.c('#d8d2c4')
      ctx.lineWidth = 2
      for (const c of [0.06, 0.94]) {
        const [x0, y0] = p.at(c, 0)
        const [x1, y1] = p.at(c, 1)
        ctx.beginPath()
        ctx.moveTo(x0, y0 - 4)
        ctx.lineTo(x1, y1 - 4)
        ctx.stroke()
      }
    }

    const line = (a: Point, b: Point) => {
      ctx.beginPath()
      ctx.moveTo(...p.at(...a))
      ctx.lineTo(...p.at(...b))
      ctx.stroke()
    }
    if (tracks.length) {
      // two rails in each lane, from the middle of the cell to the edges the tracks lead to
      ctx.strokeStyle = p.c('#9aa0a6')
      ctx.lineWidth = 0.8
      for (const d of tracks) {
        for (const side of [1, -1]) {
          for (const rail of [-0.05, 0.05]) {
            const offset = side * LANE_OFFSET + rail
            const shift = RIGHT[d]
            const from: Point = [0.5 + shift[0] * offset, 0.5 + shift[1] * offset]
            const to: Point = [EDGE[d][0] + shift[0] * offset, EDGE[d][1] + shift[1] * offset]
            line(from, to)
          }
        }
      }
      return
    }
    ctx.strokeStyle = p.c('#ece6d6')
    const straightEW = has('E') && has('W') && !has('N') && !has('S')
    const straightNS = has('N') && has('S') && !has('E') && !has('W')
    if (straightEW || straightNS) {
      ctx.lineWidth = 1.2
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
    // the warm light of the street lamps
    if (scene.night > 0) {
      ctx.globalAlpha = scene.night * 0.14
      p.ground(0, 0, 1, 1, '#ffc27a', true)
      ctx.globalAlpha = 1
    }
  }
}
