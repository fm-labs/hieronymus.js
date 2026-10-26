/**
 * The log of the 'isocontainers' world, written over the city at the bottom right: no panel and no
 * background, only text with a dark halo, so it stays readable over the buildings; clicks pass
 * through to the map. The newest line is at the bottom; older ones fade out toward the top. Lines of
 * hidden hosts are left out.
 */
import { COLORS, FONT, PALETTE } from './isocontainers.draw.ts'
import type { LogEvent, LogStream } from './isocontainers.log.ts'

/** How many lines are shown */
const LINES = 16

const LEVEL_COLORS: Record<LogEvent['level'], string> = {
  debug: COLORS.faint,
  info: '#a9b7b2',
  warn: COLORS.amber,
  error: COLORS.red,
}

const SOURCE_COLORS: Record<LogEvent['source'], string> = {
  engine: PALETTE.volume,
  container: '#d5dfdb',
  world: COLORS.green,
}

export type LogViewOptions = {
  /** The hosts whose lines are left out (environment keys) */
  hidden: () => Set<string>
  /** A host's name, by its key */
  hostName: (key: string) => string
  /** Several hosts: each line says which */
  showHost: boolean
  /** Where the lines come from, under them: simulated, or the engine's address */
  caption: string
}

const pad = (n: number) => String(n).padStart(2, '0')
const clock = (time: number) => {
  const d = new Date(time)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!)

export class LogView {
  readonly $el: HTMLDivElement
  private readonly $lines: HTMLDivElement
  private unsubscribe: () => void

  constructor(
    $container: HTMLElement,
    private readonly stream: LogStream,
    private readonly options: LogViewOptions,
  ) {
    const $el = document.createElement('div')
    // over the canvas, under the panels (z-index 10)
    $el.style.cssText =
      `position:fixed;right:24px;bottom:68px;z-index:5;pointer-events:none;` +
      `width:min(660px, calc(100vw - 340px));font:500 11px/1.65 ${FONT.mono};` +
      'transition:right 0.3s ease, opacity 0.3s ease'
    $el.innerHTML =
      `<div class="isocontainers-log-lines" style="display:flex;flex-direction:column;justify-content:flex-end;` +
      `height:${LINES * 1.65 * 11}px;overflow:hidden;` +
      '-webkit-mask-image:linear-gradient(to bottom, transparent 0%, #000 55%);' +
      'mask-image:linear-gradient(to bottom, transparent 0%, #000 55%)"></div>' +
      `<div style="margin-top:6px;font:600 9.5px ${FONT.mono};letter-spacing:2px;color:${COLORS.faint}">` +
      `<span style="display:inline-block;width:6px;height:11px;margin-right:8px;vertical-align:-2px;` +
      `background:${COLORS.green};opacity:0.7;animation:isocontainers-caret 1.1s steps(1) infinite"></span>` +
      `${escapeHtml(options.caption)}</div>`
    if (!document.getElementById('isocontainers-log-style')) {
      const $style = document.createElement('style')
      $style.id = 'isocontainers-log-style'
      $style.textContent = '@keyframes isocontainers-caret { 50% { opacity: 0 } }'
      document.head.appendChild($style)
    }
    $container.appendChild($el)
    this.$el = $el
    this.$lines = $el.querySelector<HTMLDivElement>('.isocontainers-log-lines')!
    this.refilter()
    this.unsubscribe = stream.subscribe((e) => this.add(e, true))
  }

  /** Draw the lines again, e.g. after hosts were hidden or shown */
  refilter() {
    this.$lines.innerHTML = ''
    const hidden = this.options.hidden()
    const shown = this.stream.events.filter((e) => !e.host || !hidden.has(e.host))
    for (const e of shown.slice(-LINES)) this.add(e, false)
  }

  /** Leave room for the side pane (its width in pixels, 0 when closed) */
  setRight(px: number) {
    this.$el.style.right = `${px + 24}px`
  }

  setVisible(on: boolean) {
    this.$el.style.opacity = on ? '1' : '0'
  }

  remove() {
    this.unsubscribe()
    this.$el.remove()
  }

  private add(e: LogEvent, animate: boolean) {
    if (e.host && this.options.hidden().has(e.host)) return
    const $line = document.createElement('div')
    $line.style.cssText =
      'display:flex;gap:10px;white-space:nowrap;' +
      'text-shadow:0 0 3px #05080a, 0 0 6px #05080a, 0 0 12px rgba(5,8,10,0.9)'
    const who = [
      this.options.showHost && e.host ? this.options.hostName(e.host) : '',
      e.actor ?? '',
    ].filter(Boolean)
    const mark = e.source === 'engine' ? '◆' : e.source === 'world' ? '▸' : '·'
    $line.innerHTML =
      `<span style="color:${COLORS.faint};flex:none">${clock(e.time)}</span>` +
      `<span style="flex:none;width:${this.options.showHost ? 230 : 120}px;overflow:hidden;text-overflow:ellipsis;color:${SOURCE_COLORS[e.source]}">` +
      `<span style="opacity:0.8">${mark}</span> ` +
      who
        .map((w, i) =>
          i < who.length - 1
            ? `<span style="color:${COLORS.faint}">${escapeHtml(w)} ›</span> `
            : escapeHtml(w),
        )
        .join('') +
      `</span><span style="overflow:hidden;text-overflow:ellipsis;color:${LEVEL_COLORS[e.level]}">${escapeHtml(e.text)}</span>`
    this.$lines.appendChild($line)
    while (this.$lines.childElementCount > LINES) this.$lines.firstElementChild!.remove()
    if (animate)
      $line.animate(
        [
          { opacity: 0, transform: 'translateX(10px)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 280, easing: 'ease-out' },
      )
  }
}
