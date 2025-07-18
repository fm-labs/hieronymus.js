export abstract class AbstractGameComponent {
  declare static defaultProperties: GameComponentProperties

  public abstract readonly componentType: string
  public readonly properties: GameComponentProperties

  x: number = 0
  y: number = 0

  protected constructor(properties?: GameComponentProperties, x: number = 0, y: number = 0) {
    this.properties = properties || {}
    this.x = x
    this.y = y
  }

  public setPosition(x: number, y: number): this {
    this.x = x
    this.y = y
    return this
  }

  public getPosition(): { x: number; y: number } {
    const x = this.x
    const y = this.y
    if (x === undefined || y === undefined) return { x: 0, y: 0 }

    return { x, y }
  }

  public abstract update(deltaTime: number): void | boolean | null
  public abstract draw(ctx: CanvasRenderingContext2D): void
}
