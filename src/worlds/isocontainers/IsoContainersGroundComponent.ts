import type { GameComponentProperties, IGameComponent } from '../../../lib/game.types'
import { AbstractGameComponent } from '../../../lib'
import { LOT, subPath } from './isocontainers.layout.ts'
import { TAIL, pulseDistances } from './isocontainers.sim.ts'
import { moodOf, phaseOf } from './isocontainers.fx.ts'
import type {
  Container,
  ContainersModel,
  Environment,
  GridPoint,
  Link,
  Network,
} from './isocontainers.types.ts'
import {
  blur,
  COLORS,
  FONT,
  PALETTE,
  U,
  focusAlpha,
  hexAlpha,
  isVisible,
  roundRect,
  trace,
  type ContainersScene,
} from './isocontainers.draw.ts'

export interface IsoContainersGroundComponentProps extends GameComponentProperties {
  model: ContainersModel
  scene: ContainersScene
}

const HALF = LOT.street / 2
/** The faint band of a road under its line */
const BAND = 'rgba(255,255,255,0.022)'
const LINE = 'rgba(200,220,212,0.32)'

/** The colors of a flow: the glow and its gradient head, and the core; soft, so many don't flicker */
export const FLOW_COLORS = {
  call: { glow: COLORS.green, head: 'rgba(120,255,170,0.7)', core: 'rgba(220,255,232,0.55)' },
  read: { glow: PALETTE.volume, head: 'rgba(168,236,255,0.7)', core: 'rgba(225,248,255,0.55)' },
  write: { glow: PALETTE.volume, head: 'rgba(110,214,245,0.7)', core: 'rgba(225,248,255,0.55)' },
  failed: { glow: COLORS.red, head: 'rgba(255,120,124,0.8)', core: 'rgba(255,225,226,0.6)' },
}

/** How a flow is drawn: a thin streak with a faint glow, and a fine core */
export const FLOW_STYLE = { blur: 6, width: 2.6, core: 1 }

/**
 * Everything flat: the plates of the environments with their names, the lots, the avenue and the
 * streets (networks) with their names, the driveways, the volume pipes, the shadows of the buildings,
 * and the packets that travel on the ground. One component, so the ground is never depth sorted.
 */
export class IsoContainersGroundComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoContainersGroundComponentProps

  public readonly componentType: string = 'IsoContainersGround'

  constructor(properties: IsoContainersGroundComponentProps) {
    super(properties)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { model, scene } = this.properties
    const P = scene.projection
    const envs = model.environments.filter((e) => {
      const [x, y] = P.at(e.col + e.cols / 2, e.row + e.rows / 2)
      return isVisible(scene, x, y, (e.cols + e.rows) * P.cell)
    })
    for (const env of envs) this.plate(ctx, env)
    P.plane(ctx, 0, () => {
      for (const env of envs) this.lots(ctx, env)
      for (const env of envs) this.roads(ctx, env)
      for (const env of envs) this.shadows(ctx, env)
    })
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    // the routes of the selection stand out, like the edges of a selected card in isoflow
    if (scene.selected) {
      ctx.strokeStyle = COLORS.lineStrong
      ctx.lineWidth = 1.8
      for (const l of model.links) {
        if (l.arc || !l.path.length || !scene.focus?.has(l) || !envs.includes(l.env)) continue
        trace(
          ctx,
          l.path.map(([c, r]) => P.at(c, r)),
          10,
        )
        ctx.stroke()
      }
    }
    // the flows on top of all lines
    for (const l of model.links) {
      if (l.arc || !l.path.length || !envs.includes(l.env)) continue
      ctx.globalAlpha = focusAlpha(scene, l, 0.3)
      for (const { d, pulse } of pulseDistances(l)) {
        const colors = pulse.failed
          ? FLOW_COLORS.failed
          : l.kind === 'mount'
            ? pulse.back
              ? FLOW_COLORS.read
              : FLOW_COLORS.write
            : FLOW_COLORS.call
        this.flow(ctx, l, d, pulse.back, colors)
      }
    }
    ctx.globalAlpha = 1
  }

  /** A glass plate with a bright rim; the name and the caption along the front edge */
  private plate(ctx: CanvasRenderingContext2D, env: Environment) {
    const P = this.properties.scene.projection
    const [u0, v0, w, h] = [env.col * U, env.row * U, env.cols * U, env.rows * U]
    P.plane(ctx, -8, () => {
      roundRect(ctx, u0, v0, w, h, 48)
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.fill()
    })
    P.plane(ctx, 0, () => {
      roundRect(ctx, u0, v0, w, h, 48)
      const glass = ctx.createLinearGradient(u0, v0, u0 + w, v0 + h)
      glass.addColorStop(0, 'rgba(255,255,255,0.04)')
      glass.addColorStop(1, 'rgba(255,255,255,0.012)')
      ctx.fillStyle = glass
      ctx.fill()
      ctx.save()
      ctx.shadowColor = 'rgba(230,255,240,0.35)'
      ctx.shadowBlur = blur(this.properties.scene.zoom, 8)
      ctx.strokeStyle = COLORS.frame
      ctx.lineWidth = 3.5
      ctx.stroke()
      ctx.restore()

      // the name, right of the gate; it keeps a readable size when zoomed out, as long as it fits
      const lx = (env.gate[0] + 1.3) * U
      const running = env.containers.filter((c) => c.state === 'running').length
      const caption =
        `${env.caption ?? 'docker host'} · ${running}/${env.containers.length} up`.toUpperCase()
      ctx.font = `700 58px ${FONT.ui}`
      const nameWidth = ctx.measureText(env.name).width
      ctx.font = `600 22px ${FONT.mono}`
      const captionWidth = ctx.measureText(caption).width
      const room = (env.col + env.cols) * U - lx - 40
      const k = Math.max(
        0.5,
        Math.min(
          Math.max(1, 0.55 / this.properties.scene.zoom),
          2.2,
          room / (nameWidth + 24 + captionWidth),
        ),
      )
      const ly = v0 + h - 30 - 28 * k
      ctx.save()
      ctx.shadowColor = 'rgba(255,255,255,0.35)'
      ctx.shadowBlur = blur(this.properties.scene.zoom, 6)
      ctx.fillStyle = COLORS.text
      ctx.font = `700 ${58 * k}px ${FONT.ui}`
      ctx.textBaseline = 'middle'
      ctx.fillText(env.name, lx, ly + 2 * k)
      ctx.restore()
      ctx.font = `600 ${22 * k}px ${FONT.mono}`
      ctx.fillStyle = COLORS.muted
      ctx.textBaseline = 'middle'
      ctx.fillText(caption, lx + (nameWidth + 24) * k, ly + 5 * k)
    })
  }

  /** A pad under each building and its tanks */
  private lots(ctx: CanvasRenderingContext2D, env: Environment) {
    for (const c of env.containers) {
      const tanks = env.volumes.filter((v) => v.owner === c)
      const right = Math.max(c.col + c.w, ...tanks.map((v) => v.col + v.r))
      ctx.globalAlpha = focusAlpha(this.properties.scene, c, 0.5)
      roundRect(
        ctx,
        (c.col - 0.22) * U,
        (c.row - 0.22) * U,
        (right - c.col + 0.44) * U,
        (c.d + 0.44) * U,
        12,
      )
      ctx.fillStyle = PALETTE.lot
      ctx.fill()
      ctx.strokeStyle = PALETTE.lotLine
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  /** The roads: a faint band each, and a thin line along its middle */
  private roads(ctx: CanvasRenderingContext2D, env: Environment) {
    const { scene } = this.properties
    const streets = env.networks.filter((n) => n.street)
    const aw = LOT.avenue / 2
    const gate = env.gate
    const front = env.frontRow
    const lastAvenue = Math.max(gate[0], ...env.avenues.map((a) => a.col))
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.fillStyle = BAND
    if (env.avenues.length) {
      for (const a of env.avenues) {
        roundRect(
          ctx,
          (a.col - aw) * U,
          (a.row0 - HALF) * U,
          LOT.avenue * U,
          (front - a.row0) * U,
          14,
        )
        ctx.fill()
      }
      roundRect(
        ctx,
        (gate[0] - aw) * U,
        (front - HALF) * U,
        (lastAvenue - gate[0] + LOT.avenue) * U,
        LOT.street * U,
        14,
      )
      ctx.fill()
    }
    for (const n of streets) {
      ctx.globalAlpha = focusAlpha(scene, n, 0.45)
      roundRect(ctx, n.col0 * U, (n.row - HALF) * U, (n.col1 - n.col0) * U, LOT.street * U, 14)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // the avenues, the front road and the way to the gate
    if (env.avenues.length) {
      ctx.strokeStyle = LINE
      ctx.lineWidth = 1.6
      ctx.beginPath()
      for (const a of env.avenues) {
        ctx.moveTo(a.col * U, a.row0 * U)
        ctx.lineTo(a.col * U, front * U)
      }
      ctx.moveTo(gate[0] * U, gate[1] * U)
      ctx.lineTo(gate[0] * U, front * U)
      ctx.lineTo(lastAvenue * U, front * U)
      ctx.stroke()
    }
    for (const n of streets) this.street(ctx, n)

    // driveways: from the building to the middle of its street
    ctx.lineWidth = 1.6
    for (const c of env.containers) {
      ctx.globalAlpha = focusAlpha(scene, c, 0.45)
      for (const d of c.driveways) {
        ctx.strokeStyle = hexAlpha(d.network.accent, 0.4)
        ctx.beginPath()
        ctx.moveTo(d.col * U, d.from * U)
        ctx.lineTo(d.col * U, d.to * U)
        ctx.stroke()
        ctx.fillStyle = d.network.accent
        ctx.beginPath()
        ctx.arc(d.col * U, d.to * U, 3.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // the pipes from the buildings to their tanks
    ctx.lineWidth = 1.6
    for (const l of this.properties.model.links) {
      if (l.env !== env || l.kind !== 'mount' || l.arc) continue
      ctx.globalAlpha = focusAlpha(scene, l, 0.35)
      ctx.strokeStyle = hexAlpha(PALETTE.volume, 0.35)
      trace(
        ctx,
        l.path.map(([c, r]) => [c * U, r * U] as GridPoint),
        10,
      )
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  /** A street: a thin line in its accent, the name and the subnet at its start */
  private street(ctx: CanvasRenderingContext2D, n: Network) {
    const { scene } = this.properties
    const selected = scene.selected === n || scene.hovered === n
    ctx.globalAlpha = focusAlpha(scene, n, 0.45)
    const [u0, u1, v] = [n.col0 * U, n.col1 * U, n.row * U]

    ctx.font = `700 15px ${FONT.mono}`
    ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '2px'
    ctx.textBaseline = 'middle'
    const name = n.name.toUpperCase()
    const tx = u0 + (n.internal ? 30 : LOT.avenue * U + 16)
    ctx.fillStyle = n.accent
    ctx.fillText(name, tx, v - 14)
    ctx.font = `500 11px ${FONT.mono}`
    ctx.fillStyle = COLORS.muted
    const info = [n.driver, n.subnet, n.internal ? 'internal' : ''].filter(Boolean).join(' · ')
    ctx.fillText(info.toUpperCase(), tx, v + 15)
    ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px'

    // internal streets start at their barrier, the others at the avenue
    const start = n.internal ? u0 + 10 : (n.col0 + LOT.avenue / 2) * U
    ctx.strokeStyle = hexAlpha(n.accent, selected ? 0.9 : 0.5)
    ctx.lineWidth = selected ? 2.4 : 1.6
    ctx.beginPath()
    ctx.moveTo(start, v)
    ctx.lineTo(u1 - 16, v)
    ctx.stroke()
    ctx.fillStyle = hexAlpha(n.accent, selected ? 0.9 : 0.5)
    ctx.beginPath()
    ctx.arc(u1 - 16, v, 3, 0, Math.PI * 2)
    ctx.fill()

    if (n.internal) {
      // a barrier at the closed end: no way out to the avenue
      ctx.strokeStyle = COLORS.amber
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(u0 + 10, v - HALF * U + 10)
      ctx.lineTo(u0 + 10, v + HALF * U - 10)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  /** Light on the ground by mood: firelight under what burns, cold under what is frozen, red under the sick */
  private moodLight(ctx: CanvasRenderingContext2D, c: Container) {
    const mood = moodOf(c)
    const time = this.properties.scene.time + phaseOf(c) * 10
    let color: string
    let strength: number
    if (mood === 'burning') {
      color = '255,120,40'
      strength = 0.42 + 0.08 * Math.sin(time * 7.3) + 0.05 * Math.sin(time * 13.1)
    } else if (mood === 'dead') {
      color = '255,90,40'
      strength = 0.12 + 0.04 * Math.sin(time * 1.3)
    } else if (mood === 'paused') {
      color = '143,211,255'
      strength = 0.18
    } else if (mood === 'unhealthy') {
      color = '255,90,95'
      strength = 0.12 + 0.08 * Math.sin(time * 2)
    } else return
    const cx = (c.col + c.w / 2) * U
    const cy = (c.row + c.d / 2) * U
    const r = c.w * U * (mood === 'burning' ? 1.6 : 1.2)
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    gradient.addColorStop(0, `rgba(${color},${strength})`)
    gradient.addColorStop(1, `rgba(${color},0)`)
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()
  }

  /** Soft shadows of the buildings and tanks, and green light under the busy buildings */
  private shadows(ctx: CanvasRenderingContext2D, env: Environment) {
    const { scene } = this.properties
    for (const c of env.containers) {
      ctx.save()
      ctx.globalAlpha = focusAlpha(scene, c, 0.4)
      ctx.shadowColor = 'rgba(0,0,0,0.7)'
      ctx.shadowBlur = blur(scene.zoom, 16)
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      const s = c.height * 0.55
      ctx.beginPath()
      ctx.moveTo(c.col * U, c.row * U)
      ctx.lineTo((c.col + c.w) * U, c.row * U)
      ctx.lineTo((c.col + c.w) * U + s, c.row * U - s * 0.4)
      ctx.lineTo((c.col + c.w) * U + s, (c.row + c.d) * U - s * 0.4)
      ctx.lineTo((c.col + c.w) * U, (c.row + c.d) * U)
      ctx.lineTo(c.col * U, (c.row + c.d) * U)
      ctx.closePath()
      ctx.fill()
      ctx.restore()

      this.moodLight(ctx, c)
      if (c.flash > 0.02) {
        const cx = (c.col + c.w / 2) * U
        const cy = (c.row + c.d / 2) * U
        const r = c.w * U * 1.1
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
        gradient.addColorStop(0, `rgba(62,224,127,${0.3 * c.flash})`)
        gradient.addColorStop(1, 'rgba(62,224,127,0)')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    for (const v of env.volumes) {
      ctx.save()
      ctx.globalAlpha = focusAlpha(scene, v, 0.4)
      ctx.shadowColor = 'rgba(0,0,0,0.7)'
      ctx.shadowBlur = blur(scene.zoom, 10)
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.beginPath()
      // taller tanks throw longer shadows
      const reach = 4 + v.height * 0.2
      ctx.ellipse(
        v.col * U + reach,
        v.row * U - reach * 0.4,
        v.r * U * 1.1,
        v.r * U,
        0,
        0,
        Math.PI * 2,
      )
      ctx.fill()
      ctx.restore()
    }
  }

  /** A flow, as in isoflow: a streak that fades toward its tail, with a bright core; it drains into the end */
  private flow(
    ctx: CanvasRenderingContext2D,
    l: Link,
    d: number,
    back: boolean,
    colors: (typeof FLOW_COLORS)['call'],
  ) {
    const P = this.properties.scene.projection
    const length = l.lengths[l.lengths.length - 1]
    const [d0, d1] = back ? [d, d + TAIL] : [d - TAIL, d]
    const [a, b] = [Math.max(0, d0), Math.min(length, d1)]
    if (b - a < 0.02) return
    const points = subPath(l, a, b).map(([c, r]) => P.at(c, r))
    if (back) points.reverse()
    const [hx, hy] = points[points.length - 1]
    if (!isVisible(this.properties.scene, hx, hy, 60)) return
    // the gradient spans the whole tail, so a streak draining in fades out at its end
    const [tx, ty] = P.at(...pointAt(l, back ? d1 : d0, length))
    const [gx, gy] = P.at(...pointAt(l, back ? d0 : d1, length))
    const gradient = ctx.createLinearGradient(tx, ty, gx, gy)
    gradient.addColorStop(0, hexAlpha(colors.glow, 0))
    gradient.addColorStop(1, colors.head)
    ctx.save()
    ctx.shadowColor = colors.glow
    ctx.shadowBlur = blur(this.properties.scene.zoom, FLOW_STYLE.blur)
    ctx.strokeStyle = gradient
    ctx.lineWidth = FLOW_STYLE.width
    trace(ctx, points, 8)
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.strokeStyle = colors.core
    ctx.lineWidth = FLOW_STYLE.core
    ctx.stroke()
    ctx.restore()
  }
}

/** A point along a link, extended straight past its ends (where a draining tail's gradient ends) */
function pointAt(l: Link, d: number, length: number): GridPoint {
  const { path } = l
  if (d >= 0 && d <= length) return subPath(l, d, d)[0]
  const [p, q] = d < 0 ? [path[1], path[0]] : [path[path.length - 2], path[path.length - 1]]
  const over = d < 0 ? -d : d - length
  const seg = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1
  return [q[0] + ((q[0] - p[0]) / seg) * over, q[1] + ((q[1] - p[1]) / seg) * over]
}
