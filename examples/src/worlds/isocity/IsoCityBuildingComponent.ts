import type { GameComponentProperties, IGameComponent } from '@fmlabs/hieronimo'
import { AbstractGameComponent } from '@fmlabs/hieronimo'
import { drawIsoBox, drawIsoShadow, isoBoxTop, shadeColor } from './isocity.draw.ts'

/** A point between a and b, t = 0 at a and 1 at b */
const along = (a: [number, number], b: [number, number], t: number): [number, number] => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
]

export type BuildingKind = 'house' | 'shop' | 'office' | 'factory' | 'tree'

export interface IsoCityBuildingComponentProps extends GameComponentProperties {
  tileSize: number
  kind: BuildingKind
  color: string
  /** In pixels, for the main block of the building */
  height: number
  /** Second color, e.g. the roof of a house or the awning of a shop */
  accentColor?: string
}

/**
 * A building (or tree) standing on one cell. The position is the top corner of the cell,
 * so it is depth-sorted like every other tile.
 */
export class IsoCityBuildingComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoCityBuildingComponentProps

  public static readonly defaultProperties: IsoCityBuildingComponentProps = {
    tileSize: 64,
    kind: 'house',
    color: '#e0c9a6',
    height: 16,
  }

  public readonly componentType: string = 'IsoCityBuilding'

  /** Seconds since start, animates the smoke of factories */
  private time = Math.random() * 10

  constructor(properties: Partial<IsoCityBuildingComponentProps>) {
    super({ ...IsoCityBuildingComponent.defaultProperties, ...properties })
  }

  update(deltaTime: number): void {
    this.time += deltaTime / 1000
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const { tileSize } = this.properties
    // center of the cell
    const x = this.x
    const y = this.y + tileSize / 4

    switch (this.properties.kind) {
      case 'house':
        return this.drawHouse(ctx, x, y)
      case 'shop':
        return this.drawShop(ctx, x, y)
      case 'office':
        return this.drawOffice(ctx, x, y)
      case 'factory':
        return this.drawFactory(ctx, x, y)
      case 'tree':
        return this.drawTree(ctx, x, y)
    }
  }

  private drawHouse(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const { tileSize, color, height, accentColor = '#b5523b' } = this.properties
    const box = { cols: 0.6, rows: 0.6, height, color }
    drawIsoShadow(ctx, tileSize, x, y, box.cols, box.rows)
    drawIsoBox(ctx, tileSize, x, y, box)

    // pyramid roof: only the two front faces are visible
    const [, right, front, left] = isoBoxTop(tileSize, x, y, { ...box, cols: 0.7, rows: 0.7 })
    const apex: [number, number] = [x, y - height - tileSize / 4]
    const face = (a: [number, number], b: [number, number], fill: string) => {
      ctx.beginPath()
      ctx.moveTo(a[0], a[1])
      ctx.lineTo(b[0], b[1])
      ctx.lineTo(apex[0], apex[1])
      ctx.closePath()
      ctx.fillStyle = fill
      ctx.fill()
    }
    face(left, front, accentColor)
    face(front, right, shadeColor(accentColor, -0.3))

    // a door in the middle of the front-left side
    const [, , frontBase, leftBase] = isoBoxTop(tileSize, x, y, { ...box, height: 0 })
    const doorLeft = along(leftBase, frontBase, 0.4)
    const doorRight = along(leftBase, frontBase, 0.6)
    const doorHeight = Math.min(12, height * 0.7)
    ctx.fillStyle = shadeColor(color, -0.55)
    ctx.beginPath()
    ctx.moveTo(doorLeft[0], doorLeft[1])
    ctx.lineTo(doorRight[0], doorRight[1])
    ctx.lineTo(doorRight[0], doorRight[1] - doorHeight)
    ctx.lineTo(doorLeft[0], doorLeft[1] - doorHeight)
    ctx.closePath()
    ctx.fill()
  }

  private drawShop(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const { tileSize, color, height, accentColor = '#e53935' } = this.properties
    drawIsoShadow(ctx, tileSize, x, y, 0.8, 0.8)
    drawIsoBox(ctx, tileSize, x, y, { cols: 0.8, rows: 0.8, height, color })
    // a striped awning around the front, and a flat sign on the roof
    drawIsoBox(ctx, tileSize, x, y, {
      cols: 0.86,
      rows: 0.86,
      height: 3,
      elevation: height * 0.55,
      color: accentColor,
    })
    drawIsoBox(ctx, tileSize, x, y, {
      cols: 0.3,
      rows: 0.08,
      height: 7,
      elevation: height,
      color: '#fafafa',
    })
  }

  private drawOffice(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const { tileSize, color, height } = this.properties
    const box = { cols: 0.7, rows: 0.7, height, color }
    drawIsoShadow(ctx, tileSize, x, y, box.cols, box.rows)
    drawIsoBox(ctx, tileSize, x, y, box)

    // window rows on both visible sides
    const [, right, front, left] = isoBoxTop(tileSize, x, y, box)
    ctx.strokeStyle = 'rgba(200,230,255,0.55)'
    ctx.lineWidth = 2
    for (let floor = 8; floor < height - 4; floor += 8) {
      for (const [a, b] of [
        [left, front],
        [front, right],
      ]) {
        const start = along(a, b, 0.12)
        const end = along(a, b, 0.88)
        ctx.beginPath()
        ctx.moveTo(start[0], start[1] + floor)
        ctx.lineTo(end[0], end[1] + floor)
        ctx.stroke()
      }
    }
    // a small block on the roof
    drawIsoBox(ctx, tileSize, x, y, {
      cols: 0.25,
      rows: 0.25,
      height: 6,
      elevation: height,
      color: shadeColor(color, -0.2),
    })
  }

  private drawFactory(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const { tileSize, color, height, accentColor = '#8d6e63' } = this.properties
    drawIsoShadow(ctx, tileSize, x, y, 0.85, 0.7)
    // the chimney stands at the back, so it is drawn before the hall
    const [cx, cy] = [x + tileSize * 0.12, y - tileSize * 0.08]
    const chimneyHeight = height + 26
    drawIsoBox(ctx, tileSize, cx, cy, {
      cols: 0.14,
      rows: 0.14,
      height: chimneyHeight,
      color: accentColor,
    })
    drawIsoBox(ctx, tileSize, x, y + tileSize * 0.04, { cols: 0.85, rows: 0.6, height, color })

    // smoke puffs rising from the chimney
    for (let i = 0; i < 3; i++) {
      const t = (this.time * 0.6 + i / 3) % 1
      ctx.fillStyle = `rgba(220,220,220,${0.6 * (1 - t)})`
      ctx.beginPath()
      ctx.arc(cx + t * 10, cy - chimneyHeight - 6 - t * 26, 3 + t * 6, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private drawTree(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const { tileSize, color, height } = this.properties
    drawIsoShadow(ctx, tileSize, x, y, 0.35, 0.35)
    drawIsoBox(ctx, tileSize, x, y, {
      cols: 0.08,
      rows: 0.08,
      height: height * 0.45,
      color: '#6d4c41',
    })
    const radius = tileSize * 0.16
    const cy = y - height * 0.45 - radius * 0.6
    const gradient = ctx.createRadialGradient(x - radius / 3, cy - radius / 3, 1, x, cy, radius)
    gradient.addColorStop(0, shadeColor(color, 0.25))
    gradient.addColorStop(1, shadeColor(color, -0.25))
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, cy, radius, 0, Math.PI * 2)
    ctx.fill()
  }
}
