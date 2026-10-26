import type { GameComponentProperties, IGameComponent } from '../../../lib/game.types'
import { AbstractGameComponent } from '../../../lib'
import { linkLength } from './isocontainers.layout.ts'
import { TAIL } from './isocontainers.sim.ts'
import { FLOW_COLORS, FLOW_STYLE } from './IsoContainersGroundComponent.ts'
import {
  POPUP_SECONDS,
  adviceChip,
  popup,
  MARKER_LIFT,
  hasMarker,
  heightOf,
  marker,
  moodOf,
  phaseOf,
  smoke,
} from './isocontainers.fx.ts'
import type { ContainersModel, Entity, GridPoint, Link } from './isocontainers.types.ts'
import {
  blur,
  COLORS,
  PALETTE,
  arcControl,
  focusAlpha,
  hexAlpha,
  pill,
  quadAt,
  stateColor,
  stateText,
  type ContainersScene,
} from './isocontainers.draw.ts'

export interface IsoContainersOverlayComponentProps extends GameComponentProperties {
  model: ContainersModel
  scene: ContainersScene
}

/**
 * Drawn over everything: the links that fly (calls between hosts or without a shared street, second
 * mounts of a volume, networks a container joins away from its lot) with their pulses as glowing dots,
 * and the label of the hovered and the selected entity.
 */
export class IsoContainersOverlayComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoContainersOverlayComponentProps

  public readonly componentType: string = 'IsoContainersOverlay'

  constructor(properties: IsoContainersOverlayComponentProps) {
    super(properties)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { model, scene } = this.properties
    const P = scene.projection
    ctx.lineCap = 'round'

    // networks joined away from the lot: a dashed arc down to the street
    for (const c of model.containers) {
      for (const n of c.flyovers) {
        ctx.globalAlpha = focusAlpha(scene, c, 0.15) * 0.8
        const a = P.at(c.col + c.w / 2, c.row + c.d / 2, c.height)
        const b = P.at(c.col + c.w / 2, n.row, 0)
        ctx.strokeStyle = hexAlpha(n.accent, 0.55)
        ctx.lineWidth = 1.5
        ctx.setLineDash([5, 6])
        ctx.beginPath()
        ctx.moveTo(...a)
        ctx.quadraticCurveTo(...arcControl(a, b), ...b)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = n.accent
        ctx.beginPath()
        ctx.arc(b[0], b[1], 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    for (const l of model.links) {
      if (!l.arc) continue
      // between hosts: only when switched on, or when it belongs to the selection
      if (
        !scene.showCrossHost &&
        l.from &&
        l.from.env !== l.to.env &&
        !(scene.selected && scene.focus?.has(l))
      )
        continue
      const a = P.at(...l.arc.a)
      const b = P.at(...l.arc.b)
      const c = arcControl(a, b)
      const color = this.color(l)
      const strong = scene.focus?.has(l) && !!scene.selected
      ctx.globalAlpha = focusAlpha(scene, l, 0.12)
      ctx.strokeStyle = hexAlpha(color, strong ? 0.8 : 0.42)
      ctx.lineWidth = strong ? 2 : 1.4
      ctx.setLineDash(l.kind === 'mount' ? [4, 5] : [])
      ctx.beginPath()
      ctx.moveTo(...a)
      ctx.quadraticCurveTo(c[0], c[1], ...b)
      ctx.stroke()
      ctx.setLineDash([])
      // the ends
      ctx.fillStyle = color
      for (const p of [a, b]) {
        ctx.beginPath()
        ctx.arc(p[0], p[1], 2.5, 0, Math.PI * 2)
        ctx.fill()
      }
      const tail = TAIL / linkLength(l)
      for (const pulse of l.pulses) {
        const colors = pulse.failed
          ? FLOW_COLORS.failed
          : l.kind === 'mount'
            ? pulse.back
              ? FLOW_COLORS.read
              : FLOW_COLORS.write
            : FLOW_COLORS.call
        const head = pulse.back ? 1 - pulse.t : pulse.t
        this.flow(ctx, a, c, b, head, pulse.back ? head + tail : head - tail, colors)
      }
    }
    ctx.globalAlpha = 1

    // smoke over what burns or burned, then the markers over everything that needs a look
    for (const c of model.containers) {
      const mood = moodOf(c)
      if (mood !== 'burning' && mood !== 'dead') continue
      ctx.globalAlpha = focusAlpha(scene, c, 0.3)
      smoke(ctx, P, c, heightOf(c), scene.time + phaseOf(c) * 10, mood === 'burning')
    }
    for (const c of model.containers) {
      if (!hasMarker(c)) continue
      ctx.globalAlpha = focusAlpha(scene, c, 0.25)
      marker(ctx, P, c, heightOf(c), scene.time, scene.zoom)
    }
    // the advisor's flags: risks and warnings, and the tips while the advisor is open
    for (const c of scene.showAdvice ? model.containers : []) {
      const advice = scene.advice.get(c)
      if (!advice || (advice.severity === 'tip' && !scene.allAdvice)) continue
      ctx.globalAlpha = focusAlpha(scene, c, 0.25)
      adviceChip(ctx, P, c, heightOf(c), advice, scene.time, scene.zoom)
    }
    ctx.globalAlpha = 1
    scene.popups = scene.popups.filter((p) => scene.time - p.born < POPUP_SECONDS)
    for (const p of scene.popups) popup(ctx, P, p, scene.time, scene.zoom)

    const labelled = new Set<Entity>()
    if (scene.hovered) labelled.add(scene.hovered)
    if (scene.selected) labelled.add(scene.selected)
    for (const e of labelled) this.label(ctx, e)
  }

  private color(l: Link): string {
    if (l.kind === 'mount') return PALETTE.volume
    if (l.kind === 'ingress') return COLORS.greenSoft
    if (l.from && l.from.env !== l.to.env) return PALETTE.cross
    return l.network?.accent ?? COLORS.green
  }

  /** A flow along an arc, as on the ground: a streak from its tail to its head, clipped to the arc */
  private flow(
    ctx: CanvasRenderingContext2D,
    a: GridPoint,
    c: GridPoint,
    b: GridPoint,
    head: number,
    tail: number,
    colors: (typeof FLOW_COLORS)['call'],
  ) {
    const [t0, t1] = [Math.max(0, Math.min(head, tail)), Math.min(1, Math.max(head, tail))]
    if (t1 - t0 < 0.005) return
    const points: GridPoint[] = []
    for (let i = 0; i <= 10; i++) points.push(quadAt(a, c, b, t0 + ((t1 - t0) * i) / 10))
    if (head < tail) points.reverse()
    // the gradient spans the whole tail, so a streak draining in fades out at its end
    const [tx, ty] = quadAt(a, c, b, Math.max(-0.2, Math.min(1.2, tail)))
    const [hx, hy] = quadAt(a, c, b, head)
    const gradient = ctx.createLinearGradient(tx, ty, hx, hy)
    gradient.addColorStop(0, hexAlpha(colors.glow, 0))
    gradient.addColorStop(1, colors.head)
    ctx.save()
    ctx.shadowColor = colors.glow
    ctx.shadowBlur = blur(this.properties.scene.zoom, FLOW_STYLE.blur)
    ctx.strokeStyle = gradient
    ctx.lineWidth = FLOW_STYLE.width
    ctx.beginPath()
    ctx.moveTo(...points[0])
    for (const p of points.slice(1)) ctx.lineTo(...p)
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.strokeStyle = colors.core
    ctx.lineWidth = FLOW_STYLE.core
    ctx.stroke()
    ctx.restore()
  }

  private label(ctx: CanvasRenderingContext2D, e: Entity) {
    const P = this.properties.scene.projection
    if (e.type === 'container') {
      // above the marker, if it has one
      const lift = hasMarker(e)
        ? MARKER_LIFT + 30 * Math.max(1, 0.75 / this.properties.scene.zoom)
        : 18
      const [x, y] = P.at(e.col + e.w / 2, e.row + e.d / 2, heightOf(e) + lift)
      pill(ctx, x, y, e.name, stateColor(e), stateText(e))
    } else if (e.type === 'volume') {
      const [x, y] = P.at(e.col, e.row, e.height + 14)
      pill(
        ctx,
        x,
        y,
        e.name.length > 28 ? `${e.name.slice(0, 12)}…` : e.name,
        PALETTE.volume,
        e.size ?? 'VOLUME',
      )
    } else if (e.street) {
      const [x, y] = P.at((e.col0 + e.col1) / 2, e.row, 10)
      pill(ctx, x, y, e.name, e.accent, `${e.members.length} CONTAINERS`)
    }
  }
}
