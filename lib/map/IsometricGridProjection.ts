export class IsometricGridProjection implements IGrid2DProjection {
  private readonly tileWidth: number
  private readonly tileHeight: number

  private readonly cols: number
  private readonly rows: number
  private readonly gridWidth: number
  private readonly gridHeight: number

  constructor(tileSize: number, cols: number, rows: number) {
    this.tileWidth = tileSize
    this.tileHeight = tileSize / 2

    this.cols = cols
    this.rows = rows
    this.gridWidth = this.cols * this.tileWidth
    this.gridHeight = this.rows * this.tileHeight
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

  getGridDimensions(): { width: number; height: number } {
    return { width: this.gridWidth, height: this.gridHeight }
  }
}
