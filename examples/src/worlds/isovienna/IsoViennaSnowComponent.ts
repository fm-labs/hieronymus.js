import type { GameComponentProperties, IGameComponent } from '@fmlabs/hieronimo'
import { AbstractGameComponent } from '@fmlabs/hieronimo'
import { noise } from './isovienna.draw.ts'
import type { ViennaScene } from './isovienna.map.ts'

export interface IsoViennaSnowComponentProps extends GameComponentProperties {
  /** The area to cover, in world pixels */
  left: number
  top: number
  width: number
  height: number
  flakes: number
  scene: ViennaScene
}

/** Snowflakes falling over the whole city, in winter only. Drawn on top of everything. */
export class IsoViennaSnowComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoViennaSnowComponentProps

  public readonly componentType: string = 'IsoViennaSnow'

  constructor(properties: IsoViennaSnowComponentProps) {
    super(properties)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const { left, top, width, height, flakes, scene } = this.properties
    if (!scene.winter) return
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    for (let i = 0; i < flakes; i++) {
      const speed = 18 + noise(i, 2) * 22
      const size = 0.8 + noise(i, 3) * 1.4
      const fall = (noise(i, 1) * height + scene.time * speed) % height
      const x = left + noise(i) * width + Math.sin(scene.time * 0.8 + i) * 6
      ctx.globalAlpha = 0.5 + noise(i, 4) * 0.5
      ctx.fillRect(x, top + fall, size, size)
    }
    ctx.globalAlpha = 1
  }
}
