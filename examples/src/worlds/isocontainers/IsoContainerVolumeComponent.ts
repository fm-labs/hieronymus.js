import type { GameComponentProperties, IGameComponent } from '@fmlabs/world'
import { AbstractGameComponent } from '@fmlabs/world'
import type { Volume } from './isocontainers.types.ts'
import {
  blur,
  COLORS,
  FONT,
  TANK_STYLES,
  U,
  hexAlpha,
  cylinderSide,
  fit,
  focusAlpha,
  isVisible,
  type ContainersScene,
} from './isocontainers.draw.ts'

export interface IsoContainerVolumeComponentProps extends GameComponentProperties {
  volume: Volume
  scene: ContainersScene
}

/**
 * A volume as a storage tank: a dark cylinder with a rim and bands, a level ring on top that lights
 * up with each read or write, and its name and size lying on the ground in front. Its size class
 * (KB, MB, GB, TB) sets its radius and color; its height grows with the size. A tank of unknown size
 * is grey, with a dashed rim and a question mark on top.
 */
export class IsoContainerVolumeComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoContainerVolumeComponentProps

  public readonly componentType: string = 'IsoContainerVolume'

  constructor(properties: IsoContainerVolumeComponentProps) {
    super(properties)
    this.syncPosition()
  }

  /** Back to the volume's place, after the plates were laid out again */
  syncPosition() {
    const { volume: v, scene } = this.properties
    const [x, y] = scene.projection.at(v.col, v.row)
    this.setPosition(x, y)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { volume: v, scene } = this.properties
    const P = scene.projection
    if (scene.hidden.has(v.env) || !isVisible(scene, this.x, this.y, 80)) return
    const unused = !v.mounts.length
    ctx.globalAlpha = focusAlpha(scene, v) * (unused ? 0.6 : 1)
    const h = v.height
    const style = TANK_STYLES[v.sizeClass]
    const tint = (alpha: number) => hexAlpha(style.color, alpha)
    const unknown = v.sizeClass === 'unknown'

    cylinderSide(ctx, P, v.col, v.row, v.r, 0, h, style.side[0], style.side[1])
    // bands around the tank, about every 10 px
    const bands = Math.max(1, Math.round(h / 11))
    for (let i = 1; i <= bands; i++) {
      const z = (h * i) / (bands + 1)
      P.plane(ctx, z, () => {
        ctx.strokeStyle = tint(0.18)
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(v.col * U, v.row * U, v.r * U, -Math.PI / 4, (Math.PI * 3) / 4)
        ctx.stroke()
      })
    }
    P.plane(ctx, h, () => {
      const [cx, cy, r] = [v.col * U, v.row * U, v.r * U]
      ctx.fillStyle = style.top
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.save()
      ctx.shadowColor = style.color
      ctx.shadowBlur = blur(scene.zoom, 4 + 10 * v.flash)
      ctx.strokeStyle = tint(0.5 + 0.5 * v.flash)
      ctx.lineWidth = 2.5
      if (unknown) ctx.setLineDash([5, 4])
      ctx.stroke()
      ctx.restore()
      if (unknown) {
        // no level to show: a question mark
        ctx.fillStyle = tint(0.55 + 0.45 * v.flash)
        ctx.font = `700 ${Math.round(r * 1.1)}px ${FONT.mono}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('?', cx, cy + 1)
        ctx.textAlign = 'left'
        return
      }
      // the level ring
      ctx.strokeStyle = tint(0.25 + 0.55 * v.flash)
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = `rgba(235,250,255,${0.25 + 0.6 * v.flash})`
      ctx.beginPath()
      ctx.arc(cx, cy, r * 0.18, 0, Math.PI * 2)
      ctx.fill()
    })

    // the name and the size, on the ground in front of the tank
    P.plane(ctx, 0, () => {
      const [x, y] = [v.col * U, (v.row + v.r) * U + 6]
      ctx.font = `600 10px ${FONT.mono}`
      ctx.textBaseline = 'top'
      ctx.textAlign = 'center'
      ctx.fillStyle = scene.selected === v ? COLORS.text : 'rgba(220,235,240,0.7)'
      const name = v.anonymous ? `${v.name.slice(0, 8)}…` : v.name
      ctx.fillText(fit(ctx, name, 120), x, y)
      ctx.font = `700 9px ${FONT.mono}`
      ctx.fillStyle = tint(0.85)
      ctx.fillText(unknown ? 'SIZE ?' : (v.size ?? '').toUpperCase(), x, y + 13)
      ctx.textAlign = 'left'
    })

    if (scene.selected === v || scene.hovered === v) {
      ctx.save()
      ctx.strokeStyle = scene.selected === v ? '#ffffff' : 'rgba(255,255,255,0.6)'
      ctx.lineWidth = 2.5
      if (scene.selected !== v) ctx.setLineDash([6, 5])
      P.plane(ctx, h, () => {
        ctx.beginPath()
        ctx.arc(v.col * U, v.row * U, v.r * U + 9, 0, Math.PI * 2)
        ctx.stroke()
      })
      ctx.restore()
    }
    ctx.globalAlpha = 1
  }
}
