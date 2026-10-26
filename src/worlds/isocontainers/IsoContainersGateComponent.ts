import type { GameComponentProperties, IGameComponent } from '../../../lib/game.types'
import { AbstractGameComponent } from '../../../lib'
import { LOT, isPublished } from './isocontainers.layout.ts'
import type { Environment } from './isocontainers.types.ts'
import {
  blur,
  COLORS,
  FONT,
  PALETTE,
  U,
  boxSides,
  isVisible,
  leftQuad,
  poly,
  type ContainersScene,
} from './isocontainers.draw.ts'

export interface IsoContainersGateComponentProps extends GameComponentProperties {
  env: Environment
  scene: ContainersScene
}

/** The height of the gate's beam, in pixels */
export const GATE_HEIGHT = 40
const HEIGHT = GATE_HEIGHT
const PILLAR = 0.2

/**
 * The host gate at the end of the avenue: two pillars and a beam across the road, labelled with the
 * host's published ports. Everything from the outside world comes in through it.
 */
export class IsoContainersGateComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoContainersGateComponentProps

  public readonly componentType: string = 'IsoContainersGate'

  constructor(properties: IsoContainersGateComponentProps) {
    super(properties)
    this.syncPosition()
  }

  /** Back to the gate's place, after the plates were laid out again */
  syncPosition() {
    const [col, row] = this.properties.env.gate
    const [x, y] = this.properties.scene.projection.at(col, row)
    this.setPosition(x, y)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { env, scene } = this.properties
    const P = scene.projection
    if (scene.hidden.has(env) || !isVisible(scene, this.x, this.y, 120)) return
    const [col, row] = env.gate
    const half = LOT.avenue / 2 + 0.15
    const r0 = row - PILLAR / 2
    const pulse = 0.5 + 0.5 * Math.sin(scene.time * 2)
    const open = scene.openHost === env
    const hovered = scene.hoveredHost === env

    // the pad on the ground; brighter under the pointer, glowing while its host is open
    P.plane(ctx, 0, () => {
      ctx.fillStyle = PALETTE.asphalt
      ctx.beginPath()
      ctx.roundRect((col - half - 0.2) * U, (row - 0.45) * U, (half * 2 + 0.4) * U, 0.9 * U, 12)
      ctx.fill()
      ctx.save()
      if (open) {
        ctx.shadowColor = COLORS.green
        ctx.shadowBlur = blur(scene.zoom, 14)
      }
      const alpha = open ? 0.75 + 0.2 * pulse : hovered ? 0.6 : 0.25 + 0.2 * pulse
      ctx.strokeStyle = `rgba(141,255,185,${alpha})`
      ctx.lineWidth = open ? 3 : 2
      ctx.stroke()
      ctx.restore()
    })

    // the pillars, the back one first, and the beam
    for (const c of [col + half - PILLAR, col - half]) {
      boxSides(ctx, P, c, r0, PILLAR, PILLAR, 0, HEIGHT, '#1b2629', '#11191b')
      P.plane(ctx, HEIGHT, () => {
        ctx.fillStyle = '#26353a'
        ctx.fillRect(c * U, r0 * U, PILLAR * U, PILLAR * U)
      })
    }
    const b0 = col - half - 0.05
    const bw = half * 2 + 0.1
    boxSides(ctx, P, b0, r0, bw, PILLAR, HEIGHT - 10, HEIGHT, '#141e21', '#0c1416')
    P.plane(ctx, HEIGHT, () => {
      ctx.fillStyle = '#1d2a2e'
      ctx.fillRect(b0 * U, r0 * U, bw * U, PILLAR * U)
    })
    // a glowing strip under the beam
    poly(ctx, leftQuad(P, r0 + PILLAR, b0 + 0.08, b0 + bw - 0.08, HEIGHT - 9, HEIGHT - 7.5))
    ctx.save()
    ctx.shadowColor = COLORS.green
    ctx.shadowBlur = blur(scene.zoom, 8)
    ctx.fillStyle = `rgba(141,255,185,${0.6 + 0.4 * pulse})`
    ctx.fill()
    ctx.restore()

    // the label and the published ports, on the ground in front
    const ports = [
      ...new Set(
        env.containers.flatMap((c) =>
          c.ports.filter((p) => isPublished(p) && !p.local).map((p) => p.hostPort!),
        ),
      ),
    ].sort((a, b) => a - b)
    P.plane(ctx, 0, () => {
      ctx.textBaseline = 'top'
      ctx.textAlign = 'center'
      ctx.font = `700 17px ${FONT.mono}`
      ctx.fillStyle = open || hovered ? COLORS.text : COLORS.greenSoft
      ctx.fillText('HOST', col * U, (row + 0.55) * U)
      ctx.font = `600 14px ${FONT.mono}`
      ctx.fillStyle = COLORS.muted
      const text = ports.length
        ? ports.slice(0, 6).join(' · ') + (ports.length > 6 ? ' …' : '')
        : 'no published ports'
      ctx.fillText(text, col * U, (row + 0.55) * U + 23)
      ctx.textAlign = 'left'
    })
  }
}
