import { drawIsoTile } from '../draw2d/drawiso.ts'
import { getIsometricScreenPosition, getOrthogonalScreenPosition } from '../utils/gridutil.ts'

export interface OrthogonalGridTile extends Grid2DCell {
  col: number
  row: number
  x: number
  y: number
  color: string
}

export class OrthogonalGridSystem implements IGameSystem {
  public name = 'OrthogonalGridSystem'
  private game!: IGame

  public onLoad(game: IGame) {
    console.log('OrthogonalGridSystem.onLoad')
    this.game = game

    //this.tiles = tiles
  }

  public onUnload() {
    console.log('OrthogonalGridSystem.onUnload')
  }

  public start() {
    console.log('OrthogonalGridSystem.start')
  }

  public stop() {
    console.log('OrthogonalGridSystem.stop')
  }

  public update() {
    console.log('OrthogonalGridSystem.update')
  }

  public draw(mainCtx: CanvasRenderingContext2D) {
    console.log('OrthogonalGridSystem.draw')

    const cols = this.game.cols
    const rows = this.game.rows

    const tsize = 128 // this.game.twidth
    const twidth = tsize
    const twidth_half = twidth / 2
    const theight = tsize / 2
    const theight_half = theight / 2

    const otsize = tsize / 2

    const gridWidth = cols * tsize
    const gridHeight = rows * tsize

    const gridCanvas = document.createElement('canvas')
    const gridCtx = gridCanvas.getContext('2d')!
    gridCanvas.width = gridWidth
    gridCanvas.height = gridHeight

    const gridCanvas2 = document.createElement('canvas')
    const gridCtx2 = gridCanvas2.getContext('2d')!
    gridCanvas2.width = gridWidth
    gridCanvas2.height = gridHeight

    // draw the grid
    gridCtx.reset()
    // gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height)
    // gridCtx.translate(
    //   gridCanvas.width / 2 - (this.game.rows / 2) * this.game.twidth,
    //   gridCanvas.height / 2 - (this.game.cols / 2) * this.game.twidth,
    // )

    gridCtx2.translate(gridCanvas.width / 2, 0)
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const screenPos = getOrthogonalScreenPosition(c, r, otsize)
        this.drawTile(gridCtx, screenPos.x, screenPos.y, otsize, otsize, 'rgb(88,220,220)')

        const isoScreenPos = getIsometricScreenPosition(c, r, tsize)
        drawIsoTile(
          gridCtx2,
          isoScreenPos.x,
          isoScreenPos.y,
          twidth,
          theight,
          'rgb(119,222,222)',
          `[${c},${r}]`,
        )
        // this.drawIsometricRectangle(
        //   gridCtx,
        //   tile.x,
        //   tile.y,
        //   this.game.twidth,
        //   this.game.twidth,
        //   'lightblue',
        // )
        // this.drawDimetricRectangle(
        //   gridCtx,
        //   tile.x,
        //   tile.y,
        //   this.game.twidth,
        //   this.game.twidth,
        //   'orange',
        // )
      }
    }

    for (const cell of this.game.cells) {
      // @todo move to 'update' method
      const pos = getOrthogonalScreenPosition(cell.col, cell.row, this.game.twidth)
    }
    gridCtx.transform(1, 0, 0, 1, 0, 0)
    mainCtx.drawImage(gridCanvas, 0, 0)
    mainCtx.drawImage(gridCanvas2, gridWidth, 0)
  }

  private drawTile(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
  ) {
    // ctx.fillStyle = color
    //ctx.fillRect(x, y, width, height)
    ctx.strokeStyle = 'lime'
    ctx.strokeRect(x, y, width, height)
  }

  private drawIsometricRectangle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
  ) {
    ctx.save() // Save the current state of the context

    // Apply transformations for isometric projection
    ctx.translate(x, y) // Translate to the position
    ctx.rotate(Math.PI / 6) // Rotate 30 degrees (pi/6 radians) clockwise
    //ctx.scale(1, 0.5) // Scale vertically to correct for aspect ratio

    // Draw the rectangle
    ctx.fillStyle = color
    ctx.fillRect(0, 0, width, height)

    ctx.restore() // Restore the original context state
  }

  private drawDimetricRectangle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
  ) {
    ctx.reset() // Save the current state of the context

    // Apply transformations for dimetric projection
    ctx.translate(x, y) // Translate to the position
    ctx.rotate(Math.PI / 4) // Rotate 45 degrees (pi/4 radians) clockwise
    ctx.scale(1, 0.5) // Scale vertically to correct for aspect ratio

    // Draw the rectangle
    ctx.fillStyle = color
    ctx.fillRect(0, 0, width, height)

    //ctx.restore() // Restore the original context state
  }
}
