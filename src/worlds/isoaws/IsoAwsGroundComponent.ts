import type { GameComponentProperties, IGameComponent } from '../../../lib/game.types'
import { AbstractGameComponent } from '../../../lib'
import {
  ellipsis,
  GROUND_COLORS,
  groundText,
  IsoPainter,
  isVisible,
  mix,
  shade,
  TIER_COLORS,
  TIER_GLOW,
  AWS,
  type AwsScene,
  type Point,
} from './isoaws.draw.ts'
import type { Subnet } from './isoaws.inventory.ts'
import { GROUND, groundAt, type CityLayout, type Rect } from './isoaws.layout.ts'

export interface IsoAwsGroundComponentProps extends GameComponentProperties {
  tileSize: number
  layout: CityLayout
  scene: AwsScene
}

const SLAB_DEPTH = 26

/**
 * The whole ground of the city in one component: the slab, land, campuses, plots and the
 * painted labels. It is the only component on the (unsorted) ground layer, placed on cell (0, 0),
 * and draws only the cells in view. Cells of one color are filled as one path.
 */
export class IsoAwsGroundComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoAwsGroundComponentProps

  public readonly componentType: string = 'IsoAwsGround'

  constructor(properties: IsoAwsGroundComponentProps) {
    super(properties)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { tileSize, layout, scene } = this.properties
    const p = new IsoPainter(ctx, tileSize, scene.night, [this.x, this.y])
    const night = scene.night

    // the islands, back to front: the sides of the slab, and the land on top
    const islands = [...layout.districts].sort(
      (a, b) =>
        a.rect.col +
        a.rect.cols +
        a.rect.row +
        a.rect.rows -
        (b.rect.col + b.rect.cols + b.rect.row + b.rect.rows),
    )
    for (const d of islands) if (this.rectVisible(p, d.rect)) this.drawIsland(p, d.rect)

    // areas are filled as one polygon each, one path per color
    const paths = new Map<string, Path2D>()
    const area = (r: Rect, color: string) => {
      if (!this.rectVisible(p, r)) return
      let path = paths.get(color)
      if (!path) paths.set(color, (path = new Path2D()))
      const corners = [
        p.at(r.col, r.row),
        p.at(r.col + r.cols, r.row),
        p.at(r.col + r.cols, r.row + r.rows),
        p.at(r.col, r.row + r.rows),
      ]
      path.moveTo(...corners[0])
      corners.slice(1).forEach((c) => path!.lineTo(...c))
      path.closePath()
    }
    for (const d of layout.districts) {
      for (const c of d.campuses) {
        area(c.rect, GROUND_COLORS.campus)
        for (const plot of c.plots) area(plot.rect, TIER_COLORS[plot.subnet.tier])
      }
      for (const park of d.parks) area(park, GROUND_COLORS.park)
    }
    for (const [color, path] of paths) {
      ctx.fillStyle = p.c(color)
      ctx.fill(path)
    }

    for (const d of layout.districts) {
      this.drawDistrict(p, d.rect, d.district.region, d.district.account)
      for (const c of d.campuses) {
        if (!this.rectVisible(p, c.rect)) continue
        this.outline(p, c.rect, 0.12, mix(AWS.networking, '#ffffff', 0.2), 2.5, night)
        this.drawGateway(p, c.gateway, c.vpc.name, c.vpc.cidr, c.vpc.isDefault)
        c.zones.forEach((az, z) => {
          // the zone names at the back of each column of plots, on the border
          const plotCols = (c.rect.cols - 1) / c.zones.length - 1
          const [x, y] = p.at(c.rect.col + 1 + z * (plotCols + 1) + 0.15, c.rect.row + 0.5)
          groundText(p.ctx, az, x, y, 16, night > 0.5 ? '#d9ccff' : '#4c3b8f', {
            maxWidth: plotCols * 64 - 20,
          })
        })
        for (const plot of c.plots) this.drawPlot(p, plot.rect, plot.subnet)
      }
      const park = d.parks[0]
      if (park && this.rectVisible(p, park)) {
        const [x, y] = p.at(park.col + 0.1, park.row - 0.3)
        groundText(
          p.ctx,
          d.district.key === 'global' ? 'EDGE LOCATIONS' : 'REGIONAL SERVICES',
          x,
          y,
          13,
          night > 0.5 ? '#c8f5b8' : '#2f5a26',
        )
      }
    }
  }

  private rectVisible(p: IsoPainter, r: Rect) {
    const [x, y] = p.at(r.col + r.cols / 2, r.row + r.rows / 2)
    return isVisible(
      this.properties.scene,
      x,
      y,
      (this.properties.tileSize * (r.cols + r.rows)) / 2,
    )
  }

  /** An island: the two front sides of its slab, and the land on top */
  private drawIsland(p: IsoPainter, r: Rect) {
    const down = (pt: Point): Point => [pt[0], pt[1] + SLAB_DEPTH]
    const back = p.at(r.col, r.row)
    const right = p.at(r.col + r.cols, r.row)
    const front = p.at(r.col + r.cols, r.row + r.rows)
    const left = p.at(r.col, r.row + r.rows)
    p.poly([left, front, down(front), down(left)], shade(p.c(GROUND_COLORS.slab), -0.1))
    p.poly([front, right, down(right), down(front)], shade(p.c(GROUND_COLORS.slab), -0.35))
    p.poly([back, right, front, left], p.c(GROUND_COLORS.land))
    // a glowing edge at night
    if (p.night > 0) {
      const ctx = p.ctx
      ctx.save()
      ctx.globalAlpha = p.night
      ctx.strokeStyle = AWS.orange
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(...down(left))
      ctx.lineTo(...down(front))
      ctx.lineTo(...down(right))
      ctx.stroke()
      ctx.restore()
    }
  }

  /** A rectangle's outline on the ground, inset by `inset` cells */
  private outline(
    p: IsoPainter,
    r: Rect,
    inset: number,
    color: string,
    width: number,
    glow: number,
  ) {
    const ctx = p.ctx
    const corners = [
      p.at(r.col + inset, r.row + inset),
      p.at(r.col + r.cols - inset, r.row + inset),
      p.at(r.col + r.cols - inset, r.row + r.rows - inset),
      p.at(r.col + inset, r.row + r.rows - inset),
    ]
    ctx.save()
    ctx.beginPath()
    corners.forEach((c, i) => (i ? ctx.lineTo(...c) : ctx.moveTo(...c)))
    ctx.closePath()
    ctx.strokeStyle = color
    ctx.globalAlpha = 0.55 + glow * 0.45
    ctx.lineWidth = width
    if (glow > 0.5) {
      ctx.shadowColor = color
      ctx.shadowBlur = 6
    }
    ctx.stroke()
    ctx.restore()
  }

  private drawDistrict(p: IsoPainter, r: Rect, region: string, account: string) {
    if (!this.rectVisible(p, r)) return
    const night = p.night
    const [x, y] = p.at(r.col + 2, r.row + 1.75)
    const title = region === 'global' ? 'GLOBAL' : region.toUpperCase()
    groundText(p.ctx, title, x, y, 46, night > 0.5 ? AWS.orange : AWS.ink, {
      glow: night > 0.5 ? 10 : 0,
      maxWidth: (r.cols - 4) * 64,
    })
    if (account) {
      const [ax, ay] = p.at(r.col + 2, r.row + 2.65)
      groundText(p.ctx, `ACCOUNT ${account}`, ax, ay, 18, night > 0.5 ? '#ffd8a0' : '#4b5563', {
        weight: 'normal',
      })
    }
  }

  private drawGateway(p: IsoPainter, r: Rect, name: string, cidr: string, isDefault: boolean) {
    const night = p.night
    const [x, y] = p.at(r.col + 0.1, r.row + 0.35)
    const label = `${ellipsis(name, 28)}${isDefault ? ' (default)' : ''}`
    groundText(p.ctx, `VPC ${label}`, x, y, 24, night > 0.5 ? '#e4d9ff' : AWS.networking, {
      maxWidth: (r.cols - 1.2) * 64,
    })
    const [cx, cy] = p.at(r.col + 0.1, r.row + 0.72)
    groundText(p.ctx, cidr, cx, cy, 19, night > 0.5 ? '#b9a6ff' : '#4c3b8f', { weight: 'normal' })
  }

  private drawPlot(p: IsoPainter, r: Rect, subnet: Subnet) {
    if (!this.rectVisible(p, r)) return
    const ctx = p.ctx
    const night = p.night
    const glow = TIER_GLOW[subnet.tier]
    this.outline(
      p,
      r,
      0.05,
      night > 0.5 ? glow : shade(TIER_COLORS[subnet.tier], -0.35),
      1.5,
      night,
    )

    // the label row at the back: name, CIDR and zone
    const ink = night > 0.5 ? glow : shade(TIER_COLORS[subnet.tier], -0.6)
    const [x, y] = p.at(r.col + 0.12, r.row + 0.3)
    groundText(ctx, ellipsis(subnet.name, 30), x, y, 21, ink, { maxWidth: r.cols * 64 - 16 })
    const [x2, y2] = p.at(r.col + 0.12, r.row + 0.65)
    groundText(ctx, `${subnet.cidr} · ${subnet.az.slice(-2)}`, x2, y2, 17, ink, {
      weight: 'normal',
      maxWidth: r.cols * 64 - 16,
    })

    // the address usage gauge along the front edge of the plot
    const used = subnet.capacity > 0 ? 1 - subnet.available / subnet.capacity : 0
    const a = p.at(r.col + 0.15, r.row + r.rows - 0.12)
    const b = p.at(r.col + r.cols - 0.15, r.row + r.rows - 0.12)
    const at = (t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineWidth = 3
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'
    ctx.beginPath()
    ctx.moveTo(...a)
    ctx.lineTo(...b)
    ctx.stroke()
    ctx.strokeStyle = used > 0.8 ? '#ff5252' : used > 0.5 ? '#ffca28' : glow
    ctx.beginPath()
    ctx.moveTo(...a)
    ctx.lineTo(...at(Math.max(0.02, Math.min(1, used))))
    ctx.stroke()
    ctx.restore()
  }
}
