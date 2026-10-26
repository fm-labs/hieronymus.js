import type { GameComponentProperties, IGameComponent } from '../../../lib/game.types'
import { AbstractGameComponent } from '../../../lib'
import { LOT, subPath } from './isocontainers.layout.ts'
import { TAIL, pulseDistances } from './isocontainers.sim.ts'
import { moodOf, phaseOf } from './isocontainers.fx.ts'
import { mix } from '../isoflow/isoflow.draw.ts'
import type {
  Container,
  ContainersModel,
  Environment,
  GridPoint,
  Region,
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

/**
 * The plates: how far above the floor they hover and how thick they are (in pixels of height), the
 * radius of their corners, their colors, and the timing of their animations (in seconds).
 */
export const PLATE = {
  float: 46,
  thickness: 18,
  radius: 48,
  floor: '#0a1012',
  floorLit: '#111b1d',
  edge: '#18231f',
  under: '#030506',
  rim: '#c8d6d0',
  rimLit: '#8dffb9',
  rimGlow: 'rgba(230,255,240,0.3)',
  /** One slow breath of the shadow */
  breath: 7,
  /** One turn of the lights along the rim */
  spin: 10,
  /** The ripple on entering */
  ripple: 1.1,
}

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
      if (scene.hidden.has(e)) return false
      const [x, y] = P.at(e.col + e.cols / 2, e.row + e.rows / 2)
      return isVisible(scene, x, y, (e.cols + e.rows) * P.cell)
    })
    for (const region of model.regions) this.region(ctx, region)
    envs.forEach((env, i) => this.plateShadow(ctx, env, i * 1.7))
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

  /**
   * A region on the floor under its plates: a faint tinted field in its color with a dashed edge, and
   * its name in front. The name keeps a readable size when zoomed out.
   */
  private region(ctx: CanvasRenderingContext2D, region: Region) {
    const { scene } = this.properties
    const P = scene.projection
    const outline = region.outline
    if (outline.length < 3) return
    const screen = outline.map(([c, r]) => P.at(c, r, -PLATE.float))
    const xs = screen.map(([x]) => x)
    const ys = screen.map(([, y]) => y)
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
    const { view } = scene
    if (x1 < view.x0 - 200 || x0 > view.x1 + 200 || y1 < view.y0 - 200 || y0 > view.y1 + 400) return

    const hovered = !!scene.hoveredPlate && scene.hoveredPlate.region === region
    P.plane(ctx, -PLATE.float, () => {
      closedTrace(
        ctx,
        outline.map(([c, r]) => [c * U, r * U]),
        2.5 * U,
      )
      ctx.fillStyle = hexAlpha(region.color, hovered ? 0.075 : 0.05)
      ctx.fill()
      ctx.setLineDash([28, 18])
      ctx.strokeStyle = hexAlpha(region.color, hovered ? 0.6 : 0.38)
      ctx.lineWidth = Math.max(3, 1.4 / scene.zoom)
      ctx.stroke()
      ctx.setLineDash([])
    })

    // the name, centered under the outline
    const front = [(x0 + x1) / 2, y1]
    const k = regionLabelScale(scene.zoom)
    const hosts = region.environments.filter((e) => !scene.hidden.has(e))
    const containers = hosts.flatMap((e) => e.containers)
    const up = containers.filter((c) => c.state === 'running').length
    const caption = `${hosts.length} HOST${hosts.length === 1 ? '' : 'S'} · ${up}/${containers.length} UP`
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.font = `700 ${34 * k}px ${FONT.mono}`
    ctx.letterSpacing = `${6 * k}px`
    ctx.shadowColor = hexAlpha(region.color, 0.6)
    ctx.shadowBlur = blur(scene.zoom, 12)
    ctx.fillStyle = region.color
    ctx.fillText(region.name.toUpperCase(), front[0], front[1] + 26 * k)
    ctx.shadowBlur = 0
    ctx.font = `600 ${15 * k}px ${FONT.mono}`
    ctx.letterSpacing = `${2 * k}px`
    ctx.fillStyle = COLORS.muted
    ctx.fillText(caption, front[0], front[1] + 70 * k)
    ctx.restore()
  }

  /**
   * The shadow of a plate on the floor far below, so the plate seems to hover. A few soft layers
   * instead of a canvas blur, which costs too much on big plates; it breathes slowly, as if the plate
   * rose and sank a little.
   */
  private plateShadow(ctx: CanvasRenderingContext2D, env: Environment, phase: number) {
    const { scene } = this.properties
    const P = scene.projection
    const [u0, v0, w, h] = [env.col * U, env.row * U, env.cols * U, env.rows * U]
    const breath = Math.sin((scene.time / PLATE.breath) * Math.PI * 2 + phase)
    // under the pointer the plate seems to rise: its shadow falls farther, wider and lighter
    const lift = scene.plates.get(env)?.glow ?? 0
    P.plane(ctx, -PLATE.float - 4 * breath - 10 * lift, () => {
      // a faint pool of light on the floor, so the shadow reads on the dark ground
      ctx.fillStyle = 'rgba(150,200,180,0.012)'
      for (let i = 0; i < 4; i++) {
        const g = 70 + i * 40
        roundRect(ctx, u0 - g, v0 - g * 0.4, w + g * 2, h + g * 1.4, PLATE.radius + g)
        ctx.fill()
      }
      ctx.fillStyle = `rgba(0,0,0,${0.2 - 0.02 * breath - 0.04 * lift})`
      for (let i = 0; i < 5; i++) {
        const g = 6 + i * 12 + 4 * breath + 8 * lift
        roundRect(ctx, u0 - g, v0 - g * 0.4, w + g * 2, h + g * 1.4, PLATE.radius + g)
        ctx.fill()
      }
    })
  }

  /**
   * A plate: a slab with a dark edge, its floor with faint tiles, and a bright rim. Under the pointer
   * the rim lights up green, a ripple runs out from it, and two soft lights circle along it.
   */
  private plate(ctx: CanvasRenderingContext2D, env: Environment) {
    const { scene } = this.properties
    const P = scene.projection
    const [u0, v0, w, h] = [env.col * U, env.row * U, env.cols * U, env.rows * U]
    const R = PLATE.radius
    const lit = scene.plates.get(env)
    const glow = lit?.glow ?? 0

    // the slab's edge, from its dark underside up to the floor
    const steps = Math.max(2, Math.round((PLATE.thickness * P.zScale) / 2))
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      P.plane(ctx, -PLATE.thickness * (1 - t), () => {
        roundRect(ctx, u0, v0, w, h, R)
        ctx.fillStyle = mix(PLATE.under, PLATE.edge, t)
        ctx.fill()
      })
    }
    // the lip under the rim catches a little light, the underside a little less
    for (const [z, alpha] of [
      [-PLATE.thickness, 0.07],
      [-4, 0.16],
    ]) {
      P.plane(ctx, z, () => {
        roundRect(ctx, u0, v0, w, h, R)
        ctx.strokeStyle = `rgba(225,236,231,${alpha})`
        ctx.lineWidth = 1.5
        ctx.stroke()
      })
    }

    P.plane(ctx, 0, () => {
      // the floor: lit from the back, darker toward the front edges
      roundRect(ctx, u0, v0, w, h, R)
      const floor = ctx.createRadialGradient(
        u0 + w * 0.35,
        v0 + h * 0.3,
        0,
        u0 + w * 0.35,
        v0 + h * 0.3,
        Math.hypot(w, h) * 0.8,
      )
      floor.addColorStop(0, PLATE.floorLit)
      floor.addColorStop(1, PLATE.floor)
      ctx.fillStyle = floor
      ctx.fill()

      ctx.save()
      ctx.clip()
      // the tiles, one per cell; they fade out from far away before they turn into a moiré
      const tiles = Math.min(1, Math.max(0, (scene.zoom - 0.18) / 0.25))
      if (tiles > 0) {
        ctx.strokeStyle = `rgba(200,220,212,${0.035 * tiles})`
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let c = Math.ceil(env.col); c < env.col + env.cols; c++) {
          ctx.moveTo(c * U, v0)
          ctx.lineTo(c * U, v0 + h)
        }
        for (let r = Math.ceil(env.row); r < env.row + env.rows; r++) {
          ctx.moveTo(u0, r * U)
          ctx.lineTo(u0 + w, r * U)
        }
        ctx.stroke()
      }
      // a soft green light along the inside of the rim, under the pointer
      if (glow > 0.01) {
        roundRect(ctx, u0, v0, w, h, R)
        ctx.strokeStyle = hexAlpha(COLORS.green, 0.07 * glow)
        ctx.lineWidth = 56
        ctx.stroke()
        ctx.lineWidth = 22
        ctx.stroke()
      }
      ctx.restore()

      // the rim: calm white (or the color of its region), turning green under the pointer
      const rim = env.region ? mix(env.region.color, '#ffffff', 0.2) : PLATE.rim
      const rimGlow = env.region ? hexAlpha(env.region.color, 0.4) : PLATE.rimGlow
      roundRect(ctx, u0, v0, w, h, R)
      ctx.save()
      ctx.shadowColor = glow > 0.01 ? hexAlpha(COLORS.green, 0.35 + 0.35 * glow) : rimGlow
      ctx.shadowBlur = blur(scene.zoom, 8 + 10 * glow)
      ctx.strokeStyle = mix(rim, PLATE.rimLit, glow)
      ctx.lineWidth = 3.5 + glow
      ctx.stroke()
      ctx.restore()

      if (lit && glow > 0.01) {
        // two lights circling the rim, slowly
        const spin = (scene.time / PLATE.spin) * Math.PI * 2
        const lights = ctx.createConicGradient(spin, u0 + w / 2, v0 + h / 2)
        for (const at of [0, 0.5]) {
          lights.addColorStop(at, 'rgba(141,255,185,0)')
          lights.addColorStop(at + 0.07, `rgba(200,255,222,${0.85 * glow})`)
          lights.addColorStop(at + 0.075, 'rgba(141,255,185,0)')
          lights.addColorStop(at + 0.5, 'rgba(141,255,185,0)')
        }
        roundRect(ctx, u0, v0, w, h, R)
        ctx.save()
        ctx.shadowColor = COLORS.greenSoft
        ctx.shadowBlur = blur(scene.zoom, 10)
        ctx.strokeStyle = lights
        ctx.lineWidth = 3
        ctx.stroke()
        ctx.restore()

        // the ripple on entering: a thin ring that grows out from the rim and fades
        const e = (scene.time - lit.entered) / PLATE.ripple
        if (e >= 0 && e < 1) {
          const ease = 1 - (1 - e) ** 3
          const g = 6 + ease * 34
          roundRect(ctx, u0 - g, v0 - g, w + g * 2, h + g * 2, R + g)
          ctx.strokeStyle = hexAlpha(COLORS.greenSoft, 0.45 * (1 - e) ** 2)
          ctx.lineWidth = 2
          ctx.stroke()
        }
      }

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
          (a.row1 - a.row0) * U,
          14,
        )
        ctx.fill()
      }
      for (const r of env.roads) {
        roundRect(
          ctx,
          (r.col0 - aw) * U,
          (r.row - HALF) * U,
          (r.col1 - r.col0 + LOT.avenue) * U,
          LOT.street * U,
          14,
        )
        ctx.fill()
      }
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
        ctx.lineTo(a.col * U, a.row1 * U)
      }
      for (const r of env.roads) {
        ctx.moveTo(r.col0 * U, r.row * U)
        ctx.lineTo(r.col1 * U, r.row * U)
      }
      ctx.moveTo(gate[0] * U, gate[1] * U)
      ctx.lineTo(gate[0] * U, front * U)
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

/** A closed polygon with rounded corners, through points in the current space */
function closedTrace(ctx: CanvasRenderingContext2D, points: GridPoint[], radius: number) {
  const n = points.length
  const mid = (a: GridPoint, b: GridPoint): GridPoint => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const dist = (a: GridPoint, b: GridPoint) => Math.hypot(b[0] - a[0], b[1] - a[1])
  ctx.beginPath()
  ctx.moveTo(...mid(points[n - 1], points[0]))
  for (let i = 0; i < n; i++) {
    const [prev, p, next] = [points[(i + n - 1) % n], points[i], points[(i + 1) % n]]
    const r = Math.min(radius, dist(prev, p) / 2, dist(p, next) / 2)
    ctx.arcTo(p[0], p[1], ...mid(p, next), r)
  }
  ctx.closePath()
}

/** How much a region's name grows, at a zoom: it keeps a readable size when zoomed out */
export const regionLabelScale = (zoom: number) => Math.min(Math.max(1, 0.5 / zoom), 6.5)

/** How far a region's name reaches below its outline, in pixels */
export const regionLabelDepth = (zoom: number) => 90 * regionLabelScale(zoom)
