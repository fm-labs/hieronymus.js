export class OrthogonalGridProjection implements IGrid2DProjection {
  private readonly tileSize: number
  private readonly cols: number
  private readonly rows: number

  constructor(tileSize: number, cols: number, rows: number) {
    this.tileSize = tileSize
    this.cols = cols
    this.rows = rows
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

  getGridDimensions(): { width: number; height: number } {
    const width = this.cols * this.tileSize
    const height = this.rows * this.tileSize
    return { width: width, height: height }
  }

  getProjectionOffset(): { x: number; y: number } {
    return { x: 0, y: 0 }
  }
}
