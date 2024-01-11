export abstract class AbstractBaseComponent {
  public readonly properties: GameComponentProperties

  protected constructor(properties?: GameComponentProperties) {
    this.properties = properties || {}
  }

  public setPosition(x: number, y: number): this {
    this.properties.x = x
    this.properties.y = y
    return this
  }

  public getPosition(): { x: number; y: number } {
    const x = this.properties.x
    const y = this.properties.y
    if (x === undefined || y === undefined) return { x: 0, y: 0 }

    return { x, y }
  }

  public abstract update(deltaTime: number): void
  public abstract draw(ctx: CanvasRenderingContext2D): void
}
