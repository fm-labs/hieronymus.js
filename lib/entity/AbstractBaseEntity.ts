export abstract class AbstractBaseEntity {
  public readonly game: IGame
  public readonly properties: GameProperties<any>

  protected constructor(game: IGame, properties?: GameProperties<any>) {
    this.game = game
    this.properties = properties || {}

    if (this.properties.col !== undefined && this.properties.row !== undefined) {
      this.setGridPosition(this.properties.col, this.properties.row)
      delete this.properties.col
      delete this.properties.row
    }
  }

  public setGridPosition(c: number, r: number): this {
    const tpos = this.game.projection.mapGridToScreen(c, r)
    this.setPosition(tpos.x, tpos.y)
    return this
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
