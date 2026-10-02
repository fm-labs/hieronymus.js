import type { GameComponentProperties, IGameComponent } from '../game.types'
import { AbstractGameComponent } from './AbstractGameComponent'

export class GenericComponent extends AbstractGameComponent implements IGameComponent {
  public readonly componentType: string = 'Generic'
  public static readonly defaultProperties: GameComponentProperties = {}
  constructor(properties?: GameComponentProperties) {
    properties = properties || {}
    super({ ...GenericComponent.defaultProperties, ...properties })
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const x = this.x
    const y = this.y

    // @TODO: draw the object
  }

  update(deltaTime: number): void {}
}
