import { AbstractGameSystem } from './AbstractGameSystem.ts'

export class RoutletteSystem extends AbstractGameSystem implements IGameSystem {
  public name = 'RoutletteSystem'
  private readonly objCanvas: HTMLCanvasElement = document.createElement('canvas')

  constructor(game: IGame) {
    super(game)

    const objCanvas = document.createElement('canvas')
    this.objCanvas = objCanvas
    this.objCanvas.width = this._game.width
    this.objCanvas.height = this._game.height
  }

  public onLoad() {
    console.log('RoutletteSystem.onLoad')

    this._game.$container.appendChild(this.objCanvas)
  }

  public onUnload() {
    console.log('RoutletteSystem.onUnload')

    this._game.$container.removeChild(this.objCanvas)
  }

  public start() {
    console.log('RoutletteSystem.start')
    //this._game.eventbus.on('grid.cellClick', this.handleCellClick.bind(this))
  }

  public stop() {
    console.log('RoutletteSystem.stop')
  }

  public tick() {
    //console.log('RoutletteSystem.update')
    this.draw(this.objCanvas.getContext('2d')!)
  }

  private handleCellClick({ index, col, row }: any) {
    console.log('[Routlettes] clicked cell', index, col, row)
  }

  public draw(ctx: CanvasRenderingContext2D) {
    //if (!this.dirty) return
    //console.log('RoutletteSystem.draw')
    // const cols = this._game.worldMap.columns
    // const rows = this._game.worldMap.rows
    // const tsize = this._game.worldMap.tileWidth
    // const twidth = tsize
    // const theight = tsize / 2
    //
    // const gridWidth = cols * twidth
    // const gridHeight = rows * theight
    //
    //objCanvas.width = this._game.width
    //objCanvas.height = this._game.height
    //const objCtx = this.objCanvas.getContext('2d')!

    ctx.reset()
    ctx.clearRect(0, 0, this.objCanvas.width, this.objCanvas.height)

    // render a green background
    ctx.fillStyle = 'rgba(25,103,25,0.5)'
    ctx.fillRect(0, 0, this.objCanvas.width, this.objCanvas.height)

    // // render a circle
    // objCtx.beginPath()
    // objCtx.fillStyle = 'red'
    // objCtx.arc(this.objCanvas.width / 2, this.objCanvas.height / 2, 100, 0, 2 * Math.PI)
    // objCtx.fill()
    // objCtx.stroke()
    // objCtx.closePath()

    // Table settings
    const zoom = 1
    const cellWidth = 100 * zoom
    const cellHeight = 100 * zoom
    const zeroWidth = cellWidth
    const rows = 3
    const columns = 12

    // Colors
    const blackColor = '#333'
    const redColor = '#d22'
    const greenColor = '#0a0'
    const whiteColor = '#fff'

    // Draw Zero Cell
    ctx.fillStyle = greenColor
    ctx.fillRect(0, 0, zeroWidth, cellHeight * rows)
    ctx.strokeRect(0, 0, zeroWidth, cellHeight * rows)
    ctx.fillStyle = whiteColor
    ctx.font = '20px Arial'
    ctx.fillText('0', zeroWidth / 2 - 5, (cellHeight * rows) / 2 + 7)

    // Draw Numbered Cells
    for (let col = 0; col < columns; col++) {
      for (let row = 0; row < rows; row++) {
        const x = zeroWidth + col * cellWidth
        const y = row * cellHeight
        const number = col * rows + row + 1

        // Alternate colors for numbers
        if ([2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35].includes(number)) {
          ctx.fillStyle = blackColor
        } else {
          ctx.fillStyle = redColor
        }

        ctx.fillRect(x, y, cellWidth, cellHeight)
        ctx.strokeRect(x, y, cellWidth, cellHeight)

        // Draw number in cell
        ctx.fillStyle = whiteColor
        ctx.fillText(number.toString(), x + cellWidth / 2 - 10, y + cellHeight / 2 + 7)
      }
    }

    // // Draw Outside Bet Areas (Red/Black, Odd/Even, Low/High)
    // const outsideBetY = cellHeight * rows + 10
    // const outsideBetHeight = 40
    //
    // // Red/Black
    // ctx.fillStyle = redColor
    // ctx.fillRect(zeroWidth, outsideBetY, cellWidth * 6, outsideBetHeight)
    // ctx.strokeRect(zeroWidth, outsideBetY, cellWidth * 6, outsideBetHeight)
    // ctx.fillStyle = whiteColor
    // ctx.fillText('RED', zeroWidth + cellWidth * 3 - 20, outsideBetY + 25)
    //
    // ctx.fillStyle = blackColor
    // ctx.fillRect(zeroWidth + cellWidth * 6, outsideBetY, cellWidth * 6, outsideBetHeight)
    // ctx.strokeRect(zeroWidth + cellWidth * 6, outsideBetY, cellWidth * 6, outsideBetHeight)
    // ctx.fillStyle = whiteColor
    // ctx.fillText('BLACK', zeroWidth + cellWidth * 9 - 25, outsideBetY + 25)
    //
    // // Odd/Even
    // const oddEvenY = outsideBetY + outsideBetHeight + 10
    // ctx.fillStyle = '#444'
    // ctx.fillRect(zeroWidth, oddEvenY, cellWidth * 6, outsideBetHeight)
    // ctx.strokeRect(zeroWidth, oddEvenY, cellWidth * 6, outsideBetHeight)
    // ctx.fillStyle = whiteColor
    // ctx.fillText('ODD', zeroWidth + cellWidth * 3 - 20, oddEvenY + 25)
    //
    // ctx.fillStyle = '#777'
    // ctx.fillRect(zeroWidth + cellWidth * 6, oddEvenY, cellWidth * 6, outsideBetHeight)
    // ctx.strokeRect(zeroWidth + cellWidth * 6, oddEvenY, cellWidth * 6, outsideBetHeight)
    // ctx.fillStyle = whiteColor
    // ctx.fillText('EVEN', zeroWidth + cellWidth * 9 - 25, oddEvenY + 25)
    //
    // // Low/High
    // const lowHighY = oddEvenY + outsideBetHeight + 10
    // ctx.fillStyle = '#444'
    // ctx.fillRect(zeroWidth, lowHighY, cellWidth * 6, outsideBetHeight)
    // ctx.strokeRect(zeroWidth, lowHighY, cellWidth * 6, outsideBetHeight)
    // ctx.fillStyle = whiteColor
    // ctx.fillText('1 - 18', zeroWidth + cellWidth * 3 - 25, lowHighY + 25)
    //
    // ctx.fillStyle = '#777'
    // ctx.fillRect(zeroWidth + cellWidth * 6, lowHighY, cellWidth * 6, outsideBetHeight)
    // ctx.strokeRect(zeroWidth + cellWidth * 6, lowHighY, cellWidth * 6, outsideBetHeight)
    // ctx.fillStyle = whiteColor
    // ctx.fillText('19 - 36', zeroWidth + cellWidth * 9 - 30, lowHighY + 25)

    // // Columns
    // for (let col = 1; col <= columns; col++) {
    //   const colX = zeroWidth + (col - 1) * cellWidth
    //   const colY = lowHighY + outsideBetHeight + 10
    //   ctx.fillStyle = '#555'
    //   ctx.fillRect(colX, colY, cellWidth, outsideBetHeight)
    //   ctx.strokeRect(colX, colY, cellWidth, outsideBetHeight)
    //   ctx.fillStyle = whiteColor
    //   ctx.fillText(`2 to 1`, colX + 5, colY + 25)
    // }

    ctx.save()
    ctx.translate(this.objCanvas.width / 2, 0)

    //mainCtx.drawImage(this.objCanvas, 0, 0)
    //this.dirty = false
  }
}
