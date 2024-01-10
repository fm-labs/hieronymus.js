export abstract class AbstractBaseEntity {
  public readonly properties: GameEntityProperties

  protected constructor(properties?: GameEntityProperties) {
    this.properties = properties || {}
  }

  public setPosition(x: number, y: number): this {
    this.properties.x = x
    this.properties.y = y
    return this
  }
  public getPosition(): { x: number; y: number } {
    return { x: this.properties.x, y: this.properties.y }
  }

  public abstract update(deltaTime: number): void
  public abstract draw(ctx: CanvasRenderingContext2D): void
}
