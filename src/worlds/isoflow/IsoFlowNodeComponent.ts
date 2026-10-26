import type { GameComponentProperties, IGameComponent } from '../../../lib/game.types'
import { AbstractGameComponent } from '../../../lib'
import { CARD } from './isoflow.layout.ts'
import type { FlowNode, NodeKind } from './isoflow.types.ts'
import {
  CARD_T,
  CARD_Z,
  COLORS,
  FONT,
  fit,
  isVisible,
  roundRect,
  stateColor,
  type FlowScene,
} from './isoflow.draw.ts'

export interface IsoFlowNodeComponentProps extends GameComponentProperties {
  node: FlowNode
  scene: FlowScene
}

const U = CARD.unit
const RADIUS = 14

/**
 * A node as a dark card floating above the floor, drawn like a small app window: three dots and the
 * state in the header, the title, code or messages, and a progress bar at the bottom.
 * The caption above the card names what it is. A running card glows green.
 */
export class IsoFlowNodeComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoFlowNodeComponentProps

  public readonly componentType: string = 'IsoFlowNode'

  constructor(properties: IsoFlowNodeComponentProps) {
    super(properties)
    const { node } = properties
    // depth sorting by the center of the card
    const [x, y] = this.properties.scene.projection.at(
      node.col + node.w / 2,
      node.row + node.h / 2,
      CARD_Z,
    )
    this.setPosition(x, y)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { node: n, scene } = this.properties
    if (!isVisible(scene, this.x, this.y, (n.w + n.h) * this.properties.scene.projection.cell))
      return
    const u0 = n.col * U
    const v0 = n.row * U
    const W = n.w * U
    const H = n.h * U
    const dim = scene.lineage && !scene.lineage.has(n)
    ctx.globalAlpha = dim ? 0.3 : n.state === 'skipped' ? 0.5 : 1

    // the slab: its sides, then the face
    for (let dz = CARD_T; dz >= 1; dz--) {
      this.properties.scene.projection.plane(ctx, CARD_Z - dz, () => {
        roundRect(ctx, u0, v0, W, H, RADIUS)
        ctx.fillStyle = dz === CARD_T ? '#1d2a2c' : COLORS.cardSide
        ctx.fill()
      })
    }
    this.properties.scene.projection.plane(ctx, CARD_Z, () => {
      this.caption(ctx, u0, v0)
      roundRect(ctx, u0, v0, W, H, RADIUS)
      const face = ctx.createLinearGradient(u0, v0, u0 + W, v0 + H)
      face.addColorStop(0, COLORS.cardTop)
      face.addColorStop(1, COLORS.card)
      ctx.fillStyle = face
      ctx.fill()

      ctx.save()
      ctx.clip()
      this.header(ctx, u0, v0, W)
      this.body(ctx, u0, v0, W, H)
      this.footer(ctx, u0, v0, W, H)
      ctx.restore()

      this.border(ctx, u0, v0, W, H)
    })
    ctx.globalAlpha = 1
  }

  private caption(ctx: CanvasRenderingContext2D, u0: number, v0: number) {
    const { node: n, scene } = this.properties
    ctx.save()
    ctx.font = `600 13px ${FONT.mono}`
    ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '2px'
    ctx.textBaseline = 'bottom'
    ctx.fillStyle = scene.selected === n ? COLORS.text : COLORS.muted
    ctx.fillText(n.caption.toUpperCase(), u0 + 8, v0 - 10)
    ctx.restore()
  }

  private header(ctx: CanvasRenderingContext2D, u0: number, v0: number, W: number) {
    const { node: n } = this.properties
    ctx.fillStyle = COLORS.header
    ctx.fillRect(u0, v0, W, CARD.header)
    ctx.fillStyle = COLORS.line
    ctx.fillRect(u0, v0 + CARD.header, W, 1.5)
    // the window dots; the first one lights up while the node works
    const busy = n.state === 'running'
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i === 0 && busy ? COLORS.green : '#2b3739'
      ctx.beginPath()
      ctx.arc(u0 + CARD.pad + i * 15, v0 + CARD.header / 2, 4.5, 0, Math.PI * 2)
      ctx.fill()
    }
    // the state, on the right
    const color = stateColor(n)
    const text = this.stateText()
    ctx.font = `600 12px ${FONT.mono}`
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = color
    const right = u0 + W - CARD.pad
    ctx.fillText(text, right, v0 + CARD.header / 2 + 1)
    const width = ctx.measureText(text).width
    ctx.beginPath()
    ctx.arc(right - width - 10, v0 + CARD.header / 2, 4, 0, Math.PI * 2)
    ctx.fill()

    ctx.textAlign = 'left'
  }

  private stateText(): string {
    const n = this.properties.node
    switch (n.state) {
      case 'running':
        return `RUNNING ${Math.round(n.progress * 100)}%`
      case 'success':
        return `DONE ${n.elapsed.toFixed(1)}s`
      default:
        return n.state.toUpperCase()
    }
  }

  private body(ctx: CanvasRenderingContext2D, u0: number, v0: number, W: number, H: number) {
    const { node: n } = this.properties
    const x = u0 + CARD.pad
    const width = W - CARD.pad * 2
    let y = v0 + CARD.header + CARD.title
    ctx.font = `600 ${CARD.title}px ${FONT.ui}`
    ctx.textBaseline = 'middle'
    ctx.fillStyle = COLORS.text
    ctx.fillText(fit(ctx, n.label, width - 34), x, y)
    this.glyph(ctx, n.kind, u0 + W - CARD.pad - 12, y)
    y += 22

    if (n.table) return this.table(ctx, x, y, width)

    const messages = n.kind === 'client' && n.table === undefined && n.count > 0
    n.lines.forEach((line, i) => {
      const ly = y + i * CARD.line + CARD.line / 2
      if (ly > v0 + H - CARD.footer) return
      if (messages) {
        // chat messages in bubbles, the newest one green while it is fresh
        const fresh = i === n.lines.length - 1
        ctx.font = `500 14px ${FONT.ui}`
        const text = fit(ctx, line, width - 20)
        const w = ctx.measureText(text).width + 18
        roundRect(ctx, x, ly - 8.5, w, 17, 5)
        ctx.fillStyle = fresh ? 'rgba(62,224,127,0.14)' : 'rgba(255,255,255,0.03)'
        ctx.fill()
        ctx.strokeStyle = fresh ? COLORS.green : COLORS.line
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.fillStyle = fresh ? COLORS.greenSoft : COLORS.muted
        ctx.fillText(text, x + 9, ly + 0.5)
      } else {
        ctx.font = `500 14.5px ${FONT.mono}`
        ctx.fillStyle =
          line.trim().startsWith('@') || line.trim().startsWith('#') ? '#7fd6a3' : COLORS.muted
        ctx.fillText(fit(ctx, line, width), x, ly)
      }
    })
  }

  /** A small table, e.g. the rows of a database */
  private table(ctx: CanvasRenderingContext2D, x: number, y: number, width: number) {
    const { node: n } = this.properties
    const table = n.table!
    const first = Math.min(70, width * 0.25)
    const rowH = CARD.line
    ctx.strokeStyle = COLORS.line
    ctx.lineWidth = 1.2
    const rows = Math.max(3, table.rows.length)
    roundRect(ctx, x, y, width, rowH * (rows + 1), 6)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x + first, y)
    ctx.lineTo(x + first, y + rowH * (rows + 1))
    for (let i = 1; i <= rows; i++) {
      ctx.moveTo(x, y + rowH * i)
      ctx.lineTo(x + width, y + rowH * i)
    }
    ctx.stroke()
    ctx.font = `600 12px ${FONT.mono}`
    ctx.fillStyle = COLORS.muted
    table.columns.slice(0, 2).forEach((c, i) => {
      ctx.fillText(c, x + (i ? first : 0) + 8, y + rowH / 2)
    })
    table.rows.forEach((row, r) => {
      const fresh = r === table.rows.length - 1
      ctx.font = `500 13px ${FONT.mono}`
      ctx.fillStyle = fresh ? COLORS.greenSoft : COLORS.text
      ctx.fillText(row[0] ?? '', x + 8, y + rowH * (r + 1.5))
      ctx.fillText(fit(ctx, row[1] ?? '', width - first - 16), x + first + 8, y + rowH * (r + 1.5))
    })
  }

  private footer(ctx: CanvasRenderingContext2D, u0: number, v0: number, W: number, H: number) {
    const { node: n } = this.properties
    const x = u0 + CARD.pad
    const width = W - CARD.pad * 2
    const y = v0 + H - 13
    const info =
      n.state === 'live'
        ? `${n.count} EVENTS`
        : `${n.kind.toUpperCase()} · ~${n.duration.toFixed(1)}s`
    ctx.font = `500 11.5px ${FONT.mono}`
    ctx.fillStyle = COLORS.faint
    ctx.textBaseline = 'bottom'
    ctx.fillText(info, x, y - 6)
    if (n.state === 'live') return
    // the progress bar
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    roundRect(ctx, x, y, width, 4, 2)
    ctx.fill()
    const done =
      n.state === 'running' ? n.progress : n.state === 'success' || n.state === 'failed' ? 1 : 0
    if (!done) return
    ctx.save()
    ctx.fillStyle = n.state === 'failed' ? COLORS.red : COLORS.green
    if (n.state === 'running') {
      ctx.shadowColor = COLORS.green
      ctx.shadowBlur = 10
    } else ctx.globalAlpha *= 0.6
    roundRect(ctx, x, y, Math.max(4, width * done), 4, 2)
    ctx.fill()
    ctx.restore()
  }

  private border(ctx: CanvasRenderingContext2D, u0: number, v0: number, W: number, H: number) {
    const { node: n, scene } = this.properties
    const selected = scene.selected === n
    const hovered = scene.hovered === n
    roundRect(ctx, u0, v0, W, H, RADIUS)
    ctx.save()
    // the resting rim, always there, so the glow fades in and out over it without a jump
    ctx.strokeStyle =
      n.state === 'failed'
        ? COLORS.red
        : n.state === 'success'
          ? 'rgba(62,224,127,0.45)'
          : COLORS.line
    ctx.lineWidth = 2.5
    ctx.stroke()
    const strength = n.state === 'running' ? 0.75 : 0
    if (strength > 0.01) {
      ctx.shadowColor = COLORS.green
      ctx.shadowBlur = 12 * strength
      ctx.strokeStyle = `rgba(62,224,127,${strength})`
      ctx.lineWidth = 3
      ctx.stroke()
    }
    if (n.state === 'running') {
      // a soft spot gliding around the rim
      const perimeter = 2 * (W + H)
      ctx.shadowBlur = 0
      ctx.setLineDash([perimeter * 0.15, perimeter * 0.85])
      ctx.lineDashOffset = -scene.time * perimeter * 0.18
      ctx.strokeStyle = 'rgba(213,255,228,0.55)'
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.setLineDash([])
    }
    ctx.restore()
    if (selected || hovered) {
      ctx.save()
      ctx.strokeStyle = selected ? '#ffffff' : 'rgba(255,255,255,0.55)'
      ctx.shadowColor = 'rgba(255,255,255,0.5)'
      ctx.shadowBlur = selected ? 10 : 0
      ctx.lineWidth = selected ? 3.5 : 2.5
      roundRect(ctx, u0 - 7, v0 - 7, W + 14, H + 14, RADIUS + 6)
      if (!selected) ctx.setLineDash([10, 8])
      ctx.stroke()
      ctx.restore()
    }
  }

  /** A small line icon for the kind of node */
  private glyph(ctx: CanvasRenderingContext2D, kind: NodeKind, x: number, y: number) {
    ctx.save()
    ctx.strokeStyle = COLORS.muted
    ctx.fillStyle = COLORS.muted
    ctx.lineWidth = 2
    ctx.beginPath()
    switch (kind) {
      case 'trigger':
        ctx.moveTo(x - 5, y - 8)
        ctx.lineTo(x + 7, y)
        ctx.lineTo(x - 5, y + 8)
        ctx.closePath()
        ctx.fill()
        break
      case 'decision':
        ctx.moveTo(x, y - 9)
        ctx.lineTo(x + 9, y)
        ctx.lineTo(x, y + 9)
        ctx.lineTo(x - 9, y)
        ctx.closePath()
        ctx.stroke()
        break
      case 'join':
        ctx.moveTo(x - 9, y - 7)
        ctx.lineTo(x, y)
        ctx.lineTo(x - 9, y + 7)
        ctx.moveTo(x, y)
        ctx.lineTo(x + 9, y)
        ctx.stroke()
        break
      case 'database':
        for (const dy of [-6, 0, 6]) ctx.ellipse(x, y + dy, 9, 3.5, 0, 0, Math.PI * 2)
        ctx.stroke()
        break
      case 'storage':
        ctx.rect(x - 9, y - 7, 18, 14)
        ctx.moveTo(x - 9, y - 1)
        ctx.lineTo(x + 9, y - 1)
        ctx.stroke()
        break
      case 'queue':
        for (const dx of [-7, 0, 7]) ctx.rect(x + dx - 2.5, y - 7, 5, 14)
        ctx.stroke()
        break
      case 'api':
        ctx.font = `700 16px ${FONT.mono}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('{}', x, y)
        break
      case 'client':
        ctx.rect(x - 10, y - 7, 20, 14)
        ctx.moveTo(x - 10, y - 3)
        ctx.lineTo(x + 10, y - 3)
        ctx.stroke()
        break
      case 'server':
        ctx.rect(x - 9, y - 8, 18, 7)
        ctx.rect(x - 9, y + 1, 18, 7)
        ctx.stroke()
        break
      case 'model':
        ctx.arc(x, y, 3, 0, Math.PI * 2)
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3
          ctx.moveTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4)
          ctx.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9)
        }
        ctx.stroke()
        break
      case 'end':
        ctx.arc(x, y, 8, 0, Math.PI * 2)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fill()
        break
      default:
        ctx.rect(x - 8, y - 8, 16, 16)
        ctx.stroke()
    }
    ctx.restore()
  }
}
