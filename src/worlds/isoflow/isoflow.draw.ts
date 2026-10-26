/**
 * Drawing helpers and the color scheme of the 'isoflow' and 'flow' worlds: dark slate cards floating above a dark
 * floor, thin light outlines, monospace captions, and green light for the data that flows.
 */
import type { FlowNode, GridPoint } from './isoflow.types.ts'

export { mix, noise } from '../isovegas/isovegas.draw.ts'

export const COLORS = {
  bg0: '#06090a',
  bg1: '#0f1618',
  dot: 'rgba(120,150,140,0.16)',
  card: '#10171a',
  cardTop: '#141d20',
  cardSide: '#070b0c',
  header: '#0c1214',
  line: 'rgba(200,220,212,0.20)',
  lineStrong: 'rgba(225,238,232,0.65)',
  text: '#e9efec',
  muted: '#8a9894',
  faint: '#56625f',
  green: '#3ee07f',
  greenSoft: '#8dffb9',
  amber: '#ffc04d',
  red: '#ff5a5f',
  frame: 'rgba(225,236,231,0.75)',
}

export const FONT = {
  ui: "'Inter', 'Helvetica Neue', Arial, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace",
}

/** How high the cards float above the floor, and how thick they are, in pixels */
export const CARD_Z = 26
export const CARD_T = 5
/** The edges run on a plane just under the top of the cards */
export const EDGE_Z = CARD_Z - 3

/** Shared by all components, the system updates it every frame */
export type FlowScene = {
  /** Seconds since the start */
  time: number
  /** The visible part of the world, in world coordinates; components outside it skip drawing */
  view: { x0: number; y0: number; x1: number; y1: number }
  hovered?: FlowNode
  selected?: FlowNode
  /** The selected node and everything upstream and downstream of it */
  lineage?: Set<FlowNode>
  /** Draw the soft shadows (they are expensive on large graphs) */
  shadows: boolean
  projection: FlowProjection
}

export const isVisible = (scene: FlowScene, x: number, y: number, margin = 200) =>
  x > scene.view.x0 - margin &&
  x < scene.view.x1 + margin &&
  y > scene.view.y0 - margin &&
  y < scene.view.y1 + margin

/**
 * How the grid is drawn on screen. The layout, the cards and the edges are the same in both:
 * 'iso' lays the plane down as an isometric diamond, 'ortho' looks straight down at it.
 * Plane space has 64 units per cell, x along the columns and y along the rows.
 */
export class FlowProjection {
  private constructor(
    readonly kind: 'iso' | 'ortho',
    /** The plane-space → screen matrix (a, b, c, d of a canvas transform) */
    private readonly m: [number, number, number, number],
    /** Screen pixels per pixel of height: looking down, height only shows as a small offset */
    readonly zScale: number,
  ) {}

  static readonly iso = new FlowProjection('iso', [0.5, 0.25, -0.5, 0.25], 1)
  static readonly ortho = new FlowProjection('ortho', [1, 0, 0, 1], 0.45)

  /** About how many screen pixels a cell spans, for view margins */
  get cell() {
    return this.kind === 'iso' ? 40 : 64
  }

  /** The screen point of a grid point at a height above the floor */
  at(col: number, row: number, z = 0): GridPoint {
    const [a, b, c, d] = this.m
    const u = col * 64
    const v = row * 64
    return [a * u + c * v, b * u + d * v - z * this.zScale]
  }

  /** The grid point under a screen point, on the plane at height z */
  toGrid(x: number, y: number, z = 0): GridPoint {
    const [a, b, c, d] = this.m
    const sy = y + z * this.zScale
    const det = a * d - b * c
    return [(d * x - c * sy) / det / 64, (a * sy - b * x) / det / 64]
  }

  /** Draw in plane space at height z: rectangles and text come out lying flat on the plane */
  plane(ctx: CanvasRenderingContext2D, z: number, draw: () => void) {
    const [a, b, c, d] = this.m
    ctx.save()
    ctx.transform(a, b, c, d, 0, -z * this.zScale)
    draw()
    ctx.restore()
  }
}

/** A rounded rectangle path in plane space */
export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/** Shorten long text for a width, with an ellipsis */
export function fit(ctx: CanvasRenderingContext2D, text: string, width: number): string {
  if (ctx.measureText(text).width <= width) return text
  let lo = 0
  let hi = text.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (ctx.measureText(text.slice(0, mid) + '…').width <= width) lo = mid
    else hi = mid - 1
  }
  return text.slice(0, lo) + '…'
}

/** The accent of a node's state */
export function stateColor(node: FlowNode): string {
  switch (node.state) {
    case 'running':
    case 'live':
    case 'success':
      return COLORS.green
    case 'queued':
      return COLORS.amber
    case 'failed':
      return COLORS.red
    default:
      return COLORS.faint
  }
}
