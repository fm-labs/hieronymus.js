import type { GameComponentProperties, IGameComponent } from '../../../lib/game.types'
import { AbstractGameComponent } from '../../../lib'
import { noise } from '../isovegas/isovegas.draw.ts'
import { isPublished } from './isocontainers.layout.ts'
import { KIND_LABELS, type Container, type GridPoint } from './isocontainers.types.ts'
import { STYLES } from './isocontainers.styles.ts'
import {
  arch,
  badge,
  cornice,
  crenels,
  door,
  facade,
  faceQuad,
  footprint,
  frontOf,
  planePath,
  roofProp,
  sides,
  visibleFaces,
  type Face,
} from './isocontainers.buildings.ts'
import {
  COLORS,
  FONT,
  PALETTE,
  U,
  fit,
  focusAlpha,
  hexAlpha,
  isVisible,
  poly,
  stateColor,
  type ContainersScene,
} from './isocontainers.draw.ts'
import {
  FIRE,
  ICE,
  arrivals,
  faceColors,
  flames,
  heightOf,
  icicles,
  moodOf,
  phaseOf,
  type Mood,
} from './isocontainers.fx.ts'

export interface IsoContainerBuildingComponentProps extends GameComponentProperties {
  container: Container
  scene: ContainersScene
}

/** How visible a building is, by mood: what is gone steps back, what burns does not */
const MOOD_ALPHA: Partial<Record<Mood, number>> = { stopped: 0.72, dead: 0.85, created: 0.9 }

/**
 * A container as a building: a dark slate box with rows of windows, a flat roof with its name, image
 * and ports, and a status light. The state shows everywhere: the windows glow in its color (green,
 * a sick red pulse, amber floors filling up while it boots, ice blue when paused, embers when it
 * crashed), a crashed building is charred and burns, a paused one is frosted, a container that was
 * never started is only a blueprint, and one that was just started rises out of the ground.
 * Replicas stand as a row of towers on the same lot.
 */
export class IsoContainerBuildingComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoContainerBuildingComponentProps

  public readonly componentType: string = 'IsoContainerBuilding'

  constructor(properties: IsoContainerBuildingComponentProps) {
    super(properties)
    const { container: c, scene } = properties
    // depth sorting by the center of the footprint
    const [x, y] = scene.projection.at(c.col + c.w / 2, c.row + c.d / 2)
    this.setPosition(x, y)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { container: c, scene } = this.properties
    const P = scene.projection
    if (!isVisible(scene, this.x, this.y - c.height, (c.w + c.d) * P.cell + 120)) return
    const mood = moodOf(c)
    const h = heightOf(c)
    ctx.globalAlpha = focusAlpha(scene, c) * (MOOD_ALPHA[mood] ?? 1)

    // replicas: towers side by side along the columns
    const n = c.replicas
    const gap = n > 1 ? 0.14 : 0
    const tw = (c.w - gap * (n - 1)) / n
    for (let i = 0; i < n; i++) {
      const col = c.col + i * (tw + gap)
      // the first tower is the tallest, the others step down a little
      this.tower(ctx, col, tw, h * (i === 0 ? 1 : 0.86), mood, i)
    }
    this.roof(ctx, n > 1 ? tw : c.w, h, mood)
    if (mood === 'paused') icicles(ctx, P, c, h)
    if (mood === 'burning') flames(ctx, P, c, h, scene.time + phaseOf(c) * 10)
    arrivals(ctx, P, c, h)
    this.outline(ctx, h)
    ctx.globalAlpha = 1
  }

  private tower(
    ctx: CanvasRenderingContext2D,
    col: number,
    w: number,
    h: number,
    mood: Mood,
    index: number,
  ) {
    const { container: c, scene } = this.properties
    const P = scene.projection
    const { row, d } = c
    const style = STYLES[c.look.style]
    const points = footprint(style.shape, col, row, w, d)
    const faces = visibleFaces(points)
    const [left, right] = faceColors(mood)
    sides(ctx, P, faces, h, left, right)
    if (mood === 'burning' || mood === 'dead') this.scorch(ctx, faces, h)

    const up = c.state === 'running'
    const load = up ? Math.min(0.9, 0.18 + c.cpu / 60 + c.flash * 0.35) : 0
    const x = { c, mood, load, h, index, time: scene.time }
    faces.forEach((f, i) => facade(ctx, P, style, f, i + 1, x))
    const front = frontOf(faces)
    const light = up ? stateColor(c) : undefined
    if (front && style.arch) arch(ctx, P, front, h, light)
    else if (front && style.door) door(ctx, P, front, h, style.facade === 'ribbon', light)
    if (front && index === 0 && c.look.badge && mood !== 'created')
      badge(ctx, P, front, h, c.look.badge, c.look.accent)
    if (c.look.accent && mood !== 'created') cornice(ctx, P, faces, h, c.look.accent)

    // the edges: catching the light, or dashed lines of a blueprint
    ctx.save()
    if (mood === 'created') {
      ctx.strokeStyle = 'rgba(111,182,214,0.55)'
      ctx.setLineDash([4, 4])
      ctx.lineWidth = 1.2
      ctx.beginPath()
      for (const f of faces) {
        const q = faceQuad(P, f, 0, f.len, 0, h)
        ctx.moveTo(...q[0])
        ctx.lineTo(...q[1])
        ctx.lineTo(...q[2])
        ctx.moveTo(...q[0])
        ctx.lineTo(...q[3])
      }
      ctx.stroke()
    } else {
      ctx.strokeStyle = 'rgba(200,220,212,0.16)'
      ctx.lineWidth = 1
      ctx.beginPath()
      // between two faces that both show
      for (let i = 1; i < faces.length; i++) {
        const q = faceQuad(P, faces[i], 0, faces[i].len, 0, h)
        ctx.moveTo(...q[0])
        ctx.lineTo(...q[3])
      }
      ctx.stroke()
    }
    ctx.restore()

    // the top of a tower; the roof text goes on the first one
    P.plane(ctx, h, () => {
      const [u0, v0, W, D] = [col * U, row * U, w * U, d * U]
      planePath(ctx, points)
      if (mood === 'created') {
        ctx.fillStyle = 'rgba(76,201,240,0.05)'
        ctx.fill()
      } else {
        const face = ctx.createLinearGradient(u0, v0, u0 + W, v0 + D)
        const charred = mood === 'burning' || mood === 'dead'
        face.addColorStop(0, charred ? '#151312' : mood === 'paused' ? '#1c2a32' : '#1a2629')
        face.addColorStop(1, charred ? '#0c0b0b' : mood === 'paused' ? '#15222a' : PALETTE.roof)
        ctx.fillStyle = face
        ctx.fill()
        planePath(ctx, points, 7)
        ctx.strokeStyle = PALETTE.roofEdge
        ctx.lineWidth = 2
        ctx.stroke()
      }
      if (mood === 'paused') {
        // frost: a pale sheen and a few crystal lines
        const frost = ctx.createLinearGradient(u0, v0, u0 + W, v0 + D)
        frost.addColorStop(0, 'rgba(190,230,255,0.22)')
        frost.addColorStop(1, 'rgba(143,211,255,0.06)')
        ctx.fillStyle = frost
        planePath(ctx, points)
        ctx.fill()
        ctx.strokeStyle = 'rgba(210,240,255,0.25)'
        ctx.lineWidth = 1.2
        ctx.beginPath()
        for (let k = 0; k < 5; k++) {
          const x = u0 + W * (0.15 + 0.7 * noise(k, 1, index + 3))
          const y = v0 + D * (0.15 + 0.7 * noise(k, 2, index + 3))
          for (let a = 0; a < 3; a++) {
            const angle = (a * Math.PI) / 3
            ctx.moveTo(x - Math.cos(angle) * 7, y - Math.sin(angle) * 7)
            ctx.lineTo(x + Math.cos(angle) * 7, y + Math.sin(angle) * 7)
          }
        }
        ctx.stroke()
      }
      this.rim(ctx, points, mood)
    })
    if (style.crenels && mood !== 'created') {
      const [l, r] = faceColors(mood)
      crenels(ctx, P, faces, h, [l === '#0f181a' ? '#1a2a2d' : l, r, '#2c3f43'])
    }
  }

  /** Soot climbing up the sides of a burnt building, from the windows to the roof */
  private scorch(ctx: CanvasRenderingContext2D, faces: Face[], h: number) {
    const P = this.properties.scene.projection
    for (const f of faces) {
      const quad = faceQuad(P, f, 0, f.len, h * 0.35, h)
      const [, y0] = quad[0]
      const [, y1] = quad[3]
      const gradient = ctx.createLinearGradient(0, y0, 0, y1)
      gradient.addColorStop(0, 'rgba(0,0,0,0)')
      gradient.addColorStop(1, 'rgba(0,0,0,0.55)')
      poly(ctx, quad)
      ctx.fillStyle = gradient
      ctx.fill()
    }
  }

  /** The edge of a roof, in the color of the mood */
  private rim(ctx: CanvasRenderingContext2D, points: GridPoint[], mood: Mood) {
    const { container: c, scene } = this.properties
    const color = stateColor(c)
    ctx.save()
    ctx.lineWidth = 2.5
    switch (mood) {
      case 'ok':
        ctx.shadowColor = COLORS.green
        ctx.shadowBlur = 6 + 10 * c.flash
        ctx.strokeStyle = `rgba(62,224,127,${0.45 + 0.45 * c.flash})`
        break
      case 'crashloop':
      case 'booting':
        // a dash running around the roof
        ctx.strokeStyle = COLORS.amber
        ctx.setLineDash([18, 12])
        ctx.lineDashOffset = -scene.time * 40
        break
      case 'paused':
        // the same dash, frozen
        ctx.strokeStyle = ICE
        ctx.shadowColor = ICE
        ctx.shadowBlur = 6
        ctx.setLineDash([18, 12])
        break
      case 'unhealthy':
      case 'starting':
        // a slow breathing glow
        ctx.shadowColor = color
        ctx.shadowBlur = 8 + 8 * Math.sin(scene.time * 2)
        ctx.strokeStyle = color
        break
      case 'burning':
        ctx.shadowColor = FIRE
        ctx.shadowBlur = 12
        ctx.strokeStyle = hexAlpha(FIRE, 0.8)
        break
      case 'created':
        ctx.strokeStyle = 'rgba(111,182,214,0.6)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([6, 5])
        break
      default:
        ctx.strokeStyle = hexAlpha(color, 0.35)
    }
    planePath(ctx, points, 1)
    ctx.stroke()
    ctx.restore()
  }

  /** The text on the main roof: name, image, kind and ports, and the status light */
  private roof(ctx: CanvasRenderingContext2D, width: number, h: number, mood: Mood) {
    const { container: c, scene } = this.properties
    const P = scene.projection
    const dark = mood === 'stopped' || mood === 'dead' || mood === 'created'
    const color = mood === 'paused' ? ICE : stateColor(c)
    const lit = mood === 'ok' || mood === 'unhealthy' || mood === 'starting' || mood === 'burning'
    const style = STYLES[c.look.style]
    // nothing stands on a blueprint
    const prop = mood === 'created' ? 'none' : c.look.roof
    // the corners of an octagon are cut: the text moves in
    const inset = style.shape === 'octagon' ? Math.min(width, c.d) * 0.12 * U : 0
    const reserve = prop === 'none' ? 18 : 34
    P.plane(ctx, h, () => {
      const [u0, v0, W, D] = [c.col * U + inset, c.row * U, width * U - inset * 2, c.d * U]
      const pad = 14
      ctx.textBaseline = 'middle'
      ctx.font = `600 ${width < 1.6 ? 16 : 22}px ${FONT.ui}`
      ctx.fillStyle = dark ? COLORS.muted : COLORS.text
      ctx.fillText(
        fit(ctx, c.service && c.name.length > 18 ? c.service : c.name, W - pad * 2 - reserve),
        u0 + pad,
        v0 + 28,
      )
      ctx.font = `500 11.5px ${FONT.mono}`
      ctx.fillStyle = COLORS.muted
      ctx.fillText(
        fit(ctx, c.image.split('/').pop() ?? c.image, W - pad * 2 - reserve + 18),
        u0 + pad,
        v0 + 50,
      )
      ctx.font = `600 10px ${FONT.mono}`
      ctx.fillStyle = COLORS.faint
      const kind = KIND_LABELS[c.kind].toUpperCase() + (c.replicas > 1 ? ` · ×${c.replicas}` : '')
      ctx.fillText(fit(ctx, kind, W - pad * 2), u0 + pad, v0 + 68)

      // ports: published ones bright, exposed ones faint
      let x = u0 + pad
      ctx.font = `600 11px ${FONT.mono}`
      for (const p of c.ports.slice(0, 4)) {
        const text = isPublished(p) ? `${p.hostPort}→${p.port}` : `${p.port}`
        const w = ctx.measureText(text).width + 10
        if (x + w > u0 + W - pad) break
        ctx.fillStyle = isPublished(p)
          ? p.local
            ? 'rgba(255,192,77,0.12)'
            : 'rgba(62,224,127,0.12)'
          : 'rgba(255,255,255,0.04)'
        ctx.beginPath()
        ctx.roundRect(x, v0 + D - 30, w, 17, 4)
        ctx.fill()
        ctx.fillStyle = isPublished(p) ? (p.local ? COLORS.amber : COLORS.greenSoft) : COLORS.faint
        ctx.fillText(text, x + 5, v0 + D - 21)
        x += w + 5
      }

      if (prop !== 'none') return
      // the status light, top right
      ctx.save()
      if (lit) {
        ctx.shadowColor = color
        ctx.shadowBlur = 10
      }
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(u0 + W - pad - 4, v0 + 26, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    })
    if (prop === 'none') return

    // what stands on the roof, at its back corner; the status light on top of it
    const top = roofProp(ctx, P, prop, c.col + width - 0.32, c.row + 0.32, h, {
      light: color,
      lit,
      load: c.state === 'running' ? Math.min(1, 0.15 + c.cpu / 50) : 0,
      running: c.state === 'running',
      time: scene.time,
      phase: phaseOf(c),
      charred: mood === 'burning' || mood === 'dead',
    })
    if (!top) return
    ctx.save()
    if (lit) {
      ctx.shadowColor = color
      ctx.shadowBlur = 10
    }
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(top[0], top[1], 3.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  private outline(ctx: CanvasRenderingContext2D, h: number) {
    const { container: c, scene } = this.properties
    const selected = scene.selected === c
    if (!selected && scene.hovered !== c) return
    const P = scene.projection
    ctx.save()
    ctx.strokeStyle = selected ? '#ffffff' : 'rgba(255,255,255,0.6)'
    ctx.shadowColor = 'rgba(255,255,255,0.5)'
    ctx.shadowBlur = selected ? 10 : 0
    if (!selected) ctx.setLineDash([8, 6])
    P.plane(ctx, h, () => {
      ctx.lineWidth = selected ? 3.5 : 2.5
      ctx.strokeRect((c.col - 0.1) * U, (c.row - 0.1) * U, (c.w + 0.2) * U, (c.d + 0.2) * U)
    })
    // the outline of the ground footprint
    P.plane(ctx, 0, () => {
      ctx.lineWidth = selected ? 3 : 2
      ctx.strokeRect((c.col - 0.1) * U, (c.row - 0.1) * U, (c.w + 0.2) * U, (c.d + 0.2) * U)
    })
    ctx.restore()
  }
}
