import { drawIsoTile } from '../../lib/kernel/drawiso.ts'
import { getIsometricCellCords, getIsometricScreenPosition } from '../../lib/kernel/util.ts'

export interface IsoGridTile extends Grid2DCell {
  col: number
  row: number
  x: number
  y: number
  color: string
}

export class IsoGridSystem implements IGameSystem {
  public name = 'IsoGridSystem'
  private game!: IGame

  public onLoad(game: IGame) {
    console.log('IsoGridSystem.onLoad')
    this.game = game

    //this.tiles = tiles
  }

  public onUnload() {
    console.log('IsoGridSystem.onUnload')
  }

  public start() {
    console.log('IsoGridSystem.start')
  }

  public stop() {
    console.log('IsoGridSystem.stop')
  }

  public update() {
    console.log('IsoGridSystem.update')
  }

  public draw(mainCtx: CanvasRenderingContext2D) {
    console.log('IsoGridSystem.draw')

    const cols = this.game.cols
    const rows = this.game.rows

    const tsize = 128 // this.game.twidth
    const twidth = tsize
    const theight = tsize / 2

    const gridWidth = cols * twidth
    const gridHeight = rows * theight

    const gridCanvas = document.createElement('canvas')
    const gridCtx = gridCanvas.getContext('2d')!
    gridCanvas.width = gridWidth
    gridCanvas.height = gridHeight

    // draw the grid
    //gridCtx.reset()
    gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height)

    gridCtx.save()
    gridCtx.translate(gridCanvas.width / 2, 0)
    for (const cell of this.game.cells) {
      // @todo move to 'update' method
      const screenPos = getIsometricScreenPosition(cell.col, cell.row, this.game.twidth)
      const tile = {
        ...cell,
        //x: cell.col * (this.game.twidth / 2) + cell.row * (this.game.twidth / 2),
        //y: cell.row * (this.game.theight / 2) - cell.col * (this.game.theight / 2),
        x: screenPos.x,
        y: screenPos.y,
      }
      drawIsoTile(
        gridCtx,
        tile.x,
        tile.y,
        this.game.twidth,
        this.game.theight,
        tile.color,
        `[${cell.col},${cell.row}]`,
      )
    }

    // draw a dot at the corner of each cell
    for (let i = 0; i < this.game.cols; i++) {
      for (let j = 0; j < this.game.rows; j++) {
        //const { x, y } = getIsometricCellCords(i, j, this.game.twidth)
        const { x, y } = getIsometricScreenPosition(i, j, this.game.twidth)
        gridCtx.fillStyle = 'red'
        gridCtx.fillRect(x - 1, y - 1, 2, 2)
      }
    }

    gridCtx.restore()
    gridCtx.translate(0, 0)
    gridCtx.strokeStyle = 'orange'
    gridCtx.strokeRect(1, 1, gridCanvas.width - 1, gridCanvas.height - 1)

    mainCtx.drawImage(
      gridCanvas,
      this.game.width / 2 - gridWidth / 2,
      this.game.height / 2 - gridHeight / 2,
    )
  }
}
