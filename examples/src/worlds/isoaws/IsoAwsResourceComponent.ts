import type { GameComponentProperties, IGameComponent } from '@fmlabs/world'
import { AbstractGameComponent } from '@fmlabs/world'
import type { Resource } from './isoaws.inventory.ts'
import { AWS, IsoPainter, isVisible, mix, noise, shade, type AwsScene } from './isoaws.draw.ts'

export interface IsoAwsResourceComponentProps extends GameComponentProperties {
  tileSize: number
  resource: Resource
  col: number
  row: number
  scene: AwsScene
}

const STOPPED = '#8d939c'

/**
 * One resource as a building on its cell. Everything is drawn with the IsoPainter, so the colors
 * darken at night while windows, status lights and beacons light up.
 */
export class IsoAwsResourceComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoAwsResourceComponentProps

  public readonly componentType: string = 'IsoAwsResource'

  constructor(properties: IsoAwsResourceComponentProps) {
    super(properties)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { tileSize, resource, scene } = this.properties
    const x = this.x
    const y = this.y + tileSize / 4
    if (!isVisible(scene, x, y)) return
    const p = new IsoPainter(ctx, tileSize, scene.night)
    // everything not related to the selection steps back a little
    const dimmed =
      !!scene.selected && scene.selected !== resource.key && !scene.related.has(resource.key)
    if (dimmed) ctx.globalAlpha = 0.45

    switch (resource.kind) {
      case 'instance':
        return this.instance(p, x, y)
      case 'database':
        return this.database(p, x, y)
      case 'mount-target':
        return this.mountTarget(p, x, y)
      case 'vpn-target':
        return this.vpnTarget(p, x, y)
      case 'vpc-lambda':
      case 'lambda':
        return this.lambda(p, x, y)
      case 'bucket':
        return this.bucket(p, x, y)
      case 'queue':
        return this.queue(p, x, y)
      case 'filesystem':
        return this.fileSystem(p, x, y)
      case 'vpn-endpoint':
        return this.vpnEndpoint(p, x, y)
      case 'distribution':
        return this.distribution(p, x, y)
    }
  }

  private get seed() {
    const { col, row } = this.properties
    return col * 31 + row * 17
  }

  /** A small status light: green when running or available, red when stopped, amber otherwise */
  private statusLight(p: IsoPainter, x: number, y: number) {
    const state = this.properties.resource.state ?? ''
    const ok = ['running', 'available', 'associated', 'Deployed', 'in-use'].includes(state)
    const bad = ['stopped', 'terminated', 'failed', 'deleted'].includes(state)
    const color = ok ? '#4cff7a' : bad ? '#ff4d4d' : '#ffc53d'
    const blink = ok ? 0.6 + 0.4 * Math.sin(this.properties.scene.time * 3 + this.seed) : 1
    p.light(x, y, 9, color, (0.35 + p.night * 0.5) * blink)
    p.ctx.fillStyle = color
    p.ctx.beginPath()
    p.ctx.arc(x, y, 1.8, 0, Math.PI * 2)
    p.ctx.fill()
  }

  /** EC2: a tower, as high as the instance is large, with its EBS volumes beside it */
  private instance(p: IsoPainter, x: number, y: number) {
    const { resource } = this.properties
    const running = resource.state === 'running'
    const color = running ? mix(AWS.compute, '#ffd2a1', 0.25) : STOPPED
    const height = 14 + resource.size * 8
    const box = { cols: 0.5, rows: 0.5, height, color }
    p.shadow(x, y, 0.62, 0.62)
    // the volumes: small green drums on the left
    for (let i = 0; i < Math.min(3, resource.volumes); i++) {
      const [vx, vy] = [x - 20 + i * 5, y + 2 + i * 3]
      p.cylinder(vx, vy, 0.07, 7, AWS.storage)
    }
    p.box(x, y, box)
    // a stopped instance has no windows: IsoPainter would light them at night
    if (running) p.windows(x, y, box, this.seed, '#ffe7c7', 6)
    // the roof: a cap, and containers when it runs ECS tasks
    const [, , front] = p.box(x, y, {
      cols: 0.42,
      rows: 0.42,
      height: 2,
      elevation: height,
      color: shade(color, -0.2),
    })
    if (resource.ecs) {
      const colors = ['#ff9900', '#00a1c9', '#e7157b']
      colors.forEach((c, i) =>
        p.box(x - 6 + i * 6, y - 2 + (i % 2) * 2, {
          cols: 0.12,
          rows: 0.2,
          height: 5,
          elevation: height + 2,
          color: c,
        }),
      )
    }
    this.statusLight(p, front[0], front[1] - 6)
  }

  /** RDS: a stack of database discs */
  private database(p: IsoPainter, x: number, y: number) {
    const { resource } = this.properties
    const ok = resource.state === 'available'
    const color = ok ? mix(AWS.database, '#ffffff', 0.15) : STOPPED
    p.shadow(x, y, 0.6, 0.6)
    const disc = 8 + resource.size
    for (let i = 0; i < 3; i++) {
      p.cylinder(x, y, 0.3, disc - 2, color, i * disc)
      p.cylinder(x, y, 0.3, 2, shade(color, 0.35), i * disc + disc - 2)
    }
    // a glowing band at night, like a server's activity light
    if (p.night > 0 && ok) {
      const pulse = 0.5 + 0.5 * Math.sin(this.properties.scene.time * 2 + this.seed)
      p.light(x, y - disc * 1.5, 22, '#ff7af5', p.night * 0.35 * pulse)
    }
    this.statusLight(p, x, y - disc * 3 - 6)
  }

  /** EFS mount target: a green connector box with a pipe into the ground */
  private mountTarget(p: IsoPainter, x: number, y: number) {
    p.shadow(x, y, 0.4, 0.4)
    p.cylinder(x + 8, y + 2, 0.06, 10, shade(AWS.storage, -0.2))
    p.box(x, y, { cols: 0.34, rows: 0.3, height: 12, color: mix(AWS.storage, '#ffffff', 0.15) })
    p.box(x, y, {
      cols: 0.2,
      rows: 0.18,
      height: 3,
      elevation: 12,
      color: shade(AWS.storage, -0.25),
    })
  }

  /** Client VPN association: a mast with a blinking beacon */
  private vpnTarget(p: IsoPainter, x: number, y: number) {
    const color = mix(AWS.networking, '#ffffff', 0.2)
    p.shadow(x, y, 0.3, 0.3)
    p.box(x, y, { cols: 0.26, rows: 0.26, height: 6, color: shade(color, -0.2) })
    p.box(x, y, { cols: 0.06, rows: 0.06, height: 30, elevation: 6, color })
    const blink = Math.sin(this.properties.scene.time * 4 + this.seed) > 0 ? 1 : 0.3
    p.light(x, y - 38, 14, '#c9a7ff', (0.4 + p.night * 0.6) * blink)
    p.ctx.fillStyle = '#e6d9ff'
    p.ctx.beginPath()
    p.ctx.arc(x, y - 38, 2, 0, Math.PI * 2)
    p.ctx.fill()
  }

  /** Lambda: a little kiosk with a λ on its roof */
  private lambda(p: IsoPainter, x: number, y: number) {
    const color = mix(AWS.compute, '#ffffff', 0.15)
    p.shadow(x, y, 0.4, 0.4)
    p.box(x, y, { cols: 0.34, rows: 0.34, height: 9, color })
    const roof = p.pyramid(x, y, 0.44, 0.44, 8, shade(AWS.compute, -0.25), 9)
    // a hint of a sign: lit at night
    p.text('λ', roof.apex[0], roof.apex[1] - 6, 11, p.night > 0.5 ? '#ffd27a' : '#7a3a00', true)
  }

  /** S3: a bucket */
  private bucket(p: IsoPainter, x: number, y: number) {
    const color = mix(AWS.storage, '#ffffff', 0.1)
    p.shadow(x, y, 0.55, 0.55)
    p.cylinder(x, y, 0.22, 10, shade(color, -0.1))
    p.cylinder(x, y, 0.28, 10, color, 10)
    p.cylinder(x, y, 0.3, 2, shade(color, 0.3), 20)
    // the dark inside of the bucket
    p.disc(x, y, 0.26, shade(color, -0.55), 22)
  }

  /** SQS: a conveyor with three messages on it */
  private queue(p: IsoPainter, x: number, y: number) {
    const color = mix(AWS.integration, '#ffffff', 0.15)
    p.shadow(x, y, 0.7, 0.35)
    p.box(x, y, { cols: 0.7, rows: 0.26, height: 6, color: shade(color, -0.25) })
    const t = (this.properties.scene.time * 0.25 + noise(this.seed)) % 1
    for (let i = 0; i < 3; i++) {
      const offset = (((i / 3 + t) % 1) - 0.5) * 0.55
      p.box(x + offset * 32, y + offset * 16, {
        cols: 0.14,
        rows: 0.18,
        height: 5,
        elevation: 6,
        color,
      })
    }
  }

  /** EFS: a green storage hall */
  private fileSystem(p: IsoPainter, x: number, y: number) {
    const color = mix(AWS.storage, '#ffffff', 0.2)
    p.shadow(x, y, 0.7, 0.7)
    const box = { cols: 0.62, rows: 0.62, height: 16, color }
    p.box(x, y, box)
    p.windows(x, y, box, this.seed, '#e9ffd0', 6)
    p.box(x, y, { cols: 0.5, rows: 0.5, height: 3, elevation: 16, color: shade(color, -0.3) })
  }

  /** Client VPN endpoint: a tall lattice tower with a pulsing signal */
  private vpnEndpoint(p: IsoPainter, x: number, y: number) {
    const color = mix(AWS.networking, '#ffffff', 0.1)
    const { time } = this.properties.scene
    p.shadow(x, y, 0.6, 0.6)
    p.box(x, y, { cols: 0.5, rows: 0.5, height: 8, color: shade(color, -0.25) })
    const ctx = p.ctx
    const top = y - 64
    ctx.strokeStyle = p.c(color)
    ctx.lineWidth = 2
    ctx.beginPath()
    for (const dx of [-9, 9]) {
      ctx.moveTo(x + dx, y - 8)
      ctx.lineTo(x, top)
    }
    // the lattice
    for (let i = 1; i < 6; i++) {
      const t = i / 6
      const h = y - 8 - 56 * t
      const w = 9 * (1 - t)
      ctx.moveTo(x - w, h)
      ctx.lineTo(x + w, h - 9)
    }
    ctx.stroke()
    // signal rings
    for (let i = 0; i < 3; i++) {
      const phase = (time * 0.6 + i / 3) % 1
      ctx.strokeStyle = `rgba(190,160,255,${(1 - phase) * (0.35 + p.night * 0.5)})`
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.ellipse(x, top, 6 + phase * 30, (6 + phase * 30) / 2, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    p.light(x, top, 16, '#d7c2ff', 0.5 + p.night * 0.5)
    this.statusLight(p, x, y - 12)
  }

  /** CloudFront: a globe on a pedestal, with an orbiting edge ring */
  private distribution(p: IsoPainter, x: number, y: number) {
    const ctx = p.ctx
    const { time } = this.properties.scene
    const color = mix(AWS.networking, '#ffffff', 0.15)
    p.shadow(x, y, 0.7, 0.7)
    p.cylinder(x, y, 0.32, 10, shade(color, -0.2))
    const cx = x
    const cy = y - 34
    const r = 20
    const gradient = ctx.createRadialGradient(cx - 6, cy - 7, 2, cx, cy, r)
    gradient.addColorStop(0, p.c('#d7c8ff'))
    gradient.addColorStop(1, p.c(shade(AWS.networking, -0.25)))
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()
    // meridians and parallels
    ctx.strokeStyle = p.night > 0.5 ? 'rgba(220,200,255,0.7)' : 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 1
    for (let i = 0; i < 3; i++) {
      const w = Math.abs(Math.cos(time * 0.5 + (i * Math.PI) / 3)) * r
      ctx.beginPath()
      ctx.ellipse(cx, cy, w, r, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    for (const dy of [-10, 0, 10]) {
      ctx.beginPath()
      ctx.ellipse(cx, cy + dy, Math.sqrt(r * r - dy * dy), 3, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    // the edge ring with its points of presence
    ctx.strokeStyle = AWS.orange
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.ellipse(cx, cy, r + 9, 7, -0.2, 0, Math.PI * 2)
    ctx.stroke()
    for (let i = 0; i < 4; i++) {
      const a = time * 0.8 + (i * Math.PI) / 2
      const px = cx + Math.cos(a) * (r + 9)
      const py = cy + Math.sin(a) * 7 - Math.cos(a) * Math.sin(-0.2) * 7
      p.light(px, py, 6, '#ffb84d', 0.6 + p.night * 0.4)
    }
    this.statusLight(p, x, y - 6)
  }
}
