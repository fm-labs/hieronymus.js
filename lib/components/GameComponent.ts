import { AbstractGameComponent } from './AbstractGameComponent.ts'

export class GameComponent extends AbstractGameComponent implements IGameComponent {
  public static readonly defaultProperties: GameComponentProperties = {
    x: 0,
    y: 0,
  }
  constructor(properties?: GameComponentProperties) {
    properties = properties || {}
    super({ ...GameComponent.defaultProperties, ...properties })
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const x = this.properties.x
    const y = this.properties.y

    // @TODO: draw the object
  }

  update(deltaTime: number): void {}
}
