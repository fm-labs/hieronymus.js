import type { GameComponentProperties, IGameComponent } from '@fmlabs/hieronimo'
import { AbstractGameComponent } from '@fmlabs/hieronimo'
import type { Direction } from '../isocity/isocity.traffic.ts'
import { mix } from '../isovegas/isovegas.draw.ts'
import { IsoPainter, noise } from './isoairport.draw.ts'
import type { Ground } from './isoairport.map.ts'
import type { AirportScene } from './isoairport.world.ts'

export interface IsoAirportGroundComponentProps extends GameComponentProperties {
  tileSize: number
  ground: Ground
  col: number
  row: number
  /** The neighbors a road connects to */
  connections: Direction[]
  scene: AirportScene
}

const CAR_COLORS = ['#e53935', '#1e88e5', '#fafafa', '#212121', '#90a4ae', '#43a047', '#fdd835']

/**
 * The ground of one cell: mown grass, a road, a plaza, a parking lot, the apron or water.
 * The position is the top corner of the cell.
 */
export class IsoAirportGroundComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoAirportGroundComponentProps

  public readonly componentType: string = 'IsoAirportGround'

  constructor(properties: IsoAirportGroundComponentProps) {
    super(properties)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { tileSize, ground, col, row, scene } = this.properties
    const p = new IsoPainter(ctx, tileSize, scene.night, [this.x, this.y])

    switch (ground) {
      case 'grass': {
        // mowing stripes, two cells wide
        const stripe = Math.floor((col + row) / 2) % 2
        p.ground(0, 0, 1, 1, mix(stripe ? '#86b45e' : '#7cab56', '#74a24f', noise(col, row) * 0.5))
        ctx.fillStyle = p.c('#6a9a48')
        for (let i = 0; i < 3; i++) {
          const [x, y] = p.at(0.15 + noise(col, row, i) * 0.7, 0.15 + noise(row, col, i) * 0.7)
          ctx.fillRect(x, y, 2, 1)
        }
        return
      }
      case 'plaza':
        p.ground(0, 0, 1, 1, (col + row) % 2 ? '#dcd6c8' : '#d4cdbd')
        return
      case 'apron':
        p.ground(0, 0, 1, 1, mix('#c9c6bd', '#c2bfb5', noise(col, row)))
        // the joints between the concrete slabs
        ctx.strokeStyle = p.c('#b3afa4')
        ctx.lineWidth = 0.6
        ctx.beginPath()
        ctx.moveTo(...p.at(0.5, 0))
        ctx.lineTo(...p.at(0.5, 1))
        ctx.moveTo(...p.at(0, 0.5))
        ctx.lineTo(...p.at(1, 0.5))
        ctx.stroke()
        return
      case 'water': {
        p.ground(0, 0, 1, 1, '#3d8fbf')
        ctx.strokeStyle = scene.night > 0.5 ? 'rgba(255,220,160,0.4)' : 'rgba(255,255,255,0.5)'
        ctx.lineWidth = 1
        const t = (scene.time * 0.2 + noise(col, row)) % 1
        const [x, y] = p.at(0.2 + noise(col, row, 1) * 0.6, 0.2 + noise(col, row, 2) * 0.6)
        ctx.globalAlpha = Math.sin(t * Math.PI)
        ctx.beginPath()
        ctx.moveTo(x - 4 + t * 4, y)
        ctx.lineTo(x + 2 + t * 4, y)
        ctx.stroke()
        ctx.globalAlpha = 1
        return
      }
      case 'parking':
        return this.drawParking(p)
      case 'road':
        return this.drawRoad(p)
    }
  }

  private drawParking(p: IsoPainter) {
    const { col, row } = this.properties
    const { ctx } = p
    p.ground(0, 0, 1, 1, '#555a60')
    ctx.strokeStyle = p.c('#e8e8e8')
    ctx.lineWidth = 0.8
    ctx.beginPath()
    for (const r of [0.05, 0.95]) {
      ctx.moveTo(...p.at(0, r))
      ctx.lineTo(...p.at(1, r))
    }
    for (let i = 0; i <= 3; i++) {
      for (const [r0, r1] of [
        [0.05, 0.4],
        [0.6, 0.95],
      ]) {
        ctx.moveTo(...p.at(i / 3, r0))
        ctx.lineTo(...p.at(i / 3, r1))
      }
    }
    ctx.stroke()
    // most stalls are taken
    for (let i = 0; i < 6; i++) {
      if (noise(col, row, i) < 0.3) continue
      const c = (i % 3) / 3 + 1 / 6
      const r = i < 3 ? 0.22 : 0.78
      const [x, y] = p.at(c, r)
      const color = CAR_COLORS[Math.floor(noise(row, col, i) * CAR_COLORS.length)]
      p.box(x, y, { cols: 0.2, rows: 0.3, height: 3, color })
      p.box(x, y, { cols: 0.16, rows: 0.16, height: 2, elevation: 3, color: '#b3e5fc' })
    }
  }

  private drawRoad(p: IsoPainter) {
    const { connections } = this.properties
    const { ctx } = p
    const has = (d: Direction) => connections.includes(d)
    const s = 0.14
    p.ground(0, 0, 1, 1, '#c9c1b3')
    p.ground(
      has('W') ? 0 : s,
      has('N') ? 0 : s,
      has('E') ? 1 : 1 - s,
      has('S') ? 1 : 1 - s,
      '#474a50',
    )
    const straightEW = has('E') && has('W') && !has('N') && !has('S')
    const straightNS = has('N') && has('S') && !has('E') && !has('W')
    if (straightEW || straightNS) {
      ctx.strokeStyle = p.c('#f1ead6')
      ctx.lineWidth = 1.5
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      if (straightEW) {
        ctx.moveTo(...p.at(0, 0.5))
        ctx.lineTo(...p.at(1, 0.5))
      } else {
        ctx.moveTo(...p.at(0.5, 0))
        ctx.lineTo(...p.at(0.5, 1))
      }
      ctx.stroke()
      ctx.setLineDash([])
    }
  }
}
