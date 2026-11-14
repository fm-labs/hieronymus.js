import type { GameComponentProperties, IGameComponent } from '@fmlabs/hieronymus'
import { AbstractGameComponent } from '@fmlabs/hieronymus'
import {
  add,
  GATES,
  HOLD_POINT,
  normalize,
  onRunway,
  rightOf,
  roundCorners,
  RUNWAY_ARRIVALS,
  RUNWAY_DEPARTURES,
  runwayDirection,
  runwayLength,
  RUNWAYS,
  scale,
  sub,
  TAXIWAY_A,
  TAXIWAY_WIDTH,
  TAXIWAYS,
  type Runway,
  type Vec,
} from './isoairport.airside.ts'
import { groundText, IsoPainter, toGridSpace, type Point } from './isoairport.draw.ts'
import type { AirportScene } from './isoairport.world.ts'

export interface IsoAirportPavementComponentProps extends GameComponentProperties {
  tileSize: number
  scene: AirportScene
  /** Apron floodlights, they light the concrete around them at night */
  floodlights: Vec[]
}

type Light = { at: Vec; color: string; size: number; glow?: number }

const ASPHALT = '#41454c'
const SHOULDER = '#8a8e83'
const CONCRETE = '#c6c2b8'
const WHITE = '#f2f2ee'
const YELLOW = '#f2c94c'

/**
 * Everything flat on the airside: runways with their markings, taxiways, stand markings,
 * and all the lights at night. One component draws it all, in a layer between the ground and the
 * buildings, because the runways cross the cells diagonally. Its position is grid point (0, 0).
 */
export class IsoAirportPavementComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoAirportPavementComponentProps

  public readonly componentType: string = 'IsoAirportPavement'

  private readonly taxiways = TAXIWAYS.map((t) => ({ ...t, points: roundCorners(t.points, 0.7) }))
  private readonly lights: Light[]
  /** The sequenced flashers of the approach lights, from far out to the threshold */
  private readonly rabbit: Vec[]

  constructor(properties: IsoAirportPavementComponentProps) {
    super(properties)
    this.lights = this.createLights()
    this.rabbit = [...Array(10)].map((_, i) => onRunway(RUNWAY_ARRIVALS, -6 + i * 0.6))
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { tileSize, scene } = this.properties
    const p = new IsoPainter(ctx, tileSize, scene.night, [this.x, this.y])

    ctx.save()
    toGridSpace(ctx, tileSize, [this.x, this.y])
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const { name, points } of this.taxiways) {
      if (name !== 'Apron') this.polyline(ctx, points, TAXIWAY_WIDTH + 0.22, p.c(SHOULDER))
    }
    for (const { name, points } of this.taxiways) {
      this.polyline(ctx, points, TAXIWAY_WIDTH, p.c(name === 'Apron' ? CONCRETE : ASPHALT))
    }
    for (const runway of RUNWAYS) this.drawRunway(ctx, p, runway)
    for (const { points } of this.taxiways) this.polyline(ctx, points, 0.04, p.c(YELLOW))
    this.drawStands(ctx, p)
    this.drawHoldShort(ctx, p)
    if (scene.night > 0) this.drawFloodlightPools(ctx, scene.night)
    ctx.restore()

    if (scene.night > 0) this.drawLights(p)
  }

  private polyline(ctx: CanvasRenderingContext2D, points: Vec[], width: number, color: string) {
    ctx.beginPath()
    points.forEach((v, i) => (i ? ctx.lineTo(v.col, v.row) : ctx.moveTo(v.col, v.row)))
    ctx.lineWidth = width
    ctx.strokeStyle = color
    ctx.stroke()
  }

  /** A runway in its own frame: u along it from the 'from' threshold, v across it */
  private drawRunway(ctx: CanvasRenderingContext2D, p: IsoPainter, runway: Runway) {
    const d = runwayDirection(runway)
    const L = runwayLength(runway)
    const w = runway.width
    ctx.save()
    ctx.translate(runway.from.col, runway.from.row)
    ctx.rotate(Math.atan2(d.row, d.col))
    ctx.fillStyle = p.c(SHOULDER)
    ctx.fillRect(-0.5, -w / 2 - 0.14, L + 1, w + 0.28)
    ctx.fillStyle = p.c(ASPHALT)
    ctx.fillRect(-0.4, -w / 2, L + 0.8, w)
    // tire marks in the touchdown zones
    ctx.fillStyle = 'rgba(20,20,24,0.35)'
    for (const [u0, u1] of [
      [1.8, 5.5],
      [L - 5.5, L - 1.8],
    ])
      for (const v of [-0.14, 0.1]) ctx.fillRect(u0, v, u1 - u0, 0.06)

    ctx.fillStyle = p.c(WHITE)
    // side stripes
    ctx.fillRect(0, -w / 2 + 0.04, L, 0.03)
    ctx.fillRect(0, w / 2 - 0.07, L, 0.03)
    for (const [start, sign] of [
      [0, 1],
      [L, -1],
    ]) {
      // threshold bars
      for (let i = 0; i < 8; i++) {
        const v = -w / 2 + 0.12 + i * ((w - 0.24) / 8) + (i >= 4 ? 0.04 : 0)
        ctx.fillRect(sign > 0 ? start + 0.12 : start - 0.67, v, 0.55, 0.06)
      }
      // touchdown zone and aiming point
      for (const u of [2.1, 2.7, 4.2]) {
        for (const v of [-0.3, 0.24]) ctx.fillRect(start + sign * u - 0.18, v, 0.36, 0.06)
      }
      for (const v of [-0.34, 0.24]) ctx.fillRect(start + sign * 3.4 - 0.4, v, 0.8, 0.1)
    }
    // the center line
    for (let u = 1.6; u < L - 1.6; u += 0.9) ctx.fillRect(u, -0.02, 0.45, 0.04)
    // the numbers, readable when lined up at each end
    groundText(ctx, runway.designators[0], 1.05, 0, Math.PI / 2, 0.55, p.c(WHITE))
    groundText(ctx, runway.designators[1], L - 1.05, 0, -Math.PI / 2, 0.55, p.c(WHITE))
    ctx.restore()
  }

  private drawStands(ctx: CanvasRenderingContext2D, p: IsoPainter) {
    ctx.lineWidth = 0.035
    ctx.strokeStyle = p.c(YELLOW)
    for (const gate of GATES) {
      const nose = add(gate.stand, scale(gate.heading, 0.62))
      const side = rightOf(gate.heading)
      ctx.beginPath()
      ctx.moveTo(gate.junction.col, gate.junction.row)
      ctx.lineTo(nose.col, nose.row)
      // the stop bar
      const a = add(nose, scale(side, -0.18))
      const b = add(nose, scale(side, 0.18))
      ctx.moveTo(a.col, a.row)
      ctx.lineTo(b.col, b.row)
      ctx.stroke()
      const label = add(add(gate.stand, scale(gate.heading, 0.25)), scale(side, 0.62))
      groundText(
        ctx,
        gate.name,
        label.col,
        label.row,
        gate.pier === 'A' ? 0 : Math.PI / 2,
        0.24,
        p.c('#5c4a12'),
      )
    }
  }

  /** Two solid and two dashed lines across taxiway A, where the departures wait */
  private drawHoldShort(ctx: CanvasRenderingContext2D, p: IsoPainter) {
    const flow = normalize(sub(TAXIWAY_A[2], HOLD_POINT))
    const across = rightOf(flow)
    const half = TAXIWAY_WIDTH / 2
    ctx.strokeStyle = p.c(YELLOW)
    ctx.lineWidth = 0.035
    ;[0.78, 0.85, 0.94, 1.01].forEach((k, i) => {
      const c = add(HOLD_POINT, scale(flow, k))
      const a = add(c, scale(across, -half))
      const b = add(c, scale(across, half))
      ctx.setLineDash(i < 2 ? [] : [0.08, 0.06])
      ctx.beginPath()
      ctx.moveTo(a.col, a.row)
      ctx.lineTo(b.col, b.row)
      ctx.stroke()
    })
    ctx.setLineDash([])
  }

  private drawFloodlightPools(ctx: CanvasRenderingContext2D, night: number) {
    for (const v of this.properties.floodlights) {
      const gradient = ctx.createRadialGradient(v.col, v.row, 0, v.col, v.row, 2.4)
      gradient.addColorStop(0, `rgba(255,244,214,${0.28 * night})`)
      gradient.addColorStop(1, 'rgba(255,244,214,0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(v.col, v.row, 2.4, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private createLights(): Light[] {
    const lights: Light[] = []
    for (const runway of RUNWAYS) {
      const L = runwayLength(runway)
      const w = runway.width / 2 + 0.06
      for (let u = 0; u <= L + 0.01; u += L / Math.round(L / 1.3)) {
        // the last part of the runway is yellow, a warning to the pilots
        const color = u > L - 3.5 ? '#ffd36b' : '#fff6dc'
        lights.push({ at: onRunway(runway, u, -w), color, size: 1.1 })
        lights.push({ at: onRunway(runway, u, w), color, size: 1.1 })
      }
      for (let i = 0; i < 7; i++) {
        const v = -0.45 + i * 0.15
        lights.push({ at: onRunway(runway, -0.05, v), color: '#4dff88', size: 1.3, glow: 0.4 })
        lights.push({ at: onRunway(runway, L + 0.05, v), color: '#ff4040', size: 1.3, glow: 0.4 })
      }
    }
    // approach lights in front of the landing thresholds: 22, and 13 at the other end of the V
    for (const [runway, start, step] of [
      [RUNWAY_ARRIVALS, 0, -1],
      [RUNWAY_DEPARTURES, runwayLength(RUNWAY_DEPARTURES), 1],
    ] as Array<[Runway, number, number]>) {
      for (let i = 1; i <= 10; i++)
        lights.push({
          at: onRunway(runway, start + step * i * 0.6, 0),
          color: '#fff6dc',
          size: 1.2,
        })
      for (let i = -2; i <= 2; i++)
        lights.push({
          at: onRunway(runway, start + step * 3, i * 0.22),
          color: '#fff6dc',
          size: 1.1,
        })
    }
    for (const { name, points } of this.taxiways) {
      const path = points
      let carry = 0
      for (let i = 1; i < path.length; i++) {
        const a = path[i - 1]
        const b = path[i]
        const segment = Math.hypot(b.col - a.col, b.row - a.row)
        const dir = normalize(sub(b, a))
        const side = rightOf(dir)
        for (let t = carry; t < segment; t += 0.8) {
          const at = add(a, scale(dir, t))
          lights.push({ at, color: '#5cff8a', size: 0.9 })
          if (name !== 'Apron') {
            lights.push({
              at: add(at, scale(side, TAXIWAY_WIDTH / 2 + 0.05)),
              color: '#5b8cff',
              size: 1,
            })
            lights.push({
              at: add(at, scale(side, -TAXIWAY_WIDTH / 2 - 0.05)),
              color: '#5b8cff',
              size: 1,
            })
          }
          carry = t + 0.8 - segment
        }
      }
    }
    return lights
  }

  private drawLights(p: IsoPainter) {
    const { ctx } = p
    const { tileSize, scene } = this.properties
    const screen = (v: Vec): Point => [
      this.x + (v.col - v.row) * (tileSize / 2),
      this.y + (v.col + v.row) * (tileSize / 4),
    ]
    ctx.globalAlpha = scene.night
    for (const light of this.lights) {
      const [x, y] = screen(light.at)
      if (light.glow) p.light(x, y, 7, light.color, light.glow * scene.night)
      ctx.fillStyle = light.color
      ctx.fillRect(x - light.size, y - light.size * 0.6, light.size * 2, light.size * 1.2)
    }
    // the 'rabbit' runs towards the threshold twice a second
    const k = Math.floor(scene.time * 20) % (this.rabbit.length * 2)
    if (k < this.rabbit.length) {
      const [x, y] = screen(this.rabbit[k])
      p.light(x, y, 18, 'rgba(255,255,255,1)', scene.night * 0.9)
    }
    ctx.globalAlpha = 1
  }
}
