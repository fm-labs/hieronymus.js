import type { GameComponentProperties, IGameComponent } from '../../../lib/game.types'
import { AbstractGameComponent } from '../../../lib'
import { noise } from '../isovegas/isovegas.draw.ts'
import { isPublished } from './isocontainers.layout.ts'
import { KIND_LABELS, type Container } from './isocontainers.types.ts'
import {
  COLORS,
  FONT,
  PALETTE,
  U,
  boxSides,
  fit,
  focusAlpha,
  isVisible,
  leftQuad,
  poly,
  rightQuad,
  hexAlpha,
  stateColor,
  type ContainersScene,
} from './isocontainers.draw.ts'

export interface IsoContainerBuildingComponentProps extends GameComponentProperties {
  container: Container
  scene: ContainersScene
}

const FLOOR = 9

/**
 * A container as a building: a dark slate box with rows of windows that light up with the load,
 * a flat roof with its name, image and ports, and a status light. A running container has a green rim,
 * a restarting one a running amber dash, a stopped one sits dark with a red light.
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
    if (!isVisible(scene, this.x, this.y - c.height, (c.w + c.d) * P.cell)) return
    const up = c.state === 'running'
    const down = c.state === 'exited' || c.state === 'dead' || c.state === 'created'
    ctx.globalAlpha = focusAlpha(scene, c) * (down ? 0.62 : 1)

    // replicas: towers side by side along the columns
    const n = c.replicas
    const gap = n > 1 ? 0.14 : 0
    const tw = (c.w - gap * (n - 1)) / n
    for (let i = 0; i < n; i++) {
      const col = c.col + i * (tw + gap)
      // the first tower is the tallest, the others step down a little
      const h = c.height * (i === 0 ? 1 : 0.86)
      this.tower(ctx, col, tw, h, up, i)
    }
    this.roof(ctx, n > 1 ? tw : c.w, up, down)
    this.outline(ctx)
    ctx.globalAlpha = 1
  }

  private tower(
    ctx: CanvasRenderingContext2D,
    col: number,
    w: number,
    h: number,
    up: boolean,
    index: number,
  ) {
    const { container: c, scene } = this.properties
    const P = scene.projection
    const { row, d } = c
    boxSides(ctx, P, col, row, w, d, 0, h, PALETTE.faceLeft, PALETTE.faceRight)

    // windows: short strips per floor, lit by the load (and a slow, per-window flicker)
    const floors = Math.floor((h - 8) / FLOOR)
    const load = up ? Math.min(0.9, 0.18 + c.cpu / 60 + c.flash * 0.35) : 0
    const windows = (
      count: number,
      quad: (a: number, b: number, z: number) => [number, number][],
      salt: number,
    ) => {
      for (let f = 0; f < floors; f++) {
        const z = 6 + f * FLOOR
        for (let i = 0; i < count; i++) {
          // each window has its own threshold; it fades in and out as the load moves past it
          const level = up
            ? Math.max(0, Math.min(1, (load - noise(i + index * 7, f, salt)) * 5))
            : 0
          poly(ctx, quad(i, count, z))
          ctx.fillStyle =
            level > 0.01 ? `rgba(141,255,185,${0.06 + 0.5 * level})` : 'rgba(255,255,255,0.035)'
          ctx.fill()
        }
      }
    }
    const across = Math.max(1, Math.round(w / 0.42))
    windows(
      across,
      (i, k, z) => {
        const step = (w - 0.2) / k
        const a = col + 0.1 + i * step + 0.05
        return leftQuad(P, row + d, a, a + step - 0.1, z, z + 3.5)
      },
      1,
    )
    const deep = Math.max(1, Math.round(d / 0.42))
    windows(
      deep,
      (i, k, z) => {
        const step = (d - 0.2) / k
        const a = row + d - 0.1 - i * step - 0.05
        return rightQuad(P, col + w, a, a - step + 0.1, z, z + 3.5)
      },
      2,
    )

    // the front edges catch the light
    ctx.strokeStyle = 'rgba(200,220,212,0.16)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(...P.at(col + w, row + d, 0))
    ctx.lineTo(...P.at(col + w, row + d, h))
    ctx.stroke()

    // the top of a tower; the roof text goes on the first one
    P.plane(ctx, h, () => {
      const [u0, v0, W, D] = [col * U, row * U, w * U, d * U]
      const face = ctx.createLinearGradient(u0, v0, u0 + W, v0 + D)
      face.addColorStop(0, '#1a2629')
      face.addColorStop(1, PALETTE.roof)
      ctx.fillStyle = face
      ctx.fillRect(u0, v0, W, D)
      ctx.strokeStyle = PALETTE.roofEdge
      ctx.lineWidth = 2
      ctx.strokeRect(u0 + 7, v0 + 7, W - 14, D - 14)
      this.rim(ctx, u0, v0, W, D, up)
    })
  }

  /** The edge of a roof, in the color of the state */
  private rim(
    ctx: CanvasRenderingContext2D,
    u0: number,
    v0: number,
    W: number,
    D: number,
    up: boolean,
  ) {
    const { container: c, scene } = this.properties
    const color = stateColor(c)
    ctx.save()
    ctx.lineWidth = 2.5
    if (up && (!c.health || c.health === 'healthy')) {
      ctx.shadowColor = COLORS.green
      ctx.shadowBlur = 6 + 10 * c.flash
      ctx.strokeStyle = `rgba(62,224,127,${0.45 + 0.45 * c.flash})`
    } else if (c.state === 'restarting' || c.state === 'paused') {
      // a dash running around the roof; frozen when paused
      ctx.strokeStyle = COLORS.amber
      ctx.setLineDash([18, 12])
      ctx.lineDashOffset = c.state === 'paused' ? 0 : -scene.time * 40
    } else if (up) {
      // health check pending (amber) or failing (red): a slow breathing glow
      ctx.shadowColor = color
      ctx.shadowBlur = 8 * (0.5 + 0.5 * Math.sin(scene.time * 2))
      ctx.strokeStyle = color
    } else ctx.strokeStyle = hexAlpha(color, 0.35)
    ctx.strokeRect(u0 + 1, v0 + 1, W - 2, D - 2)
    ctx.restore()
  }

  /** The text on the main roof: name, image, kind and ports, and the status light */
  private roof(ctx: CanvasRenderingContext2D, width: number, up: boolean, down: boolean) {
    const { container: c, scene } = this.properties
    const P = scene.projection
    P.plane(ctx, c.height, () => {
      const [u0, v0, W, D] = [c.col * U, c.row * U, width * U, c.d * U]
      const pad = 14
      ctx.textBaseline = 'middle'
      ctx.font = `600 ${width < 1.6 ? 16 : 22}px ${FONT.ui}`
      ctx.fillStyle = down ? COLORS.muted : COLORS.text
      ctx.fillText(
        fit(ctx, c.service && c.name.length > 18 ? c.service : c.name, W - pad * 2 - 18),
        u0 + pad,
        v0 + 28,
      )
      ctx.font = `500 11.5px ${FONT.mono}`
      ctx.fillStyle = COLORS.muted
      ctx.fillText(fit(ctx, c.image.split('/').pop() ?? c.image, W - pad * 2), u0 + pad, v0 + 50)
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

      // the status light, top right
      const color = stateColor(c)
      const blink = c.state === 'restarting' ? 0.55 + 0.45 * Math.abs(Math.sin(scene.time * 2)) : 1
      ctx.save()
      ctx.globalAlpha *= blink
      if (up) {
        ctx.shadowColor = color
        ctx.shadowBlur = 10
      }
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(u0 + W - pad - 4, v0 + 26, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    })
  }

  private outline(ctx: CanvasRenderingContext2D) {
    const { container: c, scene } = this.properties
    const selected = scene.selected === c
    if (!selected && scene.hovered !== c) return
    const P = scene.projection
    ctx.save()
    ctx.strokeStyle = selected ? '#ffffff' : 'rgba(255,255,255,0.6)'
    ctx.shadowColor = 'rgba(255,255,255,0.5)'
    ctx.shadowBlur = selected ? 10 : 0
    ctx.lineWidth = selected ? 2.5 : 1.8
    if (!selected) ctx.setLineDash([8, 6])
    P.plane(ctx, c.height, () => {
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
