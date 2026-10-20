import type { GameComponentProperties, IGameComponent } from '../../../lib/game.types'
import { AbstractGameComponent } from '../../../lib'
import { DIRECTION_VECTORS, type Direction } from '../isocity/isocity.traffic.ts'
import { IsoPainter, isoOffset } from './isovienna.draw.ts'
import type { ViennaScene } from './isovienna.map.ts'

export type ViennaVehicleKind = 'car' | 'taxi' | 'bus' | 'fiaker' | 'tram'

export interface IsoViennaVehicleComponentProps extends GameComponentProperties {
  tileSize: number
  kind: ViennaVehicleKind
  color: string
  direction: Direction
  scene: ViennaScene
}

const SIZES: Record<ViennaVehicleKind, { length: number; width: number; height: number }> = {
  car: { length: 0.32, width: 0.19, height: 6 },
  taxi: { length: 0.32, width: 0.19, height: 6 },
  bus: { length: 0.58, width: 0.22, height: 12 },
  fiaker: { length: 0.22, width: 0.18, height: 8 },
  tram: { length: 0.66, width: 0.2, height: 12 },
}

/**
 * A car, a taxi, a red city bus, a horse-drawn fiaker or a red-and-white tram on the Ring.
 * The position is the top corner of a cell centered on the vehicle.
 */
export class IsoViennaVehicleComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoViennaVehicleComponentProps

  public readonly componentType: string = 'IsoViennaVehicle'

  constructor(properties: IsoViennaVehicleComponentProps) {
    super(properties)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { tileSize, kind, color, direction, scene } = this.properties
    const p = new IsoPainter(ctx, tileSize, scene.night)
    const x = this.x
    const y = this.y + tileSize / 4
    const { length, width, height } = SIZES[kind]
    const v = DIRECTION_VECTORS[direction]
    const alongCols = v.col !== 0
    const cols = alongCols ? length : width
    const rows = alongCols ? width : length
    const forward = (distance: number): [number, number] => {
      const [dx, dy] = isoOffset(tileSize, v.col * distance, v.row * distance)
      return [x + dx, y + dy]
    }

    if (scene.night > 0 && kind !== 'fiaker') {
      const [hx, hy] = forward(length / 2 + 0.2)
      p.light(hx, hy, 15, 'rgba(255,240,190,1)', scene.night * 0.5)
    }

    if (kind === 'fiaker') return this.drawFiaker(p, x, y, cols, rows, forward)

    p.shadow(x, y, cols, rows)
    if (kind === 'tram') {
      p.box(x, y, { cols, rows, height: 4, color: '#f2f2f2' })
      p.box(x, y, { cols, rows, height: 8, elevation: 4, color: '#d32f2f' })
      // a window band and the pantograph
      p.box(x, y, {
        cols: cols + 0.004,
        rows: rows + 0.004,
        height: 3,
        elevation: 7,
        color: scene.night > 0.3 ? '#ffe3a0' : '#37474f',
      })
      p.box(x, y, {
        cols: cols * 0.3,
        rows: rows * 0.6,
        height: 1,
        elevation: height,
        color: '#9e9e9e',
      })
      ctx.strokeStyle = p.c('#424242')
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.moveTo(x - 3, y - height - 1)
      ctx.lineTo(x, y - height - 7)
      ctx.lineTo(x + 3, y - height - 1)
      ctx.stroke()
    } else if (kind === 'bus') {
      p.box(x, y, { cols, rows, height, color })
      p.box(x, y, {
        cols: cols + 0.004,
        rows: rows + 0.004,
        height: 4,
        elevation: 5,
        color: scene.night > 0.3 ? '#ffe3a0' : '#37474f',
      })
      p.box(x, y, { cols, rows, height: 1, elevation: height, color: '#eeeeee' })
    } else {
      p.box(x, y, { cols, rows, height, color })
      const [dx, dy] = isoOffset(tileSize, -v.col * 0.03, -v.row * 0.03)
      p.box(x + dx, y + dy, {
        cols: cols * (alongCols ? 0.55 : 0.85),
        rows: rows * (alongCols ? 0.85 : 0.55),
        height: 4,
        elevation: height,
        color: '#b3d4e6',
      })
      if (kind === 'taxi') {
        p.box(x + dx, y + dy, {
          cols: 0.07,
          rows: 0.05,
          height: 2.5,
          elevation: height + 4,
          color: '#ffd54f',
        })
      }
    }

    if (scene.night > 0) {
      const [fx, fy] = forward(length / 2)
      const [bx, by] = forward(-length / 2)
      ctx.globalAlpha = scene.night
      ctx.fillStyle = '#fff6d0'
      ctx.beginPath()
      ctx.arc(fx, fy - 3, 1.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ff3030'
      ctx.beginPath()
      ctx.arc(bx, by - 3, 1.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
  }

  /** Two horses pulling a black carriage, the coachman in a bowler hat */
  private drawFiaker(
    p: IsoPainter,
    x: number,
    y: number,
    cols: number,
    rows: number,
    forward: (distance: number) => [number, number],
  ) {
    const { ctx } = p
    const { time } = this.properties.scene
    const [cx, cy] = forward(-0.08)
    p.shadow(cx, cy, cols, rows)
    // the carriage
    p.box(cx, cy, { cols: cols * 0.9, rows: rows * 0.9, height: 5, elevation: 3, color: '#1f1f1f' })
    p.box(cx, cy, { cols: cols * 0.5, rows: rows * 0.8, height: 6, elevation: 8, color: '#2b2b2b' })
    // wheels
    ctx.fillStyle = p.c('#5d4037')
    ctx.beginPath()
    ctx.arc(cx - 3, cy, 2.5, 0, Math.PI * 2)
    ctx.arc(cx + 3, cy, 2.5, 0, Math.PI * 2)
    ctx.fill()
    // the coachman
    ctx.fillStyle = p.c('#2b2b2b')
    ctx.fillRect(cx - 1, cy - 17, 2.5, 4)
    ctx.fillRect(cx - 2, cy - 18, 4.5, 1.2)
    // the horses, trotting
    const trot = Math.sin(time * 10) * 0.8
    for (const side of [-1.6, 1.6]) {
      const [hx, hy] = forward(0.17)
      const color = side < 0 ? '#f5f5f5' : '#6d4c41'
      ctx.fillStyle = p.c(color)
      ctx.beginPath()
      ctx.ellipse(hx + side, hy - 6 + trot, 3.4, 2.2, 0, 0, Math.PI * 2)
      ctx.fill()
      const [nx, ny] = forward(0.24)
      ctx.beginPath()
      ctx.ellipse(nx + side, ny - 9 + trot, 1.4, 2.2, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(hx + side - 2, hy - 5, 1, 5)
      ctx.fillRect(hx + side + 1.5, hy - 5 - trot, 1, 5 + trot)
    }
  }
}
