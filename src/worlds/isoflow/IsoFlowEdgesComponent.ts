import type { GameComponentProperties, IGameComponent } from '../../../lib/game.types'
import { AbstractGameComponent } from '../../../lib'
import type { FlowEdge, FlowModel, GridPoint } from './isoflow.types.ts'
import { subPath } from './isoflow.layout.ts'
import { edgeGlows } from './isoflow.sim.ts'
import { COLORS, EDGE_Z, FONT, isVisible, type FlowScene } from './isoflow.draw.ts'

export interface IsoFlowEdgesComponentProps extends GameComponentProperties {
  model: FlowModel
  scene: FlowScene
}

/** The length of the glowing part of the data on an edge, in cells */
const GLOW_LENGTH = 1.6

/**
 * The edges between the cards: thin lines on a plane just under the cards, with rounded corners and
 * an arrow at the target. Data moving along an edge is a bright green streak.
 */
export class IsoFlowEdgesComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoFlowEdgesComponentProps

  public readonly componentType: string = 'IsoFlowEdges'

  constructor(properties: IsoFlowEdgesComponentProps) {
    super(properties)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { model } = this.properties
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const e of model.edges) {
      if (!e.path.length || !this.visible(e)) continue
      const focus = this.focus(e)
      ctx.globalAlpha = focus === 'dim' ? 0.22 : 1
      this.line(ctx, e, focus === 'strong')
      if (e.label) this.label(ctx, e)
    }
    // the data on top of all lines
    for (const e of model.edges) {
      if (!e.path.length || !this.visible(e)) continue
      ctx.globalAlpha = this.focus(e) === 'dim' ? 0.35 : 1
      for (const d of edgeGlows(e)) this.glow(ctx, e, d)
    }
    ctx.globalAlpha = 1
  }

  private visible(e: FlowEdge) {
    const a = e.path[0]
    const b = e.path[e.path.length - 1]
    const [x, y] = this.properties.scene.projection.at((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, EDGE_Z)
    const size =
      (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1])) * this.properties.scene.projection.cell
    return isVisible(this.properties.scene, x, y, size + 100)
  }

  /** Edges of the selection (or the hovered card) stand out, the others step back */
  private focus(e: FlowEdge): 'strong' | 'normal' | 'dim' {
    const { lineage, hovered, selected } = this.properties.scene
    const near = (n = hovered) => n && (e.from === n || e.to === n)
    if (near() || near(selected)) return 'strong'
    if (lineage) return lineage.has(e.from) && lineage.has(e.to) ? 'normal' : 'dim'
    return 'normal'
  }

  private screen(points: GridPoint[]): GridPoint[] {
    return points.map(([c, r]) => this.properties.scene.projection.at(c, r, EDGE_Z))
  }

  /** A polyline with rounded corners */
  private trace(ctx: CanvasRenderingContext2D, points: GridPoint[], radius = 10) {
    ctx.beginPath()
    ctx.moveTo(...points[0])
    const dist = (a: GridPoint, b: GridPoint) => Math.hypot(b[0] - a[0], b[1] - a[1])
    for (let i = 1; i < points.length - 1; i++) {
      // a short segment between two corners gets smaller corners, or arcTo loops back
      const r = Math.min(
        radius,
        dist(points[i - 1], points[i]) / 2,
        dist(points[i], points[i + 1]) / 2,
      )
      ctx.arcTo(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], r)
    }
    ctx.lineTo(...points[points.length - 1])
  }

  private line(ctx: CanvasRenderingContext2D, e: FlowEdge, strong: boolean) {
    const points = this.screen(e.path)
    ctx.save()
    if (e.state === 'skipped') ctx.setLineDash([4, 6])
    ctx.strokeStyle =
      e.state === 'done'
        ? 'rgba(62,224,127,0.55)'
        : e.state === 'skipped'
          ? 'rgba(200,220,212,0.16)'
          : strong
            ? COLORS.lineStrong
            : 'rgba(200,220,212,0.32)'
    ctx.lineWidth = strong ? 1.8 : 1.2
    this.trace(ctx, points)
    ctx.stroke()
    ctx.restore()

    // the arrow at the target, pointing along the last segment
    const [x1, y1] = points[points.length - 1]
    const back = this.properties.scene.projection.at(-0.5, 0)
    const [x0, y0] = points[points.length - 2] ?? [x1 + back[0], y1 + back[1]]
    const length = Math.hypot(x1 - x0, y1 - y0) || 1
    const [dx, dy] = [(x1 - x0) / length, (y1 - y0) / length]
    ctx.fillStyle =
      e.state === 'done' ? COLORS.green : strong ? COLORS.text : 'rgba(200,220,212,0.55)'
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x1 - dx * 8 - dy * 4, y1 - dy * 8 + dx * 4)
    ctx.lineTo(x1 - dx * 8 + dy * 4, y1 - dy * 8 - dx * 4)
    ctx.closePath()
    ctx.fill()
  }

  /** The data: a streak that fades toward its tail, with a bright head */
  private glow(ctx: CanvasRenderingContext2D, e: FlowEdge, distance: number) {
    const tail = this.screen(subPath(e, Math.max(0, distance - GLOW_LENGTH), distance))
    const [hx, hy] = tail[tail.length - 1]
    const [tx, ty] = tail[0]
    ctx.save()
    const gradient = ctx.createLinearGradient(tx, ty, hx, hy)
    gradient.addColorStop(0, 'rgba(62,224,127,0)')
    gradient.addColorStop(1, 'rgba(120,255,170,1)')
    ctx.shadowColor = COLORS.green
    ctx.shadowBlur = 14
    ctx.strokeStyle = gradient
    ctx.lineWidth = 4
    this.trace(ctx, tail, 8)
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.strokeStyle = 'rgba(220,255,232,0.9)'
    ctx.lineWidth = 1.4
    ctx.stroke()
    ctx.restore()
  }

  /** The edge's label, painted after its turn toward the target (branches share their start) */
  private label(ctx: CanvasRenderingContext2D, e: FlowEdge) {
    const [c, r] = e.path.length >= 4 ? e.path[2] : e.path[0]
    this.properties.scene.projection.plane(ctx, EDGE_Z, () => {
      ctx.font = `600 14px ${FONT.mono}`
      ctx.textBaseline = 'bottom'
      const text = e.label!.toUpperCase()
      const [x, y] = [c * 64 + 12, r * 64 - 6]
      // a dark backing, so the label stays readable where it sits on another edge
      ctx.fillStyle = 'rgba(8,12,13,0.85)'
      ctx.beginPath()
      ctx.roundRect(x - 4, y - 17, ctx.measureText(text).width + 8, 19, 4)
      ctx.fill()
      ctx.fillStyle = e.state === 'skipped' ? COLORS.faint : COLORS.muted
      ctx.fillText(text, x, y)
    })
  }
}
