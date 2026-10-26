import type { GameComponentProperties, IGameComponent } from '../../../lib/game.types'
import { AbstractGameComponent } from '../../../lib'
import type { FlowGroup, FlowModel } from './isoflow.types.ts'
import { COLORS, FONT, isVisible, roundRect, type FlowScene } from './isoflow.draw.ts'

export interface IsoFlowFloorComponentProps extends GameComponentProperties {
  model: FlowModel
  scene: FlowScene
}

const U = 64

/**
 * Everything on the floor, below the floating cards: the group frames with their names,
 * the soft shadows of the cards, and the green light under the busy ones.
 */
export class IsoFlowFloorComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoFlowFloorComponentProps

  public readonly componentType: string = 'IsoFlowFloor'

  constructor(properties: IsoFlowFloorComponentProps) {
    super(properties)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { model, scene } = this.properties
    for (const g of model.groups) this.frame(ctx, g)

    this.properties.scene.projection.plane(ctx, 0, () => {
      for (const n of model.nodes) {
        const [x, y] = this.properties.scene.projection.at(n.col + n.w / 2, n.row + n.h / 2)
        if (!isVisible(scene, x, y, (n.w + n.h) * this.properties.scene.projection.cell)) continue
        const dim = scene.lineage && !scene.lineage.has(n)
        // the shadow, a little in front of the card
        ctx.save()
        ctx.globalAlpha = dim ? 0.4 : 1
        if (scene.shadows) {
          ctx.shadowColor = 'rgba(0,0,0,0.75)'
          ctx.shadowBlur = 18
        }
        ctx.fillStyle = 'rgba(0,0,0,0.42)'
        roundRect(ctx, n.col * U + 22, n.row * U + 22, n.w * U, n.h * U, 16)
        ctx.fill()
        ctx.restore()

        // green light on the floor under a busy card
        const light = n.state === 'running' ? 0.5 : 0
        if (light > 0.01) {
          const cx = (n.col + n.w / 2) * U
          const cy = (n.row + n.h / 2) * U
          const r = Math.max(n.w, n.h) * U * 0.95
          const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
          gradient.addColorStop(0, `rgba(62,224,127,${0.42 * light})`)
          gradient.addColorStop(0.5, `rgba(62,224,127,${0.12 * light})`)
          gradient.addColorStop(1, 'rgba(62,224,127,0)')
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(cx, cy, r, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    })
  }

  /** A glass plate with a bright rim, and the group's name along its front edge */
  private frame(ctx: CanvasRenderingContext2D, g: FlowGroup) {
    const { scene } = this.properties
    const [x, y] = this.properties.scene.projection.at(g.col + g.cols / 2, g.row + g.rows / 2)
    if (!isVisible(scene, x, y, (g.cols + g.rows) * this.properties.scene.projection.cell)) return
    const u0 = g.col * U
    const v0 = g.row * U
    const w = g.cols * U
    const h = g.rows * U
    // the edge of the plate
    this.properties.scene.projection.plane(ctx, -6, () => {
      roundRect(ctx, u0, v0, w, h, 44)
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.fill()
    })
    this.properties.scene.projection.plane(ctx, 0, () => {
      roundRect(ctx, u0, v0, w, h, 44)
      const glass = ctx.createLinearGradient(u0, v0, u0 + w, v0 + h)
      glass.addColorStop(0, 'rgba(255,255,255,0.035)')
      glass.addColorStop(1, 'rgba(255,255,255,0.01)')
      ctx.fillStyle = glass
      ctx.fill()
      ctx.save()
      ctx.shadowColor = 'rgba(230,255,240,0.35)'
      ctx.shadowBlur = 8
      ctx.strokeStyle = COLORS.frame
      ctx.lineWidth = 3.5
      ctx.stroke()
      ctx.restore()

      // the name: a small ring mark, the label in bold, the caption in mono
      const lx = u0 + 46
      const ly = v0 + h - 50
      ctx.save()
      ctx.shadowColor = 'rgba(255,255,255,0.35)'
      ctx.shadowBlur = 6
      ctx.strokeStyle = COLORS.text
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.ellipse(lx + 16, ly, 16, 11, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = COLORS.text
      ctx.beginPath()
      ctx.arc(lx + 16, ly, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.font = `700 40px ${FONT.ui}`
      ctx.textBaseline = 'middle'
      ctx.fillText(g.label, lx + 46, ly + 2)
      const width = ctx.measureText(g.label).width
      ctx.restore()
      if (g.caption) {
        ctx.font = `500 15px ${FONT.mono}`
        ctx.fillStyle = COLORS.muted
        ctx.textBaseline = 'middle'
        ctx.fillText(g.caption.toUpperCase(), lx + 62 + width, ly + 4)
      }
    })
  }
}
