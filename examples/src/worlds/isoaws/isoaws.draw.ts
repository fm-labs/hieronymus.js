/**
 * Drawing helpers and the color scheme of the 'isoaws' world.
 * The shapes come from the isovegas drawing kit (IsoPainter), which also darkens every surface at night.
 */
import { FONT, hexAlpha } from '../isocontainers/isocontainers.draw.ts'
import type { SubnetTier } from './isoaws.inventory.ts'

export { IsoPainter, isoOffset, mix, noise, shade, type Point } from '../isovegas/isovegas.draw.ts'

/** Shared by all components, the system updates it every frame */
export type AwsScene = {
  /** Seconds since the start */
  time: number
  /** 0 = day, 1 = night */
  night: number
  /** The visible part of the world, in world coordinates; components outside it skip drawing */
  view: { x0: number; y0: number; x1: number; y1: number }
  /** Key of the selected resource, and of the resources related to it */
  selected?: string
  related: Set<string>
}

/** The AWS architecture icon colors, by category */
export const AWS = {
  compute: '#ed7100',
  storage: '#7aa116',
  database: '#c925d1',
  networking: '#8c4fff',
  integration: '#e7157b',
  ink: '#232f3e',
  orange: '#ff9900',
}

/**
 * The region plates, in the look of 'isocontainers': a dark slab, a floor lit from the back, and a
 * rim in the color of the region. They are dark by day too, so they don't go through IsoPainter.c().
 */
export const PLATE = {
  floor: '#0a1012',
  floorLit: '#111b1d',
  edge: '#18231f',
  under: '#030506',
  /** Rounded corners, in cells */
  radius: 0.75,
}

/** One color per region, in order of appearance; the same palette as the isocontainers regions */
export { REGION_COLORS } from '../isocontainers/isocontainers.layout.ts'
export { FONT, hexAlpha }

export const TIER_COLORS: Record<SubnetTier, string> = {
  public: '#a7d98b',
  private: '#9cc7ea',
  isolated: '#c3b3ec',
  transit: '#f3c995',
}

/** Bright colors for lines and painted text, they stay bright at night */
export const TIER_GLOW: Record<SubnetTier, string> = {
  public: '#5be37a',
  private: '#41b7ff',
  isolated: '#b28cff',
  transit: '#ffb347',
}

export const isVisible = (scene: AwsScene, x: number, y: number, margin = 160) =>
  x > scene.view.x0 - margin &&
  x < scene.view.x1 + margin &&
  y > scene.view.y0 - margin &&
  y < scene.view.y1 + margin

/**
 * Text painted flat on the ground, running along the columns (down to the right on screen).
 * Sizes are in 1/64 of a cell, so a 16 unit font is a quarter of a cell high. Monospace, like the
 * captions of 'isocontainers'; `spacing` is the letter spacing in the same units.
 */
export function groundText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  options: {
    weight?: string
    maxWidth?: number
    glow?: number
    align?: CanvasTextAlign
    spacing?: number
  } = {},
) {
  ctx.save()
  // text x → along the columns, text y → along the rows
  ctx.transform(0.5, 0.25, -0.5, 0.25, x, y)
  ctx.font = `${options.weight ?? 'bold'} ${size}px ${FONT.mono}`
  ctx.letterSpacing = `${options.spacing ?? 0}px`
  ctx.textAlign = options.align ?? 'left'
  ctx.textBaseline = 'middle'
  if (options.glow) {
    ctx.shadowColor = color
    ctx.shadowBlur = options.glow
  }
  ctx.fillStyle = color
  ctx.fillText(text, 0, 0, options.maxWidth)
  ctx.restore()
}

/** Shorten long names for labels */
export const ellipsis = (text: string, max: number) =>
  text.length > max ? text.slice(0, max - 1) + '…' : text
