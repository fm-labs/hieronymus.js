/**
 * The effects of the 'isocontainers' world: what makes a container's state visible from far away.
 * Windows glow in the color of the state, a crashed container burns, a paused one is frosted, a
 * starting one rises out of the ground, and a game-like marker hovers over everything that needs a
 * look. Everything is a function of the scene time and a per-container phase: no randomness while
 * drawing, so nothing flickers by accident.
 */
import { noise } from '../isovegas/isovegas.draw.ts'
import { EVENT_SECONDS, START_SECONDS } from './isocontainers.sim.ts'
import type { Container, GridPoint } from './isocontainers.types.ts'
import { COLORS, FONT, U, hexAlpha, type FlowProjection } from './isocontainers.draw.ts'

export type Mood =
  | 'ok'
  | 'unhealthy'
  | 'starting'
  | 'booting'
  | 'crashloop'
  | 'paused'
  | 'burning'
  | 'dead'
  | 'stopped'
  | 'created'

/** What a container looks like: one mood per state (and health, and exit code) */
export function moodOf(c: Container): Mood {
  switch (c.state) {
    case 'running':
      return c.health === 'unhealthy' ? 'unhealthy' : c.health === 'starting' ? 'starting' : 'ok'
    case 'restarting':
      return c.transition > 0 ? 'booting' : 'crashloop'
    case 'paused':
      return 'paused'
    case 'exited':
      return c.exitCode ? 'burning' : 'stopped'
    case 'dead':
      return 'dead'
    default:
      return 'created'
  }
}

export const ICE = '#8fd3ff'
export const FIRE = '#ff8a3d'

/** A stable phase per container, so they don't all animate in step */
export const phaseOf = (c: Container) => noise(c.name.length * 13, c.key.charCodeAt(0) || 1, 7)

const easeOut = (t: number) => 1 - (1 - t) ** 3
const clamp01 = (t: number) => Math.max(0, Math.min(1, t))

/** The height of a building now: a container that was just started rises out of the ground */
export function heightOf(c: Container): number {
  if (moodOf(c) !== 'booting') return c.height
  return c.height * (0.08 + 0.92 * easeOut(clamp01(1 - c.transition / START_SECONDS)))
}

/** 0..1, how far a boot is along: the floors light up from the bottom */
function bootProgress(c: Container, time: number, phase: number): number {
  const mood = moodOf(c)
  if (mood === 'booting') return clamp01(1 - c.transition / START_SECONDS)
  // health check pending: the floors keep filling, slowly
  return (time * 0.3 + phase) % 1
}

/**
 * The color of a window (floor f of floors, window i), or undefined for a dark window.
 * `level` is the running load, 0..1, past this window's own threshold.
 */
export function windowColor(
  c: Container,
  mood: Mood,
  level: number,
  i: number,
  f: number,
  floors: number,
  time: number,
  phase: number,
): string | undefined {
  const n = noise(i * 3 + 1, f + 1, c.name.length)
  switch (mood) {
    case 'ok':
      return level > 0.01 ? `rgba(141,255,185,${0.06 + 0.5 * level})` : undefined
    case 'unhealthy': {
      // sick: red, and a slow, uneven pulse through the building
      const pulse = 0.5 + 0.5 * Math.sin(time * 2.2 + i * 1.7 + f * 0.9 + phase * 6)
      return `rgba(255,96,100,${0.12 + 0.45 * pulse * (0.4 + 0.6 * Math.max(level, 0.5))})`
    }
    case 'starting':
    case 'booting': {
      const fill = bootProgress(c, time, phase) * floors
      const lit = clamp01(fill - f)
      return lit > 0.01 ? `rgba(255,192,77,${0.1 + 0.55 * lit})` : undefined
    }
    case 'crashloop': {
      // the floors light up from the bottom, then the process dies: red, and dark again
      const t = (time * 0.55 + phase) % 1
      if (t < 0.72) {
        const lit = clamp01((t / 0.72) * floors - f)
        return lit > 0.01 ? `rgba(255,192,77,${0.1 + 0.5 * lit})` : undefined
      }
      const fade = 1 - (t - 0.72) / 0.28
      return `rgba(255,90,95,${0.55 * fade * fade})`
    }
    case 'paused':
      // frozen in the middle of whatever it was doing
      return n < 0.55 ? `rgba(143,211,255,${0.18 + 0.3 * n})` : 'rgba(143,211,255,0.06)'
    case 'burning': {
      if (n > 0.7) return undefined
      const flicker =
        0.5 + 0.3 * Math.sin(time * 6.3 + i * 2.1 + f * 1.3) + 0.2 * Math.sin(time * 11.7 + n * 9)
      return `rgba(255,${110 + Math.round(60 * flicker)},40,${0.2 + 0.5 * flicker})`
    }
    case 'dead':
      // a few embers left behind
      return n < 0.18 ? `rgba(255,90,40,${0.12 + 0.12 * Math.sin(time * 1.3 + n * 20)})` : undefined
    case 'stopped':
      // the lights are off; one is still on in the lobby
      return f === 0 && i === 0 ? 'rgba(233,239,236,0.16)' : undefined
    default:
      return undefined
  }
}

/** The colors of a building's sides, by mood: charred when it burned, a blueprint when never started */
export function faceColors(mood: Mood): [string, string] {
  if (mood === 'burning' || mood === 'dead') return ['#0b0b0b', '#060606']
  if (mood === 'created') return ['rgba(76,201,240,0.06)', 'rgba(76,201,240,0.03)']
  if (mood === 'paused') return ['#101a20', '#0a1218']
  return ['#0f181a', '#0a1113']
}

/** Flames on a roof, drawn additively: a few tongues, each with a red outer and a yellow inner flame */
export function flames(
  ctx: CanvasRenderingContext2D,
  P: FlowProjection,
  c: Container,
  h: number,
  time: number,
  strength = 1.25,
) {
  const count = 5
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  // the glow of the fire on and around the roof
  const [gx, gy] = P.at(c.col + c.w / 2, c.row + c.d / 2, h)
  const flicker = 0.8 + 0.12 * Math.sin(time * 7.1) + 0.08 * Math.sin(time * 12.9)
  const glow = ctx.createRadialGradient(gx, gy - 10, 0, gx, gy - 10, 90 * strength)
  glow.addColorStop(0, `rgba(255,140,50,${0.35 * flicker * strength})`)
  glow.addColorStop(1, 'rgba(255,80,30,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(gx, gy - 10, 90 * strength, 0, Math.PI * 2)
  ctx.fill()

  for (let i = 0; i < count; i++) {
    const col = c.col + c.w * (0.2 + 0.6 * noise(i, 3, c.name.length))
    const row = c.row + c.d * (0.2 + 0.6 * noise(i, 5, c.name.length))
    const [bx, by] = P.at(col, row, h)
    const t = time * (5 + i) + i * 2.3
    const fh = (24 + 10 * Math.sin(t) + 6 * Math.sin(t * 1.7 + 1)) * strength
    const sway = 4 * Math.sin(t * 0.8)
    tongue(ctx, bx, by, 10 * strength, fh, sway, ['rgba(255,70,30,0.9)', 'rgba(255,40,20,0)'])
    tongue(ctx, bx, by, 5.5 * strength, fh * 0.6, sway * 0.6, [
      'rgba(255,236,150,0.95)',
      'rgba(255,150,40,0)',
    ])
  }
  ctx.restore()
}

function tongue(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  sway: number,
  [base, tip]: [string, string],
) {
  const gradient = ctx.createLinearGradient(x, y, x, y - h)
  gradient.addColorStop(0, base)
  gradient.addColorStop(1, tip)
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.moveTo(x - w, y)
  ctx.quadraticCurveTo(x - w * 0.9, y - h * 0.5, x + sway, y - h)
  ctx.quadraticCurveTo(x + w * 0.9, y - h * 0.5, x + w, y)
  ctx.quadraticCurveTo(x, y + w * 0.5, x - w, y)
  ctx.fill()
}

/** Smoke rising from a roof (and embers, while it burns): looping puffs, each with its own phase */
export function smoke(
  ctx: CanvasRenderingContext2D,
  P: FlowProjection,
  c: Container,
  h: number,
  time: number,
  burning: boolean,
) {
  const [x0, y0] = P.at(c.col + c.w / 2, c.row + c.d / 2, h)
  const puffs = burning ? 8 : 4
  ctx.save()
  for (let i = 0; i < puffs; i++) {
    const age = (time * (burning ? 0.22 : 0.14) + i / puffs) % 1
    const x = x0 + Math.sin(age * 3 + i) * 10 + age * 46
    const y = y0 - 18 - age * (burning ? 150 : 100)
    const r = (burning ? 10 : 7) + age * (burning ? 30 : 20)
    const alpha = (burning ? 0.3 : 0.18) * (1 - age) * Math.min(1, age * 6)
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r)
    gradient.addColorStop(0, `rgba(150,156,158,${alpha})`)
    gradient.addColorStop(1, 'rgba(110,116,118,0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  if (burning) {
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 7; i++) {
      const age = (time * 0.6 + i / 7 + noise(i, 9, c.name.length) * 0.5) % 1
      const x = x0 + (noise(i, 1, c.name.length) - 0.5) * 50 + Math.sin(age * 9 + i) * 6
      const y = y0 - 10 - age * 90
      ctx.fillStyle = `rgba(255,${150 + i * 10},60,${0.9 * (1 - age)})`
      ctx.beginPath()
      ctx.arc(x, y, 1.8 * (1 - age * 0.5), 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

/** Icicles under the front edges of a frozen roof */
export function icicles(ctx: CanvasRenderingContext2D, P: FlowProjection, c: Container, h: number) {
  ctx.save()
  ctx.fillStyle = 'rgba(190,230,255,0.75)'
  const drop = (p: GridPoint, length: number) => {
    ctx.beginPath()
    ctx.moveTo(p[0] - 2.2, p[1])
    ctx.lineTo(p[0] + 2.2, p[1])
    ctx.lineTo(p[0], p[1] + length)
    ctx.closePath()
    ctx.fill()
  }
  const across = Math.round(c.w / 0.3)
  for (let i = 1; i < across; i++)
    drop(P.at(c.col + (c.w * i) / across, c.row + c.d, h), 3 + 6 * noise(i, 2, c.name.length))
  const deep = Math.round(c.d / 0.3)
  for (let i = 1; i < deep; i++)
    drop(P.at(c.col + c.w, c.row + (c.d * i) / deep, h), 3 + 6 * noise(i, 4, c.name.length))
  ctx.restore()
}

/** Ripples on the roof for each request that arrived, red sparks for each that failed */
export function arrivals(
  ctx: CanvasRenderingContext2D,
  P: FlowProjection,
  c: Container,
  h: number,
) {
  const [cu, cv] = [(c.col + c.w / 2) * U, (c.row + c.d / 2) * U]
  if (c.pings.length) {
    P.plane(ctx, h, () => {
      for (const age of c.pings) {
        const t = age / EVENT_SECONDS
        ctx.strokeStyle = `rgba(141,255,185,${0.55 * (1 - t) * (1 - t)})`
        ctx.lineWidth = 3 * (1 - t) + 1
        ctx.beginPath()
        ctx.arc(cu, cv, 24 + t * 110, 0, Math.PI * 2)
        ctx.stroke()
      }
    })
  }
  if (c.sparks.length) {
    const [x0, y0] = P.at(c.col + c.w / 2, c.row + c.d / 2, h)
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.lineCap = 'round'
    for (const age of c.sparks) {
      const t = age / EVENT_SECONDS
      // a red shock ring on the roof
      P.plane(ctx, h, () => {
        ctx.strokeStyle = `rgba(255,90,95,${0.6 * (1 - t)})`
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(cu, cv, 20 + t * 70, 0, Math.PI * 2)
        ctx.stroke()
      })
      // sparks flying out and falling
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + noise(i, 1, c.name.length) * 0.6
        const speed = 40 + 30 * noise(i, 3, c.name.length)
        const x = x0 + Math.cos(a) * speed * t
        const y = y0 - 8 + Math.sin(a) * speed * t * 0.5 - 30 * t + 60 * t * t
        ctx.strokeStyle = `rgba(255,${120 + i * 12},70,${1 - t})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x - Math.cos(a) * 6, y - Math.sin(a) * 3 + 4 * t)
        ctx.stroke()
      }
    }
    ctx.restore()
  }
}

const MARKERS: Partial<Record<Mood, { color: string; label?: (c: Container) => string }>> = {
  unhealthy: { color: COLORS.red, label: () => 'UNHEALTHY' },
  starting: { color: COLORS.amber, label: () => 'HEALTH CHECK' },
  booting: { color: COLORS.amber, label: () => 'STARTING' },
  crashloop: { color: COLORS.amber, label: () => 'CRASH LOOP' },
  paused: { color: ICE, label: () => 'PAUSED' },
  burning: { color: COLORS.red, label: (c) => `EXIT ${c.exitCode}` },
  dead: { color: '#b0b8b6', label: () => 'DEAD' },
  stopped: { color: COLORS.muted, label: () => 'DONE' },
  created: { color: '#6fb6d6', label: () => 'NOT STARTED' },
}

/** Has a marker: everything that is not just running fine */
export const hasMarker = (c: Container) => moodOf(c) !== 'ok'

/** How high a marker hovers above the roof, in pixels; labels go above it */
export const MARKER_LIFT = 46

/**
 * A game-like marker hovering over a building: a glowing diamond with an icon, bobbing gently,
 * a thin tether down to the roof and a soft shadow on it, and a small caption under it.
 */
export function marker(
  ctx: CanvasRenderingContext2D,
  P: FlowProjection,
  c: Container,
  h: number,
  time: number,
  zoom: number,
) {
  const mood = moodOf(c)
  const style = MARKERS[mood]
  if (!style) return
  const phase = phaseOf(c)
  // urgent ones bob faster
  const urgent = mood === 'unhealthy' || mood === 'burning' || mood === 'crashloop'
  const bob = Math.sin(time * (urgent ? 3.2 : 1.8) + phase * 6) * 4
  const [rx, ry] = P.at(c.col + c.w / 2, c.row + c.d / 2, h)
  const [x, y] = [rx, ry - MARKER_LIFT + bob]
  // keep it readable when zoomed out
  const s = Math.max(1, 0.75 / zoom)
  const r = 13 * s

  ctx.save()
  // the shadow on the roof and the tether
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath()
  ctx.ellipse(rx, ry, r * (0.9 - bob / 40), r * 0.42, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = hexAlpha(style.color, 0.35)
  ctx.lineWidth = 1.2 * s
  ctx.setLineDash([2 * s, 3 * s])
  ctx.beginPath()
  ctx.moveTo(rx, ry)
  ctx.lineTo(x, y + r)
  ctx.stroke()
  ctx.setLineDash([])

  // the diamond
  ctx.shadowColor = style.color
  ctx.shadowBlur = (urgent ? 16 : 10) * s
  ctx.fillStyle = 'rgba(9,13,14,0.92)'
  ctx.strokeStyle = style.color
  ctx.lineWidth = 2 * s
  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.lineTo(x + r, y)
  ctx.lineTo(x, y + r)
  ctx.lineTo(x - r, y)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.shadowBlur = 0
  icon(ctx, mood, x, y, s, time + phase * 10, style.color)

  // the caption
  if (style.label) {
    const text = style.label(c)
    ctx.font = `700 ${9 * s}px ${FONT.mono}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    const w = ctx.measureText(text).width + 8 * s
    ctx.fillStyle = 'rgba(9,13,14,0.85)'
    ctx.beginPath()
    ctx.roundRect(x - w / 2, y - r - 16 * s, w, 13 * s, 3 * s)
    ctx.fill()
    ctx.fillStyle = style.color
    ctx.fillText(text, x, y - r - 14 * s)
    ctx.textAlign = 'left'
  }
  ctx.restore()
}

function icon(
  ctx: CanvasRenderingContext2D,
  mood: Mood,
  x: number,
  y: number,
  s: number,
  time: number,
  color: string,
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  switch (mood) {
    case 'unhealthy':
      ctx.moveTo(0, -6)
      ctx.lineTo(0, 1.5)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(0, 5, 1.6, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'starting':
    case 'booting': {
      // an hourglass that turns over every two seconds
      const t = time % 2
      ctx.rotate(t > 1.6 ? ((t - 1.6) / 0.4) * Math.PI : 0)
      ctx.moveTo(-4.5, -6)
      ctx.lineTo(4.5, -6)
      ctx.lineTo(-4.5, 6)
      ctx.lineTo(4.5, 6)
      ctx.closePath()
      ctx.stroke()
      break
    }
    case 'crashloop':
      // two arrows chasing each other
      ctx.rotate(time * 3)
      for (const start of [0, Math.PI]) {
        ctx.beginPath()
        ctx.arc(0, 0, 5.5, start + 0.3, start + 2.6)
        ctx.stroke()
        const a = start + 2.6
        const [ex, ey] = [Math.cos(a) * 5.5, Math.sin(a) * 5.5]
        ctx.beginPath()
        ctx.moveTo(ex + Math.cos(a - 1.2) * 3, ey + Math.sin(a - 1.2) * 3)
        ctx.lineTo(ex, ey)
        ctx.lineTo(ex + Math.cos(a + 2.3) * 3, ey + Math.sin(a + 2.3) * 3)
        ctx.stroke()
      }
      break
    case 'paused':
      ctx.fillRect(-4.5, -5.5, 3, 11)
      ctx.fillRect(1.5, -5.5, 3, 11)
      break
    case 'burning':
    case 'dead':
      ctx.moveTo(-4.5, -4.5)
      ctx.lineTo(4.5, 4.5)
      ctx.moveTo(4.5, -4.5)
      ctx.lineTo(-4.5, 4.5)
      ctx.stroke()
      break
    case 'stopped':
      ctx.moveTo(-5, 0.5)
      ctx.lineTo(-1.5, 4)
      ctx.lineTo(5, -4)
      ctx.stroke()
      break
    case 'created':
      ctx.font = `700 9px ${FONT.mono}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Zz', 0, 0.5)
      break
  }
  ctx.restore()
}

export const SEVERITY_COLORS = { risk: COLORS.red, warn: COLORS.amber, tip: '#6fb6d6' }

/**
 * The advisor's flag on a building: a small bubble at the front corner of the roof with how many
 * pieces of advice are open, in the color of the worst.
 */
export function adviceChip(
  ctx: CanvasRenderingContext2D,
  P: FlowProjection,
  c: Container,
  h: number,
  advice: { count: number; severity: keyof typeof SEVERITY_COLORS },
  time: number,
  zoom: number,
) {
  const color = SEVERITY_COLORS[advice.severity]
  const s = Math.max(1, 0.7 / zoom)
  const bob = Math.sin(time * 1.6 + phaseOf(c) * 6) * 1.5
  const [bx, by] = P.at(c.col + 0.32, c.row + c.d - 0.32, h)
  const [x, y] = [bx, by - 16 * s + bob]
  const r = 7.5 * s
  ctx.save()
  ctx.fillStyle = 'rgba(9,13,14,0.92)'
  ctx.strokeStyle = color
  ctx.lineWidth = 1.6 * s
  if (advice.severity === 'risk') {
    ctx.shadowColor = color
    ctx.shadowBlur = 8 * s
  }
  // a bubble with a tail down to the roof
  ctx.beginPath()
  ctx.arc(x, y, r, Math.PI * 0.62, Math.PI * 2.38)
  ctx.lineTo(bx, by - 2 * s + bob / 2)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.fillStyle = color
  ctx.font = `700 ${9 * s}px ${FONT.mono}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(advice.count > 9 ? '9+' : String(advice.count), x, y + 0.5 * s)
  ctx.restore()
}

/** Text rising from a building and fading out, e.g. '+4' for a fix */
export const POPUP_SECONDS = 1.8

export function popup(
  ctx: CanvasRenderingContext2D,
  P: FlowProjection,
  p: { col: number; row: number; z: number; text: string; color: string; born: number },
  time: number,
  zoom: number,
) {
  const t = (time - p.born) / POPUP_SECONDS
  if (t < 0 || t > 1) return
  const s = Math.max(1, 0.8 / zoom)
  const [x, y] = P.at(p.col, p.row, p.z)
  ctx.save()
  ctx.globalAlpha *= t < 0.15 ? t / 0.15 : 1 - Math.max(0, (t - 0.5) / 0.5)
  ctx.font = `700 ${15 * s}px ${FONT.mono}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = p.color
  ctx.shadowBlur = 12
  ctx.fillStyle = p.color
  ctx.fillText(p.text, x, y - 20 * s - t * 40 * s)
  ctx.restore()
}
