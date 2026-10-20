import type { GameComponentProperties, IGameComponent } from '../../../lib/game.types'
import { AbstractGameComponent } from '../../../lib'
import type { Resource, ResourceKind } from './isoaws.inventory.ts'
import { AWS, ellipsis, IsoPainter, type AwsScene, type Point } from './isoaws.draw.ts'
import { findPlot, type CityLayout } from './isoaws.layout.ts'

export interface IsoAwsLinksComponentProps extends GameComponentProperties {
  tileSize: number
  layout: CityLayout
  scene: AwsScene
}

/** Links that are always shown, by the kind of the resource they start from */
const ALWAYS: Partial<Record<ResourceKind, string>> = {
  'vpn-endpoint': '#b48cff',
  distribution: AWS.orange,
  filesystem: '#9be15d',
}

/** How high above the ground a link starts, per kind of building */
const HEIGHT: Partial<Record<ResourceKind, number>> = {
  'vpn-endpoint': 64,
  distribution: 40,
  'vpn-target': 38,
  instance: 40,
  database: 30,
}

/**
 * Arcs between related resources, drawn above the city on the overlay layer: VPN tunnels,
 * CloudFront origins, EFS mounts, and every relation of the selected resource.
 * Small dots run along each arc, from the source to the target.
 */
export class IsoAwsLinksComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoAwsLinksComponentProps

  public readonly componentType: string = 'IsoAwsLinks'

  constructor(properties: IsoAwsLinksComponentProps) {
    super(properties)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { tileSize, layout, scene } = this.properties
    const p = new IsoPainter(ctx, tileSize, scene.night, [this.x, this.y])

    const anchor = (key: string): Point | undefined => {
      if (key.startsWith('subnet:')) {
        const plot = findPlot(layout, key.slice(7))
        return plot && p.at(plot.rect.col + plot.rect.cols / 2, plot.rect.row + plot.rect.rows / 2)
      }
      const placement = layout.positions.get(key)
      if (!placement) return undefined
      const [x, y] = p.at(placement.col + 0.5, placement.row + 0.5)
      return [x, y - (HEIGHT[placement.resource.kind] ?? 16)]
    }

    for (const { resource } of layout.placements) {
      const color = ALWAYS[resource.kind]
      if (!color || resource.key === scene.selected) continue
      for (const key of resource.links) this.arc(p, anchor(resource.key), anchor(key), color, 0.5)
    }
    const selected = scene.selected ? layout.positions.get(scene.selected)?.resource : undefined
    if (selected) {
      for (const key of selected.links) this.arc(p, anchor(selected.key), anchor(key), '#ffe066', 1)
      // links that point at the selection, e.g. a mount target from its file system
      for (const key of scene.related) {
        const other = layout.positions.get(key)?.resource
        if (other && !selected.links.includes(key) && other.links.includes(selected.key)) {
          this.arc(p, anchor(key), anchor(selected.key), '#ffe066', 1)
        }
      }
      this.label(p, selected, anchor(selected.key))
    }
  }

  private arc(
    p: IsoPainter,
    a: Point | undefined,
    b: Point | undefined,
    color: string,
    strength: number,
  ) {
    if (!a || !b) return
    const ctx = p.ctx
    const { time, night } = this.properties.scene
    const distance = Math.hypot(b[0] - a[0], b[1] - a[1])
    const control: Point = [
      (a[0] + b[0]) / 2,
      (a[1] + b[1]) / 2 - Math.min(220, 30 + distance * 0.35),
    ]
    const at = (t: number): Point => [
      (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * control[0] + t * t * b[0],
      (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * control[1] + t * t * b[1],
    ]
    ctx.save()
    ctx.strokeStyle = color
    ctx.globalAlpha = (0.35 + night * 0.35) * strength + 0.15
    ctx.lineWidth = 1 + strength
    ctx.setLineDash([6, 5])
    ctx.lineDashOffset = -time * 24
    ctx.beginPath()
    ctx.moveTo(...a)
    ctx.quadraticCurveTo(control[0], control[1], b[0], b[1])
    ctx.stroke()
    ctx.setLineDash([])
    // packets travelling along the link
    ctx.globalAlpha = 0.6 + 0.4 * strength
    ctx.fillStyle = color
    const count = Math.max(1, Math.round(distance / 160))
    for (let i = 0; i < count; i++) {
      const [x, y] = at((time * 0.25 + i / count) % 1)
      ctx.beginPath()
      ctx.arc(x, y, 2 + strength, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  /** A name tag above the selected resource */
  private label(p: IsoPainter, resource: Resource, at: Point | undefined) {
    if (!at) return
    const ctx = p.ctx
    const text = ellipsis(resource.name, 36)
    ctx.save()
    ctx.font = 'bold 12px Arial, sans-serif'
    const width = ctx.measureText(text).width + 16
    const [x, y] = [at[0], at[1] - 22]
    ctx.fillStyle = 'rgba(20,24,36,0.88)'
    ctx.strokeStyle = '#ffe066'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(x - width / 2, y - 11, width, 22, 6)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x - 5, y + 11)
    ctx.lineTo(x, y + 17)
    ctx.lineTo(x + 5, y + 11)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, x, y + 1)
    ctx.restore()
  }
}
