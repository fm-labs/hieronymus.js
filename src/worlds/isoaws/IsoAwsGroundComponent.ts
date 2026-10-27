import type { GameComponentProperties, IGameComponent } from '../../../lib/game.types'
import { AbstractGameComponent } from '../../../lib'
import {
  ellipsis,
  groundText,
  hexAlpha,
  IsoPainter,
  isVisible,
  mix,
  shade,
  TIER_COLORS,
  TIER_GLOW,
  AWS,
  PLATE,
  REGION_COLORS,
  type AwsScene,
  type Point,
} from './isoaws.draw.ts'
import type { Subnet } from './isoaws.inventory.ts'
import type { CityLayout, DistrictLayout, Rect } from './isoaws.layout.ts'

export interface IsoAwsGroundComponentProps extends GameComponentProperties {
  tileSize: number
  layout: CityLayout
  scene: AwsScene
}

const SLAB_DEPTH = 26
/** Dimmed captions on the plates, as in isocontainers */
const MUTED = '#8a9894'
/** The VPCs and the park are faint tinted fields on the plate, like the isocontainers regions */
const CAMPUS_FIELD = hexAlpha(AWS.networking, 0.07)
const PARK_FIELD = hexAlpha(TIER_GLOW.public, 0.05)

/**
 * The whole ground of the city in one component: the slab, land, campuses, plots and the
 * painted labels. It is the only component on the (unsorted) ground layer, placed on cell (0, 0),
 * and draws only the cells in view. Cells of one color are filled as one path.
 */
export class IsoAwsGroundComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoAwsGroundComponentProps

  public readonly componentType: string = 'IsoAwsGround'

  /** The color of each region, in order of appearance; a region in several accounts keeps one */
  private readonly regionColors = new Map<string, string>()
  private readonly captions = new Map<DistrictLayout, string>()

  constructor(properties: IsoAwsGroundComponentProps) {
    super(properties)
    for (const d of properties.layout.districts) {
      this.captions.set(d, IsoAwsGroundComponent.caption(d))
      const { district } = d
      if (this.regionColors.has(district.region)) continue
      this.regionColors.set(
        district.region,
        REGION_COLORS[this.regionColors.size % REGION_COLORS.length],
      )
    }
  }

  private regionColor(region: string) {
    return this.regionColors.get(region) ?? REGION_COLORS[0]
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { tileSize, layout, scene } = this.properties
    const p = new IsoPainter(ctx, tileSize, scene.night, [this.x, this.y])

    // the plates, back to front: the slab, its floor and the rim
    const islands = [...layout.districts].sort(
      (a, b) =>
        a.rect.col +
        a.rect.cols +
        a.rect.row +
        a.rect.rows -
        (b.rect.col + b.rect.cols + b.rect.row + b.rect.rows),
    )
    for (const d of islands)
      if (this.rectVisible(p, d.rect))
        this.drawIsland(p, d.rect, this.regionColor(d.district.region))

    // areas are filled as one polygon each, one path per color; rgba colors are see-through
    // fields on the dark plate, and are not darkened at night
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
        area(c.rect, CAMPUS_FIELD)
        for (const plot of c.plots) area(plot.rect, TIER_COLORS[plot.subnet.tier])
      }
      for (const park of d.parks) area(park, PARK_FIELD)
    }
    for (const [color, path] of paths) {
      ctx.fillStyle = color.startsWith('rgba') ? color : p.c(color)
      ctx.fill(path)
    }

    for (const d of layout.districts) {
      this.drawDistrict(p, d)
      for (const c of d.campuses) {
        if (!this.rectVisible(p, c.rect)) continue
        this.outline(p, c.rect, 0.12, mix(AWS.networking, '#ffffff', 0.2), 2, 1)
        this.drawGateway(p, c.gateway, c.vpc.name, c.vpc.cidr, c.vpc.isDefault)
        c.zones.forEach((az, z) => {
          // the zone names at the back of each column of plots, on the border
          const plotCols = (c.rect.cols - 1) / c.zones.length - 1
          const [x, y] = p.at(c.rect.col + 1 + z * (plotCols + 1) + 0.15, c.rect.row + 0.5)
          groundText(p.ctx, az.toUpperCase(), x, y, 14, '#d9ccff', {
            spacing: 2,
            maxWidth: plotCols * 64 - 20,
          })
        })
        for (const plot of c.plots) this.drawPlot(p, plot.rect, plot.subnet)
      }
      const park = d.parks[0]
      if (park && this.rectVisible(p, park)) {
        // a dashed edge, like the region fields of isocontainers
        ctx.save()
        ctx.setLineDash([10, 7])
        this.outline(p, park, 0.08, TIER_GLOW.public, 1.5, 0.3)
        ctx.restore()
        const [x, y] = p.at(park.col + 0.1, park.row - 0.35)
        groundText(
          p.ctx,
          d.district.key === 'global' ? 'EDGE LOCATIONS' : 'REGIONAL SERVICES',
          x,
          y,
          14,
          '#c8f5b8',
          { spacing: 2 },
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

  /**
   * A region plate in the look of 'isocontainers': a soft shadow below, a slab with rounded corners
   * that darkens toward its underside, a floor lit from the back, and a glowing rim in the region's
   * color. It is drawn in grid space, so the rounded rectangle lies flat on the ground.
   */
  private drawIsland(p: IsoPainter, r: Rect, color: string) {
    const ctx = p.ctx
    const [ox, oy] = p.at(0, 0)
    const [cx, cy] = p.at(1, 0)
    const [rx, ry] = p.at(0, 1)
    // a cell is this many pixels across, so line widths can be given in pixels
    const cell = Math.hypot(cx - ox, cy - oy)
    /** The plate's outline `dy` pixels lower, `grow` cells wider on each side */
    const plate = (dy: number, draw: () => void, grow = 0) => {
      ctx.save()
      ctx.setTransform(ctx.getTransform().translate(0, dy))
      ctx.transform(cx - ox, cy - oy, rx - ox, ry - oy, ox, oy)
      ctx.beginPath()
      ctx.roundRect(
        r.col - grow,
        r.row - grow,
        r.cols + grow * 2,
        r.rows + grow * 2,
        PLATE.radius + grow,
      )
      draw()
      ctx.restore()
    }

    // the shadow below, so the plate seems to hover: a few soft layers instead of a costly blur
    for (let i = 0; i < 4; i++) {
      plate(
        SLAB_DEPTH + 24,
        () => {
          ctx.fillStyle = 'rgba(0,0,0,0.06)'
          ctx.fill()
        },
        0.1 + i * 0.3,
      )
    }

    // the slab's edge, from its dark underside up to the floor
    const steps = Math.ceil(SLAB_DEPTH / 2)
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      plate(SLAB_DEPTH * (1 - t), () => {
        ctx.fillStyle = mix(PLATE.under, PLATE.edge, t)
        ctx.fill()
      })
    }
    // the lip under the rim catches a little light, the underside a little less
    for (const [dy, alpha] of [
      [SLAB_DEPTH, 0.07],
      [4, 0.16],
    ]) {
      plate(dy, () => {
        ctx.strokeStyle = `rgba(225,236,231,${alpha})`
        ctx.lineWidth = 1.5 / cell
        ctx.stroke()
      })
    }

    plate(0, () => {
      // the floor: lit from the back, darker toward the front edges
      const fx = r.col + r.cols * 0.35
      const fy = r.row + r.rows * 0.3
      const floor = ctx.createRadialGradient(fx, fy, 0, fx, fy, Math.hypot(r.cols, r.rows) * 0.8)
      floor.addColorStop(0, PLATE.floorLit)
      floor.addColorStop(1, PLATE.floor)
      ctx.fillStyle = floor
      ctx.fill()
      // the tiles, one per cell; they fade out from far away before they turn into a moiré
      const t = ctx.getTransform()
      const onScreen = (cell * Math.hypot(t.a, t.b)) / Math.hypot(cx - ox, cy - oy)
      const tiles = Math.min(1, Math.max(0, (onScreen - 8) / 16))
      if (tiles > 0) {
        ctx.save()
        ctx.clip()
        ctx.beginPath()
        for (let c = r.col + 1; c < r.col + r.cols; c++) {
          ctx.moveTo(c, r.row)
          ctx.lineTo(c, r.row + r.rows)
        }
        for (let w = r.row + 1; w < r.row + r.rows; w++) {
          ctx.moveTo(r.col, w)
          ctx.lineTo(r.col + r.cols, w)
        }
        ctx.strokeStyle = `rgba(200,220,212,${0.05 * tiles})`
        ctx.lineWidth = 1 / cell
        ctx.stroke()
        ctx.restore()
        ctx.beginPath()
        ctx.roundRect(r.col, r.row, r.cols, r.rows, PLATE.radius)
      }
      // the rim in the region's color, with a glow
      ctx.shadowColor = hexAlpha(color, 0.4)
      ctx.shadowBlur = 8
      ctx.strokeStyle = mix(color, '#ffffff', 0.2)
      ctx.lineWidth = 3.5 / cell
      ctx.stroke()
    })
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

  /** The region's name in its color, and a caption below it, as on the isocontainers regions */
  private drawDistrict(p: IsoPainter, d: DistrictLayout) {
    const r = d.rect
    if (!this.rectVisible(p, r)) return
    const { region } = d.district
    const [x, y] = p.at(r.col + 2, r.row + 1.75)
    const title = region === 'global' ? 'GLOBAL' : region.toUpperCase()
    groundText(p.ctx, title, x, y, 40, this.regionColor(region), {
      glow: 10,
      spacing: 6,
      maxWidth: (r.cols - 4) * 64,
    })
    const [ax, ay] = p.at(r.col + 2, r.row + 2.65)
    groundText(p.ctx, this.captions.get(d) ?? '', ax, ay, 15, MUTED, {
      weight: '600',
      spacing: 2,
      maxWidth: (r.cols - 4) * 64,
    })
  }

  /** E.g. 'ACCOUNT 123456789012 · 2 VPCS · 4/8 EC2 UP · 12 SERVICES' */
  private static caption({ district }: DistrictLayout): string {
    const instances = district.vpcs
      .flatMap((v) => v.subnets.flatMap((s) => s.resources))
      .filter((r) => r.kind === 'instance')
    const up = instances.filter((r) => r.state === 'running').length
    const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 'S'}`
    return [
      district.account && `ACCOUNT ${district.account}`,
      district.vpcs.length && plural(district.vpcs.length, 'VPC'),
      instances.length && `${up}/${instances.length} EC2 UP`,
      district.services.length && plural(district.services.length, 'SERVICE'),
    ]
      .filter(Boolean)
      .join(' · ')
  }

  private drawGateway(p: IsoPainter, r: Rect, name: string, cidr: string, isDefault: boolean) {
    const [x, y] = p.at(r.col + 0.1, r.row + 0.35)
    const label = `${ellipsis(name, 28)}${isDefault ? ' (default)' : ''}`
    groundText(p.ctx, `VPC ${label}`, x, y, 22, '#e4d9ff', {
      maxWidth: (r.cols - 1.2) * 64,
    })
    const [cx, cy] = p.at(r.col + 0.1, r.row + 0.72)
    groundText(p.ctx, cidr, cx, cy, 17, '#b9a6ff', { weight: 'normal' })
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
