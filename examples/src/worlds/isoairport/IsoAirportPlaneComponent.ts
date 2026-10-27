import type { GameComponentProperties, IGameComponent } from '@fmlabs/world'
import { AbstractGameComponent } from '@fmlabs/world'
import type { Vec } from './isoairport.airside.ts'
import { drawPlane, IsoPainter, type PlaneKind } from './isoairport.draw.ts'
import type { Phase } from './isoairport.flights.ts'
import type { AirportScene } from './isoairport.world.ts'

export interface IsoAirportPlaneComponentProps extends GameComponentProperties {
  tileSize: number
  kind: PlaneKind
  color: string
  tail: string
  /** Where the nose points, in grid space */
  heading: Vec
  /** Pixels above the ground */
  altitude: number
  phase: Phase
  seed: number
  selected: boolean
  scene: AirportScene
}

/**
 * A plane of a flight. The system copies the position, heading and altitude every frame.
 * The position is the top corner of a cell centered on the plane (on the ground below it).
 */
export class IsoAirportPlaneComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoAirportPlaneComponentProps

  public readonly componentType: string = 'IsoAirportPlane'

  constructor(properties: IsoAirportPlaneComponentProps) {
    super(properties)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { tileSize, kind, color, tail, heading, altitude, phase, seed, selected, scene } =
      this.properties
    const p = new IsoPainter(ctx, tileSize, scene.night)
    const x = this.x
    const y = this.y + tileSize / 4
    if (selected) {
      // a pulsing ring on the ground below the plane
      const pulse = 0.6 + 0.4 * Math.sin(scene.time * 5)
      ctx.strokeStyle = `rgba(255,215,64,${pulse})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.ellipse(x, y, 34, 17, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    drawPlane(p, x, y, heading, {
      kind,
      color,
      tail,
      altitude,
      time: scene.time,
      seed,
      lights: phase !== 'atGate',
      landingLights:
        phase === 'approach' || phase === 'landing' || phase === 'takeoff' || phase === 'lineup',
      tug: phase === 'pushback',
      service: phase === 'atGate',
    })
  }
}
