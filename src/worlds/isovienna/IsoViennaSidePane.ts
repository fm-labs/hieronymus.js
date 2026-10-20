import { IsoViennaLandmarkComponent } from './IsoViennaLandmarkComponent.ts'
import { IsoViennaPropComponent } from './IsoViennaPropComponent.ts'
import { isoOffset, mix } from './isovienna.draw.ts'
import { formatClock, type Landmark, type Prop, type ViennaScene } from './isovienna.map.ts'
import {
  isOpen,
  popularTimes,
  PROP_DETAILS,
  SIGHT_DETAILS,
  type SightDetails,
} from './isovienna.sights.ts'

const RED = '#c8102e'
const GOLD = '#c9a043'
const INK = '#3b2f27'

/** The hours shown in the popular times chart */
const CHART_HOURS = Array.from({ length: 18 }, (_, i) => i + 6)

/**
 * A travel-guide pane on the left, the full height of the window:
 * a picture of the sight, its rating, opening hours, tickets, crowds, highlights and a local tip.
 */
export class IsoViennaSidePane {
  private readonly $pane: HTMLDivElement
  private readonly $preview: HTMLCanvasElement
  private readonly $body: HTMLDivElement
  private readonly tileSize: number
  private place?: Landmark | Prop
  /** What the preview was drawn for, to redraw it when day turns to night or summer to winter */
  private previewLook = ''

  constructor(parent: HTMLElement, tileSize: number, onClose: () => void) {
    this.tileSize = tileSize
    this.$pane = document.createElement('div')
    // the panel class makes the system ignore clicks on it
    this.$pane.className = 'isovienna-panel'
    this.$pane.style.cssText =
      'position:fixed;left:0;top:0;bottom:0;width:min(320px,85vw);z-index:11;box-sizing:border-box;' +
      `overflow-y:auto;overscroll-behavior:contain;background:rgba(251,247,238,0.97);color:${INK};` +
      `font:13px/1.5 Georgia,serif;border-right:1px solid ${GOLD};box-shadow:4px 0 18px rgba(40,25,10,0.25);` +
      'transform:translateX(-105%);transition:transform 0.3s ease;visibility:hidden'
    // scrolling the pane must not pan the map: the engine listens for the wheel on the window
    this.$pane.addEventListener(
      'wheel',
      (e) => {
        e.stopPropagation()
        if (e.ctrlKey || e.metaKey) e.preventDefault()
      },
      { passive: false },
    )

    // the Austrian flag
    const $stripe = document.createElement('div')
    $stripe.style.cssText = `height:6px;background:linear-gradient(${RED} 33%, #fff 33% 66%, ${RED} 66%)`

    const $close = document.createElement('button')
    $close.textContent = '×'
    $close.title = 'Close (esc)'
    $close.style.cssText =
      'position:absolute;right:10px;top:14px;width:28px;height:28px;border-radius:50%;border:none;' +
      `background:rgba(255,255,255,0.85);color:${INK};font:20px/26px Georgia,serif;cursor:pointer;` +
      'box-shadow:0 1px 4px rgba(0,0,0,0.25)'
    $close.onclick = onClose

    this.$preview = document.createElement('canvas')
    this.$preview.style.cssText = 'display:block;width:100%;height:190px'

    this.$body = document.createElement('div')
    this.$body.style.cssText = 'padding:14px 18px 24px'

    this.$pane.append($stripe, $close, this.$preview, this.$body)
    parent.appendChild(this.$pane)
  }

  /** The width the pane covers, 0 when it is closed */
  get width(): number {
    return this.place ? this.$pane.offsetWidth : 0
  }

  show(place: Landmark | Prop, scene: ViennaScene) {
    const changed = place !== this.place
    this.place = place
    this.$pane.style.visibility = 'visible'
    this.$pane.style.transform = 'translateX(0)'
    if (changed) {
      this.$pane.scrollTop = 0
      this.previewLook = ''
    }
    this.update(scene)
  }

  hide() {
    this.place = undefined
    this.$pane.style.transform = 'translateX(-105%)'
    this.$pane.style.visibility = 'hidden'
  }

  remove() {
    this.$pane.remove()
  }

  /** Refresh what depends on the time: open now, the crowd right now, the picture by night */
  update(scene: ViennaScene) {
    const place = this.place
    if (!place) return
    const look = `${Math.round(scene.night * 4)}${scene.winter}`
    if (look !== this.previewLook) {
      this.previewLook = look
      this.drawPreview(place, scene)
    }
    this.$body.innerHTML = this.render(place, scene)
  }

  private details(place: Landmark | Prop): SightDetails {
    return 'cols' in place ? SIGHT_DETAILS[place.kind] : PROP_DETAILS[place.kind]
  }

  private render(place: Landmark | Prop, scene: ViennaScene): string {
    const d = this.details(place)
    const open = isOpen(d, scene.hours)
    const status = !d.open
      ? '<span style="color:#2e7d32">● Open 24 hours</span>'
      : open
        ? `<span style="color:#2e7d32">● Open now</span> · until ${formatClock(d.open[1])}`
        : `<span style="color:${RED}">● Closed</span> · opens ${formatClock(d.open[0])}`
    const rows: Array<[string, string | undefined]> = [
      ['Address', d.address],
      ['District', d.district],
      ['Built', d.built],
      ['Architect', d.architect],
      ['Style', d.style],
      ['Hours', d.open && `${formatClock(d.open[0])} – ${formatClock(d.open[1])}`],
      ['Tickets', d.tickets],
      ['Getting there', d.transport],
    ]
    const label = `font-size:10.5px;letter-spacing:1.2px;color:${RED};font-weight:bold;margin:16px 0 6px`

    return (
      `<div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#8a7350">${d.category}</div>` +
      `<div style="font-size:24px;line-height:1.2;margin:2px 0 6px;color:${INK}">${place.name}</div>` +
      `<div>${stars(d.rating)} <b>${d.rating.toFixed(1)}</b> ` +
      `<span style="opacity:0.6">(${d.reviews.toLocaleString('en')} reviews)</span></div>` +
      `<div style="margin-top:2px">${status}</div>` +
      `<p style="margin:12px 0 0">${place.fact}</p>` +
      `<table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:12px">` +
      rows
        .filter(([, value]) => value)
        .map(
          ([name, value]) =>
            `<tr style="border-top:1px solid rgba(201,160,67,0.35)">` +
            `<td style="padding:5px 8px 5px 0;opacity:0.6;white-space:nowrap;vertical-align:top">${name}</td>` +
            `<td style="padding:5px 0">${value}</td></tr>`,
        )
        .join('') +
      '</table>' +
      `<div style="${label}">POPULAR TIMES</div>` +
      this.renderChart(d, place.name, scene.hours) +
      `<div style="${label}">HIGHLIGHTS</div>` +
      `<ul style="margin:0;padding-left:18px">${d.highlights.map((h) => `<li style="margin:3px 0">${h}</li>`).join('')}</ul>` +
      `<div style="margin-top:16px;padding:10px 12px;background:rgba(201,160,67,0.14);border-left:3px solid ${GOLD};border-radius:3px">` +
      `<b style="color:${RED}">Tipp</b> · ${d.tip}</div>` +
      `<div style="margin-top:18px;font-size:10.5px;opacity:0.5">Cell ${place.col}, ${place.row} · ` +
      'hours, prices, ratings and crowds are made up for this demo</div>'
    )
  }

  private renderChart(d: SightDetails, seed: string, hours: number): string {
    const busy = popularTimes(d, seed)
    const now = Math.floor(hours)
    const level = busy[now]
    const word =
      level === 0 ? 'closed' : level > 0.75 ? 'very busy' : level > 0.45 ? 'busy' : 'not busy'
    const bars = CHART_HOURS.map((hour) => {
      const color = hour === now ? RED : 'rgba(201,160,67,0.75)'
      const height = Math.max(2, Math.round(busy[hour] * 54))
      return (
        `<div title="${hour}:00" style="flex:1;display:flex;flex-direction:column;justify-content:flex-end">` +
        `<div style="height:${height}px;background:${busy[hour] ? color : 'rgba(0,0,0,0.08)'};border-radius:2px 2px 0 0"></div></div>`
      )
    }).join('')
    const ticks = [6, 9, 12, 15, 18, 21]
      .map(
        (hour) =>
          `<span style="position:absolute;left:${((hour - 6) / CHART_HOURS.length) * 100}%">${hour}h</span>`,
      )
      .join('')
    return (
      `<div style="font-size:12px;margin-bottom:6px">Right now: <b>${word}</b></div>` +
      `<div style="display:flex;gap:2px;height:56px;align-items:stretch;border-bottom:1px solid rgba(0,0,0,0.15)">${bars}</div>` +
      `<div style="position:relative;height:14px;font-size:10px;opacity:0.55">${ticks}</div>`
    )
  }

  /** Draw the sight with the world's own component, cropped and scaled to fit the picture */
  private drawPreview(place: Landmark | Prop, scene: ViennaScene) {
    const ts = this.tileSize
    const W = 1600
    const H = 1200
    const scratch = document.createElement('canvas')
    scratch.width = W
    scratch.height = H
    const ctx = scratch.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const cols = 'cols' in place ? place.cols : 1
    const rows = 'rows' in place ? place.rows : 1
    // the top corner of the front cell, low on the canvas: the towers grow upwards
    const front = { x: W / 2, y: H - 200 }
    const [bx, by] = isoOffset(ts, -(cols - 1), -(rows - 1))
    const back = { x: front.x + bx, y: front.y + by }
    // a plaza to stand on, a little larger than the footprint
    const margin = 0.25
    const corner = (c: number, r: number): [number, number] => {
      const [dx, dy] = isoOffset(ts, c, r)
      return [back.x + dx, back.y + dy]
    }
    ctx.fillStyle = scene.winter ? '#e9eef2' : '#cfc4a8'
    ctx.beginPath()
    ctx.moveTo(...corner(-margin, -margin))
    ctx.lineTo(...corner(cols + margin, -margin))
    ctx.lineTo(...corner(cols + margin, rows + margin))
    ctx.lineTo(...corner(-margin, rows + margin))
    ctx.closePath()
    ctx.fill()

    const component =
      'cols' in place
        ? new IsoViennaLandmarkComponent({ tileSize: ts, kind: place.kind, cols, rows, scene })
        : new IsoViennaPropComponent({
            tileSize: ts,
            kind: place.kind,
            col: place.col,
            row: place.row,
            scene,
          })
    component.setPosition(front.x, front.y)
    component.draw(ctx)

    const box = opaqueBounds(ctx, W, H)
    const canvas = this.$preview
    const ratio = window.devicePixelRatio || 1
    const cssWidth = canvas.clientWidth || 300
    const cssHeight = canvas.clientHeight || 190
    canvas.width = Math.round(cssWidth * ratio)
    canvas.height = Math.round(cssHeight * ratio)
    const out = canvas.getContext('2d')
    if (!out) return
    out.setTransform(ratio, 0, 0, ratio, 0, 0)

    // the sky of the moment
    const day = scene.winter ? ['#c4d0dc', '#eef1f4'] : ['#a9d4f2', '#f6ead6']
    const sky = out.createLinearGradient(0, 0, 0, cssHeight)
    sky.addColorStop(0, mix(day[0], '#081030', scene.night))
    sky.addColorStop(1, mix(day[1], '#2b2f52', scene.night))
    out.fillStyle = sky
    out.fillRect(0, 0, cssWidth, cssHeight)
    if (!box) return

    const pad = 16
    const scale = Math.min(
      (cssWidth - pad * 2) / box.width,
      (cssHeight - pad * 2) / box.height,
      // a single tree must not become a blurry giant
      2.4,
    )
    const width = box.width * scale
    const height = box.height * scale
    out.imageSmoothingQuality = 'high'
    out.drawImage(
      scratch,
      box.x,
      box.y,
      box.width,
      box.height,
      (cssWidth - width) / 2,
      cssHeight - pad - height,
      width,
      height,
    )
  }
}

/** Five stars, filled up to the rating */
function stars(rating: number): string {
  const filled = (rating / 5) * 100
  return (
    `<span style="position:relative;display:inline-block;color:rgba(201,160,67,0.35);letter-spacing:1px">★★★★★` +
    `<span style="position:absolute;left:0;top:0;overflow:hidden;white-space:nowrap;width:${filled}%;color:${GOLD}">★★★★★</span></span>`
  )
}

/** The box around everything that was drawn */
function opaqueBounds(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const { data } = ctx.getImageData(0, 0, width, height)
  let x0 = width
  let y0 = height
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] < 8) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  if (x1 < 0) return undefined
  return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }
}
