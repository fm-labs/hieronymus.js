import { drawIsoTile } from '../draw2d/drawiso.ts'
import { AbstractBaseSystem } from './AbstractBaseSystem.ts'

export class GridSystem extends AbstractBaseSystem implements IGameSystem {
  public name = 'GridSystem'
  private dirty = true
  private tsize: number

  constructor(game: IGame) {
    super(game)

    this.tsize = this._game.config.tileSize
  }

  public onLoad() {
    console.log('GridSystem.onLoad')
  }

  public onUnload() {
    console.log('GridSystem.onUnload')
  }

  public start() {
    console.log('GridSystem.start')

    // Register game events
    this._game.eventbus.on('rerender', () => {
      this.dirty = true
    })
    // this._game.eventbus.on('keyboard.keyDown', (e: KeyboardEvent) => {
    //   console.log('[IsoGrid] key down', e.key, e.code, e.altKey, e.ctrlKey, e.shiftKey)
    // })
    // this._game.eventbus.on('hero.move', (hero) => {
    //   //console.log('Hero position changeed changed', hero)
    //   this.dirty = true
    // })
    // this.game.eventbus.on('editor.selectedSpriteImage', (selectedSpriteImage) => {
    //   console.log('The selected sprite image changed', selectedSpriteImage)
    // })
  }

  public stop() {
    console.log('GridSystem.stop')

    // Unregister game events
    //this.game.eventbus.off('editor.selectedSpriteImage')
  }

  // public update() {
  //   console.log('GridSystem.update')
  // }

  public draw(mainCtx: CanvasRenderingContext2D) {
    if (!this.dirty) return
    console.log('GridSystem.draw')

    const cols = this._game.config.columns
    const rows = this._game.config.rows

    const tsize = this.tsize
    const twidth = tsize
    const theight = tsize / 2

    const gridWidth = cols * twidth
    const gridHeight = rows * theight
    const gridColor = 'rgba(88,220,220,0.2)'

    const gridCanvas = document.createElement('canvas')
    gridCanvas.width = gridWidth
    gridCanvas.height = gridHeight

    const gridCtx = gridCanvas.getContext('2d')!
    //const gridCtx = mainCtx
    //gridCtx.save()
    //gridCtx.translate(this.game.width / 2, this.game.height / 2 - gridHeight / 2)

    // draw the grid
    gridCtx.reset()
    gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height)

    gridCtx.save()
    gridCtx.translate(
      gridCanvas.width / 2 - this._game.camera.offset.x,
      0 - this._game.camera.offset.y,
    )

    // draw a dot at the corner of each cell
    for (let i = 0; i < this._game.config.columns; i++) {
      for (let j = 0; j < this._game.config.rows; j++) {
        const { x, y } = this._game.projection.mapGridToScreen(i, j)

        const tileColor = gridColor
        const strokeColor = 'rgba(91,91,91,0.25)'
        // const index = getCellIndex(i, j, this._game.config.columns)
        // if (index == this._hoveredCellIdx) {
        //   tileColor = 'rgba(255,0,0,0.5)'
        // }
        // if (index == this._selectedCellIdx) {
        //   strokeColor = 'rgba(91,255,2,0.85)'
        // }
        drawIsoTile(gridCtx, x, y, twidth, theight, tileColor, strokeColor, `[${i},${j}]`)

        gridCtx.fillStyle = 'red'
        gridCtx.fillRect(x - 1, y - 1, 2, 2)
      }
    }

    gridCtx.translate(-gridWidth / 2, 0)
    //gridCtx.translate(0, 0)
    gridCtx.strokeStyle = 'orange'
    gridCtx.strokeRect(1, 1, gridCanvas.width - 1, gridCanvas.height - 1)

    gridCtx.fillStyle = 'white'
    gridCtx.fillText(`${gridCanvas.width}/${gridCanvas.height}`, 0, 10)

    gridCtx.restore()

    mainCtx.clearRect(
      this._game.width / 2 - gridWidth / 2,
      this._game.height / 2 - gridHeight / 2,
      gridWidth,
      gridHeight,
    )
    mainCtx.drawImage(
      gridCanvas,
      this._game.width / 2 - gridWidth / 2,
      this._game.height / 2 - gridHeight / 2,
    )

    this.dirty = false
  }
}
