export class OrthogonalGridProjection implements IGrid2DProjection {
  private readonly tileSize: number

  constructor(tileSize: number) {
    this.tileSize = tileSize
  }

  public mapGridToScreen(col: number, row: number) {
    const tileWidth = this.tileSize
    const tileHeight = this.tileSize
    const x = col * tileWidth
    const y = row * tileHeight
    return { x, y }
  }

  public mapScreenToGrid(x: number, y: number) {
    const tileWidth = this.tileSize
    const tileHeight = this.tileSize
    const col = Math.floor(x / tileWidth)
    const row = Math.floor(y / tileHeight)
    return { col, row }
  }
}

export class DimetricGridProjection implements IGrid2DProjection {
  private readonly tileWidth: number
  private readonly tileHeight: number

  constructor(tileSize: number) {
    this.tileWidth = tileSize
    this.tileHeight = tileSize / 2
  }

  public mapGridToScreen(col: number, row: number) {
    //const x = col * (tileWidth / 2) - row * (tileWidth / 2)
    //const y = col * (tileHeight / 2) + row * (tileHeight / 2)
    //simplified:
    const x = (col - row) * (this.tileWidth / 2)
    const y = (col + row) * (this.tileHeight / 2)
    return { x, y }
  }

  public mapScreenToGrid(x: number, y: number) {
    const tileHeight = this.tileWidth / 2
    const tileWidthHalf = this.tileWidth / 2
    const tileHeightHalf = tileHeight / 2
    const col = Math.floor((x / tileWidthHalf + y / tileHeightHalf) / 2)
    const row = Math.floor((y / tileHeightHalf - x / tileWidthHalf) / 2)
    return { col, row }
  }
}
