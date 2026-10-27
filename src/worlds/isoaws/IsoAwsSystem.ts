import type { IGame, IGameSystem } from '../../../lib/game.types'
import { AbstractGameSystem } from '../../../lib'
import { AWS, mix, TIER_GLOW } from './isoaws.draw.ts'
import type { Resource, ResourceKind, Subnet } from './isoaws.inventory.ts'
import { findCampus, findPlot, pickAt, type Pick, type Rect } from './isoaws.layout.ts'
import type { AwsWorld } from './isoaws.world.ts'

export type IsoAwsSystemOptions = {
  /** Where the data came from, shown in the explorer */
  source: string
  /** Accounts that can be opened from the explorer */
  accounts: string[]
  /** The selected entry of the account picker */
  current: string
  /** Select and fly to a VPC, subnet or resource id (or name) at the start */
  select?: string
}

const ICON_ROOT = '/aws/awsicons/Architecture-Service-Icons_01312023'
const ICONS: Record<ResourceKind | 'vpc', string> = {
  instance: 'Arch_Compute/48/Arch_Amazon-EC2_48.svg',
  'vpc-lambda': 'Arch_Compute/48/Arch_AWS-Lambda_48.svg',
  lambda: 'Arch_Compute/48/Arch_AWS-Lambda_48.svg',
  database: 'Arch_Database/48/Arch_Amazon-RDS_48.svg',
  'mount-target': 'Arch_Storage/48/Arch_Amazon-EFS_48.svg',
  filesystem: 'Arch_Storage/48/Arch_Amazon-EFS_48.svg',
  bucket: 'Arch_Storage/48/Arch_Amazon-Simple-Storage-Service_48.svg',
  queue: 'Arch_App-Integration/Arch_48/Arch_Amazon-Simple-Queue-Service_48.svg',
  'vpn-endpoint': 'Arch_Networking-Content-Delivery/48/Arch_AWS-Client-VPN_48.svg',
  'vpn-target': 'Arch_Networking-Content-Delivery/48/Arch_AWS-Client-VPN_48.svg',
  distribution: 'Arch_Networking-Content-Delivery/48/Arch_Amazon-CloudFront_48.svg',
  vpc: 'Arch_Networking-Content-Delivery/48/Arch_Amazon-Virtual-Private-Cloud_48.svg',
}

const KIND_LABELS: Record<ResourceKind, string> = {
  instance: 'EC2 instance',
  database: 'RDS database',
  'mount-target': 'EFS mount target',
  'vpn-target': 'Client VPN association',
  'vpc-lambda': 'Lambda function (in VPC)',
  lambda: 'Lambda function',
  bucket: 'S3 bucket',
  queue: 'SQS queue',
  filesystem: 'EFS file system',
  'vpn-endpoint': 'Client VPN endpoint',
  distribution: 'CloudFront distribution',
}

/** How tall a building is on screen, in pixels: a click on its upper part selects it */
const HEIGHTS: Partial<Record<ResourceKind, number>> = {
  'vpn-endpoint': 70,
  distribution: 56,
  'vpn-target': 40,
  database: 34,
}
const buildingHeight = (r: Resource) =>
  r.kind === 'instance' ? 16 + r.size * 8 : (HEIGHTS[r.kind] ?? 20)

const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  )

/**
 * Runs the AWS network city: day and night, picking, the explorer on the left, the info pane on the
 * right and the HUD.
 * Keys: N day / night, F fit the city, Esc clear the selection.
 */
export class IsoAwsSystem extends AbstractGameSystem implements IGameSystem {
  public name = 'IsoAwsSystem'

  private readonly world: AwsWorld
  private readonly options: IsoAwsSystemOptions
  private targetNight: number
  private skyNight = -1
  private selected?: Pick
  private $explorer?: HTMLDivElement
  private $info?: HTMLDivElement
  private $hud?: HTMLDivElement
  private previousBackground = ''

  constructor(game: IGame, world: AwsWorld, options: IsoAwsSystemOptions) {
    super(game)
    this.world = world
    this.options = options
    this.targetNight = world.scene.night
    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.handleMouseDown = this.handleMouseDown.bind(this)
  }

  public start() {
    this._game.eventbus.on('keyboard.keydown', this.handleKeyDown)
    this._game.eventbus.on('mouse.mousedown', this.handleMouseDown)
    this.previousBackground = this._game.$container.style.background
    this.$explorer = this.createPanel(
      'left:10px;top:10px;bottom:76px;width:280px;display:flex;flex-direction:column;padding:0',
    )
    this.$info = this.createPanel(
      'right:10px;top:10px;width:300px;max-height:calc(100vh - 96px);overflow-y:auto',
    )
    this.$hud = this.createPanel('left:10px;bottom:10px;right:10px;padding:8px 14px')
    this.renderExplorer()
    this.fitView()
    this.updateSky()
    this.updateView()
    this.updateHud()
    this.renderInfo()
    if (this.options.select) this.select(this.findById(this.options.select), true)
  }

  public stop() {
    this._game.eventbus.off('keyboard.keydown', this.handleKeyDown)
    this._game.eventbus.off('mouse.mousedown', this.handleMouseDown)
    this._game.$container.style.background = this.previousBackground
    this.$explorer?.remove()
    this.$info?.remove()
    this.$hud?.remove()
  }

  public async tick(deltaTime: number) {
    // cap the step, so a long frame (e.g. a background tab) doesn't jump ahead
    const seconds = Math.min(deltaTime, 100) / 1000
    const { scene } = this.world
    scene.time += seconds
    // dusk and dawn take a second
    scene.night += Math.max(-seconds, Math.min(seconds, this.targetNight - scene.night))
    this.updateSky()
    this.updateView()
  }

  /** The visible part of the world, so components can skip drawing what is off screen */
  private updateView() {
    const { offset, zoom } = this._game.camera
    const width = this._game.$container.offsetWidth || window.innerWidth
    const height = this._game.$container.offsetHeight || window.innerHeight
    const view = this.world.scene.view
    view.x0 = offset.x / zoom
    view.y0 = offset.y / zoom
    view.x1 = (offset.x + width) / zoom
    view.y1 = (offset.y + height) / zoom
  }

  /** The sky behind the slab: a pale blueprint by day, deep navy at night */
  private updateSky() {
    const night = Math.round(this.world.scene.night * 50) / 50
    if (night === this.skyNight) return
    this.skyNight = night
    const top = mix('#dfe9f5', '#03060f', night)
    const bottom = mix('#f6f8fb', '#131c38', night)
    this._game.$container.style.background = `radial-gradient(ellipse at 50% 40%, ${bottom}, ${top})`
  }

  private viewport() {
    return {
      width: this._game.$container.offsetWidth || window.innerWidth,
      height: this._game.$container.offsetHeight || window.innerHeight,
    }
  }

  /** Zoom out and center, so the whole city is visible between the panels */
  private fitView() {
    const { layout, tileMap } = this.world
    const projection = tileMap.projection
    const left = projection.mapGridToScreen(0, layout.rows).x
    const right = projection.mapGridToScreen(layout.columns, 0).x
    const top = projection.mapGridToScreen(0, 0).y - 80
    const bottom = projection.mapGridToScreen(layout.columns, layout.rows).y + 40
    const { width, height } = this.viewport()
    // leave room for the explorer and the info pane
    const free = Math.max(320, width - 600)
    const zoom = Math.max(
      0.08,
      Math.min(1.4, free / (right - left), (height - 80) / (bottom - top)),
    )
    this._game.camera.zoom = zoom
    this._game.camera.offset = {
      x: ((left + right) / 2) * zoom - (290 + free / 2),
      y: ((top + bottom) / 2) * zoom - (height - 70) / 2,
    }
  }

  /** Fly to a rectangle of cells, zooming in so it fills the space between the panels */
  private focus(target: Rect) {
    // a single building is shown with its neighborhood
    const grow = Math.max(0, Math.ceil((6 - Math.max(target.cols, target.rows)) / 2))
    const r = {
      col: target.col - grow,
      row: target.row - grow,
      cols: target.cols + grow * 2,
      rows: target.rows + grow * 2,
    }
    const projection = this.world.tileMap.projection
    const center = projection.mapGridToScreen(r.col + r.cols / 2, r.row + r.rows / 2)
    const { width, height } = this.viewport()
    const free = Math.max(320, width - 600)
    const size = ((r.cols + r.rows) * this.world.tileMap.tileWidth) / 2
    const zoom = Math.max(0.3, Math.min(2.2, (free * 0.8) / size, ((height - 80) * 1.6) / size))
    this._game.camera.zoom = zoom
    this._game.camera.offset = {
      x: center.x * zoom - (290 + free / 2),
      // a bit higher, so the buildings are in view
      y: (center.y - 30) * zoom - (height - 70) / 2,
    }
  }

  private rectOf(pick: Pick): Rect {
    switch (pick.type) {
      case 'resource': {
        const p = this.world.layout.positions.get(pick.resource.key)!
        return { col: p.col, row: p.row, cols: 1, rows: 1 }
      }
      case 'subnet':
        return pick.plot.rect
      case 'vpc':
        return pick.campus.rect
      case 'district':
        return pick.district.rect
    }
  }

  private select(pick: Pick | undefined, fly = false) {
    this.selected = pick
    const { scene, selection, tileMap, model } = this.world
    scene.selected = undefined
    scene.related = new Set()
    selection.properties.visible = !!pick
    if (pick) {
      const r = this.rectOf(pick)
      const screen = tileMap.projection.mapGridToScreen(r.col, r.row)
      selection.setPosition(screen.x, screen.y)
      selection.properties.cols = r.cols
      selection.properties.rows = r.rows
      if (fly) this.focus(r)
    }
    if (pick?.type === 'resource') {
      const resource = pick.resource
      scene.selected = resource.key
      for (const key of resource.links) {
        if (key.startsWith('subnet:')) {
          model.subnets.get(key.slice(7))?.resources.forEach((r) => scene.related.add(r.key))
        } else scene.related.add(key)
      }
      for (const other of model.resources.values()) {
        if (other.links.includes(resource.key)) scene.related.add(other.key)
      }
    } else if (pick?.type === 'subnet') {
      scene.selected = `subnet:${pick.plot.subnet.id}`
      pick.plot.subnet.resources.forEach((r) => scene.related.add(r.key))
    } else if (pick?.type === 'vpc') {
      scene.selected = `vpc:${pick.campus.vpc.id}`
      pick.campus.vpc.subnets.forEach((s) => s.resources.forEach((r) => scene.related.add(r.key)))
      pick.campus.vpc.gateways.forEach((r) => scene.related.add(r.key))
    }
    this.renderInfo()
    this.highlightExplorer()
  }

  private handleKeyDown(e: KeyboardEvent) {
    if ((e.target as HTMLElement | null)?.closest?.('select, input')) return
    if (e.key === 'n' || e.key === 'N') this.targetNight = this.targetNight > 0.5 ? 0 : 1
    else if (e.key === 'f' || e.key === 'F') this.fitView()
    else if (e.key === 'Escape') this.select(undefined)
    else return
    this.updateHud()
  }

  private handleMouseDown(e: MouseEvent) {
    // ignore clicks on the panels
    if ((e.target as HTMLElement | null)?.closest?.('.isoaws-panel')) return

    // screen → world: the TileMapSystem draws with translate(-offset), then scale(zoom)
    const rect = this._game.$container.getBoundingClientRect()
    const { offset, zoom } = this._game.camera
    const worldX = (e.clientX - rect.left + offset.x) / zoom
    const worldY = (e.clientY - rect.top + offset.y) / zoom
    const projection = this.world.tileMap.projection
    const { layout } = this.world
    // a click on the upper part of a building lands on a cell behind it: look in front first
    for (let k = 3; k >= 1; k--) {
      const { col, row } = projection.mapScreenToGrid(worldX, worldY + k * 32)
      const pick = pickAt(layout, col, row)
      if (pick?.type === 'resource' && buildingHeight(pick.resource) > k * 32 - 16) {
        return this.select(pick)
      }
    }
    const { col, row } = projection.mapScreenToGrid(worldX, worldY)
    const pick = pickAt(layout, col, row)
    // a second click on the selected district clears the selection
    this.select(pick?.type === 'district' && this.selected?.type === 'district' ? undefined : pick)
  }

  private createPanel(position: string): HTMLDivElement {
    const $panel = document.createElement('div')
    // the panel class makes the system ignore clicks on it
    $panel.className = 'isoaws-panel'
    $panel.style.cssText =
      // fixed to the viewport, so the panels stay put whatever the canvas and the page do
      `position:fixed;${position};z-index:10;padding:12px 14px;box-sizing:border-box;` +
      'background:rgba(15,20,34,0.86);color:#e8ecf4;font:12px/1.5 "Helvetica Neue",Arial,sans-serif;' +
      'border-radius:10px;border:1px solid rgba(255,153,0,0.35);' +
      'box-shadow:0 6px 24px rgba(0,0,0,0.35);backdrop-filter:blur(6px)'
    // the wheel scrolls the panel, not the map
    $panel.dataset.nativeScroll = ''
    this._game.$container.appendChild($panel)
    return $panel
  }

  private icon(kind: ResourceKind | 'vpc', size = 16) {
    return (
      `<img src="${ICON_ROOT}/${ICONS[kind]}" width="${size}" height="${size}" ` +
      `style="vertical-align:middle;border-radius:3px;margin-right:6px" onerror="this.style.display='none'">`
    )
  }

  private renderExplorer() {
    const $panel = this.$explorer
    if (!$panel) return
    const { model, layout } = this.world
    const count = (kind: ResourceKind) =>
      [...model.resources.values()].filter((r) => r.kind === kind).length
    const instances = [...model.resources.values()].filter((r) => r.kind === 'instance')
    const running = instances.filter((r) => r.state === 'running').length

    const options = ['demo', 'all', ...this.options.accounts]
      .map(
        (a) =>
          `<option value="${a}" ${a === this.options.current ? 'selected' : ''}>${a === 'demo' ? 'demo data' : a === 'all' ? 'all accounts' : a}</option>`,
      )
      .join('')
    const stat = (value: number, label: string) =>
      `<div style="flex:1;text-align:center"><div style="font-size:17px;font-weight:bold;color:#fff">${value}</div>` +
      `<div style="opacity:0.6;font-size:10px;text-transform:uppercase">${label}</div></div>`

    $panel.innerHTML =
      `<div style="padding:12px 14px 8px;border-bottom:1px solid rgba(255,255,255,0.08)">` +
      `<div style="font-weight:bold;letter-spacing:1px;color:${AWS.orange}">${this.icon('vpc', 18)}AWS NETWORK CITY</div>` +
      `<select class="isoaws-account" style="margin-top:8px;width:100%;background:#1c2438;color:#e8ecf4;` +
      `border:1px solid #3a4560;border-radius:6px;padding:4px">${options}</select>` +
      `<div style="opacity:0.55;font-size:10px;margin-top:4px;word-break:break-all">${escapeHtml(this.options.source)}</div>` +
      `<div style="display:flex;margin-top:8px">${stat(model.vpcs.size, 'VPCs')}${stat(model.subnets.size, 'subnets')}` +
      `${stat(instances.length, `EC2 · ${running} up`)}${stat(count('lambda') + count('vpc-lambda'), 'λ')}</div>` +
      `</div><div class="isoaws-tree" style="overflow-y:auto;padding:6px 8px 12px;flex:1"></div>`

    $panel.querySelector<HTMLSelectElement>('.isoaws-account')!.onchange = (e) => {
      const params = new URLSearchParams(window.location.search)
      params.set('account', (e.target as HTMLSelectElement).value)
      params.delete('inventory')
      window.location.search = params.toString()
    }

    const $tree = $panel.querySelector<HTMLDivElement>('.isoaws-tree')!
    const row = (html: string, pick: Pick, indent: number, title = '') => {
      const $row = document.createElement('div')
      $row.innerHTML = html
      $row.title = title
      $row.dataset.key = this.pickKey(pick)
      $row.style.cssText =
        `padding:2px 6px 2px ${6 + indent * 14}px;border-radius:5px;cursor:pointer;white-space:nowrap;` +
        'overflow:hidden;text-overflow:ellipsis'
      $row.onmouseenter = () =>
        ($row.style.background = $row.dataset.active ? '' : 'rgba(255,255,255,0.07)')
      $row.onmouseleave = () =>
        ($row.style.background = $row.dataset.active ? 'rgba(255,153,0,0.22)' : '')
      $row.onclick = () => this.select(pick, true)
      $tree.appendChild($row)
    }
    const dot = (color: string) =>
      `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${color};margin-right:6px"></span>`

    for (const d of layout.districts) {
      const { district } = d
      const title = district.key === 'global' ? 'Global' : district.region
      row(
        `<b style="color:${AWS.orange}">${title}</b>` +
          (district.account ? ` <span style="opacity:0.5">${district.account}</span>` : ''),
        { type: 'district', district: d },
        0,
      )
      for (const c of d.campuses) {
        row(
          `${this.icon('vpc', 14)}<b>${escapeHtml(c.vpc.name)}</b> <span style="opacity:0.55">${c.vpc.cidr}</span>`,
          { type: 'vpc', campus: c },
          1,
          c.vpc.id,
        )
        for (const plot of c.plots) {
          const s = plot.subnet
          row(
            `${dot(TIER_GLOW[s.tier])}${escapeHtml(s.name)} <span style="opacity:0.5">${s.az.slice(-1)} · ${s.resources.length}</span>`,
            { type: 'subnet', plot },
            2,
            `${s.id} ${s.cidr}`,
          )
          for (const r of s.resources) {
            row(
              `${this.icon(r.kind, 13)}${escapeHtml(r.name)}`,
              { type: 'resource', resource: r },
              3,
              r.id,
            )
          }
        }
        for (const gw of c.vpc.gateways) {
          row(
            `${this.icon(gw.kind, 13)}${escapeHtml(gw.name)}`,
            { type: 'resource', resource: gw },
            2,
            gw.id,
          )
        }
      }
      for (const r of district.services) {
        row(
          `${this.icon(r.kind, 13)}${escapeHtml(r.name)}`,
          { type: 'resource', resource: r },
          1,
          r.id,
        )
      }
    }
  }

  private pickKey(pick: Pick | undefined): string {
    if (!pick) return ''
    switch (pick.type) {
      case 'resource':
        return pick.resource.key
      case 'subnet':
        return `subnet:${pick.plot.subnet.id}`
      case 'vpc':
        return `vpc:${pick.campus.vpc.id}`
      case 'district':
        return `district:${pick.district.district.key}`
    }
  }

  private highlightExplorer() {
    const key = this.pickKey(this.selected)
    this.$explorer?.querySelectorAll<HTMLDivElement>('.isoaws-tree > div').forEach(($row) => {
      const active = $row.dataset.key === key
      $row.dataset.active = active ? '1' : ''
      $row.style.background = active ? 'rgba(255,153,0,0.22)' : ''
      if (active) $row.scrollIntoView({ block: 'nearest' })
    })
  }

  private renderInfo() {
    const $info = this.$info
    if (!$info) return
    const pick = this.selected
    if (!pick) {
      $info.innerHTML = this.overview()
      this.bindInfoLinks()
      return
    }
    const facts = (rows: Array<[string, string]>) =>
      '<table style="width:100%;border-collapse:collapse;margin-top:8px">' +
      rows
        .map(
          ([k, v]) =>
            `<tr><td style="opacity:0.55;padding:2px 8px 2px 0;vertical-align:top;white-space:nowrap">${k}</td>` +
            `<td style="word-break:break-all">${escapeHtml(v)}</td></tr>`,
        )
        .join('') +
      '</table>'
    const header = (icon: string, kind: string, name: string, sub = '') =>
      `<div style="display:flex;align-items:center;gap:10px">${icon}<div style="min-width:0">` +
      `<div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:${AWS.orange}">${kind}</div>` +
      `<div style="font-size:15px;font-weight:bold;word-break:break-all">${escapeHtml(name)}</div>` +
      (sub ? `<div style="opacity:0.6">${escapeHtml(sub)}</div>` : '') +
      '</div></div>'
    const link = (key: string, label: string) =>
      `<div class="isoaws-link" data-key="${key}" style="cursor:pointer;padding:2px 0;color:#9cc7ff">${label}</div>`
    const section = (title: string) =>
      `<div style="margin-top:12px;font-size:10px;letter-spacing:1px;text-transform:uppercase;opacity:0.55">${title}</div>`
    const { model } = this.world

    let html = ''
    if (pick.type === 'resource') {
      const r = pick.resource
      const subnet = r.subnetId ? model.subnets.get(r.subnetId) : undefined
      const vpc = r.vpcId ? model.vpcs.get(r.vpcId) : undefined
      html =
        header(this.icon(r.kind, 40), KIND_LABELS[r.kind], r.name, `${r.region} · ${r.account}`) +
        facts(r.facts)
      if (vpc || subnet) {
        html += section('Network')
        if (vpc)
          html += link(
            `vpc:${vpc.id}`,
            `${this.icon('vpc', 13)}${escapeHtml(vpc.name)} · ${vpc.cidr}`,
          )
        if (subnet)
          html += link(`subnet:${subnet.id}`, `↳ ${escapeHtml(subnet.name)} · ${subnet.cidr}`)
      }
      if (r.links.length) {
        html += section('Connected to')
        for (const key of r.links) {
          const other = model.resources.get(key)
          const s = key.startsWith('subnet:') ? model.subnets.get(key.slice(7)) : undefined
          if (other) html += link(key, `${this.icon(other.kind, 13)}${escapeHtml(other.name)}`)
          else if (s) html += link(key, `▦ ${escapeHtml(s.name)} · ${s.cidr}`)
        }
      }
    } else if (pick.type === 'subnet') {
      const s = pick.plot.subnet
      html =
        header(this.icon('vpc', 40), `${s.tier} subnet`, s.name, s.id) +
        facts([
          ['CIDR', s.cidr],
          ['Zone', s.az],
          ['Free IPs', `${s.available.toLocaleString()} of ${s.capacity.toLocaleString()}`],
        ]) +
        this.usageBar(s)
      html += section(`Resources (${s.resources.length})`)
      html +=
        s.resources
          .map((r) => link(r.key, `${this.icon(r.kind, 13)}${escapeHtml(r.name)}`))
          .join('') || '<div style="opacity:0.5">empty</div>'
    } else if (pick.type === 'vpc') {
      const { vpc, zones } = pick.campus
      const used = vpc.subnets.reduce((sum, s) => sum + s.capacity - s.available, 0)
      html =
        header(this.icon('vpc', 40), vpc.isDefault ? 'default VPC' : 'VPC', vpc.name, vpc.id) +
        facts([
          ['CIDR', vpc.cidr],
          ['Zones', zones.join(', ')],
          ['Subnets', String(vpc.subnets.length)],
          ['IPs in use', used.toLocaleString()],
          ['Region', `${vpc.region} · ${vpc.account}`],
        ])
      html += section('Subnets')
      html += vpc.subnets
        .map((s) =>
          link(
            `subnet:${s.id}`,
            `<span style="color:${TIER_GLOW[s.tier]}">■</span> ${escapeHtml(s.name)} · ${s.cidr}`,
          ),
        )
        .join('')
      if (vpc.gateways.length) {
        html += section('Gateways')
        html += vpc.gateways
          .map((g) => link(g.key, `${this.icon(g.kind, 13)}${escapeHtml(g.name)}`))
          .join('')
      }
    } else {
      const { district } = pick.district
      const services = new Map<ResourceKind, number>()
      district.services.forEach((r) => services.set(r.kind, (services.get(r.kind) ?? 0) + 1))
      html =
        header(
          this.icon('vpc', 40),
          district.key === 'global' ? 'Global' : 'Region',
          district.key === 'global' ? 'Edge locations' : district.region,
          district.account,
        ) +
        facts([
          ['VPCs', String(district.vpcs.length)],
          ['Subnets', String(district.vpcs.reduce((n, v) => n + v.subnets.length, 0))],
          ...[...services.entries()].map(([k, n]): [string, string] => [KIND_LABELS[k], String(n)]),
        ])
      html += section('VPCs')
      html +=
        district.vpcs
          .map((v) =>
            link(`vpc:${v.id}`, `${this.icon('vpc', 13)}${escapeHtml(v.name)} · ${v.cidr}`),
          )
          .join('') || '<div style="opacity:0.5">none</div>'
    }
    $info.innerHTML =
      html +
      '<div style="margin-top:12px;opacity:0.45;font-size:10px">esc to close · click a link to jump</div>'
    this.bindInfoLinks()
  }

  /** Nothing selected: what the city shows, and what it leaves out */
  private overview(): string {
    const { model } = this.world
    const hidden = model.hidden
      .slice(0, 8)
      .map(
        ([type, n]) =>
          `<div style="display:flex;justify-content:space-between"><span>${type.replace('AWS::', '')}</span><span style="opacity:0.6">${n}</span></div>`,
      )
      .join('')
    const legend = (Object.keys(TIER_GLOW) as Array<keyof typeof TIER_GLOW>)
      .map(
        (t) =>
          `<span style="margin-right:10px"><span style="color:${TIER_GLOW[t]}">■</span> ${t}</span>`,
      )
      .join('')
    return (
      `<div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:${AWS.orange}">How to read the city</div>` +
      '<div style="margin-top:6px">Every <b>region</b> is a district, every <b>VPC</b> a walled campus with its name and CIDR at the gate. ' +
      'Subnets are plots, one column per <b>availability zone</b>, colored by tier:</div>' +
      `<div style="margin-top:6px">${legend}</div>` +
      '<div style="margin-top:6px">Towers are EC2 instances (height = size, gray = stopped), purple discs RDS, masts Client VPN, kiosks Lambda, ' +
      'drums S3. The bar at the front of a plot shows the used addresses. Arcs are VPN tunnels, CloudFront origins and EFS mounts.</div>' +
      `<div style="margin-top:12px;font-size:10px;letter-spacing:1px;text-transform:uppercase;opacity:0.55">Not drawn (${model.hidden.reduce((n, [, c]) => n + c, 0)} of ${model.total})</div>` +
      `<div style="margin-top:4px;font-size:11px">${hidden}</div>`
    )
  }

  private usageBar(s: Subnet) {
    const used = s.capacity > 0 ? 1 - s.available / s.capacity : 0
    const color = used > 0.8 ? '#ff5252' : used > 0.5 ? '#ffca28' : TIER_GLOW[s.tier]
    return (
      '<div style="margin-top:6px;height:6px;border-radius:3px;background:rgba(255,255,255,0.1)">' +
      `<div style="height:6px;border-radius:3px;width:${Math.max(2, used * 100).toFixed(1)}%;background:${color}"></div></div>` +
      `<div style="opacity:0.55;font-size:10px;margin-top:2px">${(used * 100).toFixed(1)}% of the addresses in use</div>`
    )
  }

  private bindInfoLinks() {
    this.$info?.querySelectorAll<HTMLDivElement>('.isoaws-link').forEach(($link) => {
      $link.onclick = () => this.select(this.pickOf($link.dataset.key ?? ''), true)
    })
  }

  /** The pick for a VPC, subnet or resource id, or a resource name */
  private findById(id: string): Pick | undefined {
    const resource = [...this.world.model.resources.values()].find(
      (r) => r.id === id || r.name === id,
    )
    return (
      this.pickOf(`vpc:${id}`) ??
      this.pickOf(`subnet:${id}`) ??
      (resource && this.pickOf(resource.key))
    )
  }

  /** The pick for an explorer or link key */
  private pickOf(key: string): Pick | undefined {
    const { layout, model } = this.world
    if (key.startsWith('subnet:')) {
      const plot = findPlot(layout, key.slice(7))
      return plot && { type: 'subnet', plot }
    }
    if (key.startsWith('vpc:')) {
      const campus = findCampus(layout, key.slice(4))
      return campus && { type: 'vpc', campus }
    }
    const resource = model.resources.get(key)
    return resource && layout.positions.has(key) ? { type: 'resource', resource } : undefined
  }

  private updateHud() {
    if (!this.$hud) return
    const night = this.targetNight > 0.5
    this.$hud.innerHTML =
      `<b style="color:${AWS.orange}">ISO AWS</b> · ${night ? '🌙 night' : '☀️ day'}` +
      '<span style="opacity:0.6;margin-left:14px">click anything · N day / night · ' +
      'F fit · esc clear · WASD / wheel pan · ctrl+wheel zoom</span>'
  }
}
