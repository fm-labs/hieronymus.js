import type { GameComponentProperties, IGameComponent, MoveDirection } from '@fmlabs/hieronimo'
import { AbstractGameComponent } from '@fmlabs/hieronimo'
import type { SnakeCellKind } from '../snake/SnakeSystem.ts'

export interface IsoSnakeCellComponentProps extends GameComponentProperties {
  tileSize: number
  kind: SnakeCellKind
  color?: string
  direction?: MoveDirection // head only, used to place the eyes
}

const GRID_VECTORS: Record<MoveDirection, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
}

/**
 * A snake segment drawn as an isometric block, or the food drawn as a floating ball.
 * The position is the top corner of the tile diamond, as placed by the isometric grid projection.
 */
export class IsoSnakeCellComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoSnakeCellComponentProps

  public static readonly defaultProperties: IsoSnakeCellComponentProps = {
    tileSize: 64,
    kind: 'body',
    color: '#8bc34a',
    direction: 'right',
  }

  public readonly componentType: string = 'IsoSnakeCell'

  private time = 0

  constructor(properties: Partial<IsoSnakeCellComponentProps>) {
    super({ ...IsoSnakeCellComponent.defaultProperties, ...properties })
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.properties.kind === 'food') {
      this.drawFood(ctx)
    } else {
      this.drawBlock(ctx)
    }
  }

  private drawBlock(ctx: CanvasRenderingContext2D) {
    const { tileSize, kind, color } = this.properties
    const scale = kind === 'head' ? 0.86 : 0.74
    const hw = (tileSize / 2) * scale // half width of the top face
    const hh = (tileSize / 4) * scale // half height of the top face
    const depth = tileSize * (kind === 'head' ? 0.3 : 0.24)
    const cx = this.x
    const cy = this.y + tileSize / 4 // center of the tile diamond
    const top = cy - depth

    // left face
    fillPolygon(ctx, color!, [
      [cx - hw, top],
      [cx, top + hh],
      [cx, cy + hh],
      [cx - hw, cy],
    ])
    fillPolygon(ctx, 'rgba(0,0,0,0.25)', [
      [cx - hw, top],
      [cx, top + hh],
      [cx, cy + hh],
      [cx - hw, cy],
    ])

    // right face
    fillPolygon(ctx, color!, [
      [cx + hw, top],
      [cx, top + hh],
      [cx, cy + hh],
      [cx + hw, cy],
    ])
    fillPolygon(ctx, 'rgba(0,0,0,0.45)', [
      [cx + hw, top],
      [cx, top + hh],
      [cx, cy + hh],
      [cx + hw, cy],
    ])

    // top face
    fillPolygon(ctx, color!, [
      [cx, top - hh],
      [cx + hw, top],
      [cx, top + hh],
      [cx - hw, top],
    ])

    if (kind === 'head') this.drawEyes(ctx, cx, top, hw, hh)
  }

  private drawEyes(ctx: CanvasRenderingContext2D, cx: number, cy: number, hw: number, hh: number) {
    const [dc, dr] = GRID_VECTORS[this.properties.direction || 'right']
    // grid vectors to screen offsets on the top face; the perpendicular is (-dr, dc)
    const toScreen = (c: number, r: number): [number, number] => [(c - r) * hw, (c + r) * hh]
    const [fx, fy] = toScreen(dc, dr)
    const [px, py] = toScreen(-dr, dc)
    const radius = Math.max(1.5, hw * 0.14)

    ctx.fillStyle = '#111'
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(
        cx + fx * 0.4 + px * 0.35 * side,
        cy + fy * 0.4 + py * 0.35 * side,
        radius,
        radius * 0.7,
        0,
        0,
        Math.PI * 2,
      )
      ctx.fill()
    }
  }

  private drawFood(ctx: CanvasRenderingContext2D) {
    const { tileSize, color } = this.properties
    const cx = this.x
    const cy = this.y + tileSize / 4
    const radius = tileSize * 0.16
    const hover = tileSize * (0.22 + 0.06 * Math.sin(this.time / 250))

    // shadow on the ground
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.beginPath()
    ctx.ellipse(cx, cy, radius, radius / 2, 0, 0, Math.PI * 2)
    ctx.fill()

    // ball
    const by = cy - hover
    const gradient = ctx.createRadialGradient(
      cx - radius * 0.4,
      by - radius * 0.4,
      radius * 0.1,
      cx,
      by,
      radius,
    )
    gradient.addColorStop(0, '#ffffff')
    gradient.addColorStop(0.3, color!)
    gradient.addColorStop(1, 'rgba(0,0,0,0.6)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(cx, by, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  update(deltaTime: number): void {
    this.time += deltaTime
  }
}

function fillPolygon(ctx: CanvasRenderingContext2D, fillStyle: string, points: number[][]) {
  ctx.fillStyle = fillStyle
  ctx.beginPath()
  ctx.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1])
  ctx.closePath()
  ctx.fill()
}
