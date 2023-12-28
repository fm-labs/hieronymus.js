import { drawIsoTile } from '../draw2d/drawiso.ts'
import { getCellIndex } from '../utils/gridutil.ts'
import { DimetricGridProjection } from '../map/projection.ts'

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
  private dirty = true

  private projection: IGrid2DProjection
  private tsize: number
  private infoDiv: HTMLDivElement

  private _lastCellIdx: number | undefined
  private _lastSelectedCellIdx: number | undefined

  private _selectedSpriteImage: any | undefined

  constructor(tileSize: number) {
    this.tsize = tileSize
    this.projection = new DimetricGridProjection(tileSize)

    const infoDiv = document.createElement('div')
    infoDiv.id = 'infoDiv'
    infoDiv.style.position = 'fixed'
    infoDiv.style.bottom = '10px'
    infoDiv.style.right = '10px'
    infoDiv.style.background = 'black'
    infoDiv.style.padding = '0.1rem'
    infoDiv.style.fontFamily = 'monospace'
    infoDiv.style.fontSize = '10px'
    this.infoDiv = infoDiv
  }

  public onLoad(game: IGame) {
    console.log('IsoGridSystem.onLoad')
    this.game = game
    this.game.$container.appendChild(this.infoDiv)
  }

  public onUnload() {
    console.log('IsoGridSystem.onUnload')
  }

  public start() {
    console.log('IsoGridSystem.start')

    // Register DOM events
    this.game.$canvas.addEventListener('mousemove', this.handleMouseMove.bind(this))
    this.game.$canvas.addEventListener('click', this.handleMouseClick.bind(this))

    // Register game events
    this.game.eventbus.on('keyboard.keyDown', (e: KeyboardEvent) => {
      console.log('[IsoGrid] key down', e.key, e.code, e.altKey, e.ctrlKey, e.shiftKey)
    })
    this.game.eventbus.on('hero.move', (hero) => {
      //console.log('Hero position changeed changed', hero)
      this.dirty = true
    })
    // this.game.eventbus.on('editor.selectedSpriteImage', (selectedSpriteImage) => {
    //   console.log('The selected sprite image changed', selectedSpriteImage)
    // })
  }

  public stop() {
    console.log('IsoGridSystem.stop')

    // Unregister DOM events
    this.game.$canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this))
    this.game.$canvas.removeEventListener('click', this.handleMouseClick.bind(this))

    // Unregister game events
    //this.game.eventbus.off('editor.selectedSpriteImage')
  }

  // public update() {
  //   console.log('IsoGridSystem.update')
  // }

  private handleMouseMove(e: MouseEvent) {
    const mainCanvas = this.game.$canvas
    const rect = mainCanvas.getBoundingClientRect()

    //@todo calculate offsets using projection
    const offsetX = mainCanvas.width / 2
    const offsetY = mainCanvas.height / 2 - (this.game.cols / 2) * (this.tsize / 2)
    const x = e.clientX - rect.left - offsetX + this.game.camera.offset.x
    const y = e.clientY - rect.top - offsetY + this.game.camera.offset.y
    const pos = this.projection.mapScreenToGrid(x, y)
    const index = getCellIndex(pos.col, pos.row, this.game.cols)

    if (index != this._lastCellIdx) {
      //console.log('cell changed', index, this._lastCellIdx)
      this._lastCellIdx = index
    }

    //console.log('handleMouseMove', x, y, index)
    if (this.infoDiv) {
      this.infoDiv.textContent = `MOUSE: ${e.clientX.toFixed(2)},${e.clientY.toFixed(2)}
      CANVASPOS: ${x.toFixed(2)},${y.toFixed(2)}
      GRIDPOS: [${pos.col},${pos.row}]
      IDX: ${index},
      SPRITE: ${this._selectedSpriteImage ? JSON.stringify(this._selectedSpriteImage) : 'None'}`
    }
  }

  private handleMouseClick(e: MouseEvent) {
    const mainCanvas = this.game.$canvas
    const rect = mainCanvas.getBoundingClientRect()
    const offsetX = mainCanvas.width / 2
    const offsetY = mainCanvas.height / 2 - (this.game.cols / 2) * (this.tsize / 2)
    const x = e.clientX - rect.left - offsetX + this.game.camera.offset.x
    const y = e.clientY - rect.top - offsetY + this.game.camera.offset.y
    const pos = this.projection.mapScreenToGrid(x, y)
    const index = getCellIndex(pos.col, pos.row, this.game.cols)

    this.game.eventbus.emit('grid.cellClick', { index: index, col: pos.col, row: pos.row })

    console.log('clicked cell', pos, index)
    if (index >= 0) {
      // random colors
      const colors = [
        '#ff0000',
        '#00ff00',
        '#0000ff',
        '#ffff00',
        '#00ffff',
        '#ff00ff',
        '#ffffff',
        '#000000',
      ]
      const randomColorIndex = Math.floor(Math.random() * colors.length)
      this.game.cells[index].color = colors[randomColorIndex] // Change the color of the clicked tile
    }
    this.dirty = true
  }

  public draw(mainCtx: CanvasRenderingContext2D) {
    if (!this.dirty) return
    console.log('IsoGridSystem.draw')

    const cols = this.game.cols
    const rows = this.game.rows

    const tsize = this.tsize
    const twidth = tsize
    const theight = tsize / 2

    const gridWidth = cols * twidth
    const gridHeight = rows * theight

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
      gridCanvas.width / 2 - this.game.camera.offset.x,
      0 - this.game.camera.offset.y,
    )

    for (const cell of this.game.cells) {
      // @todo move to 'update' method
      const screenPos = this.projection.mapGridToScreen(cell.col, cell.row)
      const tile = {
        ...cell,
        x: screenPos.x,
        y: screenPos.y,
      }
      drawIsoTile(gridCtx, tile.x, tile.y, twidth, theight, tile.color, `[${cell.col},${cell.row}]`)
    }

    // draw a dot at the corner of each cell
    for (let i = 0; i < this.game.cols; i++) {
      for (let j = 0; j < this.game.rows; j++) {
        const { x, y } = this.projection.mapGridToScreen(i, j)
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
      this.game.width / 2 - gridWidth / 2,
      this.game.height / 2 - gridHeight / 2,
      gridWidth,
      gridHeight,
    )
    mainCtx.drawImage(
      gridCanvas,
      this.game.width / 2 - gridWidth / 2,
      this.game.height / 2 - gridHeight / 2,
    )

    this.dirty = false
  }
}
