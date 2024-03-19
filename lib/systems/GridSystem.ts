import { drawIsoTile } from '../draw2d/drawiso.ts'
import { AbstractBaseSystem } from './AbstractBaseSystem.ts'
import { getCellIndex } from '../utils/gridutil.ts'
import { DimetricGridProjection } from '../map/DimetricGridProjection.ts'

export class GridSystem extends AbstractBaseSystem implements IGameSystem {
  public readonly name = 'GridSystem'
  private readonly tsize: number
  private readonly cols: number
  private readonly rows: number
  private readonly projection: IGrid2DProjection
  private infoDiv!: HTMLDivElement
  private gridCanvas!: HTMLCanvasElement

  private _dirty: boolean = true

  private _clientScreenPos: { x: number; y: number } = { x: 0, y: 0 }
  private _activeCellIdx?: number = undefined
  private _activeGridPos?: number[] = undefined
  private projectionOffset: { x: number; y: number }

  constructor(game: IGame) {
    super(game)

    this.tsize = this._game.worldMap.tileWidth
    this.cols = this._game.worldMap.columns
    this.rows = this._game.worldMap.rows
    this.projection = this._game.worldMap.projection
    this.projectionOffset = this.projection.getProjectionOffset()
  }

  public onLoad() {
    console.log('GridSystem.onLoad')

    const infoDiv = document.createElement('div')
    infoDiv.id = 'infoDiv'
    infoDiv.style.position = 'fixed'
    infoDiv.style.bottom = '0'
    infoDiv.style.left = '0'
    infoDiv.style.background = 'black'
    infoDiv.style.padding = '0.1rem'
    infoDiv.style.fontFamily = 'monospace'
    infoDiv.style.fontSize = '10px'
    this.infoDiv = infoDiv
    this._game.$container.appendChild(this.infoDiv)

    const gridCanvas = document.createElement('canvas')
    gridCanvas.width = this._game.$canvas.width
    gridCanvas.height = this._game.$canvas.height
    this.gridCanvas = gridCanvas
  }

  public onUnload() {
    console.log('GridSystem.onUnload')
  }

  public start() {
    console.log('GridSystem.start')

    // Register DOM events
    this.handleMouseMove = this.handleMouseMove.bind(this)
    this._game.$canvas.addEventListener('mousemove', this.handleMouseMove)

    //this.handleMouseClick = this.handleMouseClick.bind(this)
    //this._game.$canvas.addEventListener('click', this.handleMouseClick)

    // Register game events
    this._game.eventbus.on('keyboard.keyDown', this.handleKeyboardInput.bind(this))
  }

  private handleKeyboardInput(e: KeyboardEvent) {
    console.log('[GridSystem]', e.key, e.code, e.altKey, e.ctrlKey, e.shiftKey)
    const delta = 16
    if (e.code == 'KeyA') {
      this._game.camera.offset.x -= delta
      //console.log('X', this._game.camera.offset.x)
    } else if (e.code == 'KeyD') {
      this._game.camera.offset.x += delta
      //console.log('X', this._game.camera.offset.x)
    }
    if (e.code == 'KeyW') {
      this._game.camera.offset.y -= delta
      //console.log('Y', this._game.camera.offset.y)
    } else if (e.code == 'KeyS') {
      this._game.camera.offset.y += delta
      //console.log('Y', this._game.camera.offset.y)
    }
  }

  public stop() {
    console.log('GridSystem.stop')

    // Unregister game events
    this._game.$canvas.removeEventListener('mousemove', this.handleMouseMove)
    //this._game.$canvas.removeEventListener('click', this.handleMouseClick)
  }

  // public update() {
  //   console.log('GridSystem.update')
  // }

  private handleMouseMove(e: MouseEvent) {
    const mainCanvas = this._game.$canvas
    const rect = mainCanvas.getBoundingClientRect()

    const projectionOffsetX = this.projectionOffset.x
    const projectionOffsetY = this.projectionOffset.y
    const cameraOffsetX = this._game.camera.offset.x
    const cameraOffsetY = this._game.camera.offset.y

    //@todo calculate offsets using projection
    const offsetX = projectionOffsetX - cameraOffsetX // mainCanvas.width / 2
    const offsetY = projectionOffsetY - cameraOffsetY // mainCanvas.height / 2 - (this.cols / 2) * (this.tsize / 2)
    const x = e.clientX - rect.left - offsetX
    const y = e.clientY - rect.top - offsetY

    const pos = this.projection.mapScreenToGrid(x, y)
    const index = getCellIndex(pos.col, pos.row, this.cols)

    if (pos.col >= 0 && pos.col < this.cols && pos.row >= 0 && pos.row < this.rows) {
      if (index != this._activeCellIdx) {
        // this._game.eventbus.emit('grid.cellHover', {
        //   index: index,
        // })
        //console.log('cell changed', index, [pos.col, pos.row], this._activeCellIdx)
        this._activeCellIdx = index
        this._activeGridPos = [pos.col, pos.row]
        //this._dirty = true
      }
    } else if (this._activeCellIdx) {
      this._activeCellIdx = undefined
      this._activeGridPos = undefined
      //this._dirty = true
    }

    this._clientScreenPos = { x, y }

    //console.log('handleMouseMove', x, y, index)
    if (this.infoDiv) {
      this.infoDiv.textContent = `MOUSE: ${e.clientX.toFixed(2)},${e.clientY.toFixed(2)}
      CANVASPOS: ${x.toFixed(2)},${y.toFixed(2)}
      GRIDPOS: [${pos.col},${pos.row}]
      IDX: ${index}`
    }
  }

  // private handleMouseClick(e: MouseEvent) {
  //   const mainCanvas = this._game.$canvas
  //   const rect = mainCanvas.getBoundingClientRect()
  //   const offsetX = mainCanvas.width / 2
  //   const offsetY = mainCanvas.height / 2 - (this.cols / 2) * (this.tsize / 2)
  //   const x = e.clientX - rect.left - offsetX + this._game.camera.offset.x
  //   const y = e.clientY - rect.top - offsetY + this._game.camera.offset.y
  //   const pos = this.projection.mapScreenToGrid(x, y)
  //   const index = getCellIndex(pos.col, pos.row, this.cols)
  //   // if (pos.col >= 0 && pos.col < this.cols && pos.row >= 0 && pos.row < this.rows) {
  //   //   if (index != this._selectedCellIdx) {
  //   //     console.log('clicked cell', index, pos)
  //   //     this._game.eventbus.emit('grid.cellClick', { index: index, col: pos.col, row: pos.row })
  //   //
  //   //     this._selectedCellIdx = index
  //   //     this.dirty = true
  //   //   }
  //   // }
  // }

  public draw(mainCtx: CanvasRenderingContext2D) {
    //if (!this.dirty) return
    //console.log('GridSystem.draw')

    const cols = this._game.worldMap.columns
    const rows = this._game.worldMap.rows

    const gridColor = 'rgba(0,0,0,0.03)'

    const projectionOffsetX = this.projectionOffset.x
    const projectionOffsetY = this.projectionOffset.y

    const cameraOffsetX = this._game.camera.offset.x
    const cameraOffsetY = this._game.camera.offset.y

    //const gridCanvas = document.createElement('canvas')
    this.gridCanvas.width = mainCtx.canvas.width
    this.gridCanvas.height = mainCtx.canvas.height

    const gridCtx = this.gridCanvas.getContext('2d')!
    //const gridCtx = mainCtx
    //gridCtx.save()
    //gridCtx.translate(this.game.width / 2, this.game.height / 2 - gridHeight / 2)

    // draw the grid
    gridCtx.reset()
    gridCtx.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height)

    //gridCtx.save()
    const translateX = projectionOffsetX - cameraOffsetX
    const translateY = projectionOffsetY - cameraOffsetY
    gridCtx.translate(translateX, translateY)

    const gridDimensions = this.projection.getGridDimensions()
    //gridCtx.translate(-gridDimensions.width / 2, 0)
    gridCtx.fillStyle = 'white'
    gridCtx.fillText(`${gridDimensions.width}/${gridDimensions.height}`, 0, 10)

    gridCtx.strokeStyle = 'orange'
    gridCtx.lineWidth = 1
    gridCtx.setLineDash([5, 5])
    gridCtx.strokeRect(-gridDimensions.width / 2, 0, gridDimensions.width, gridDimensions.height)

    // draw a dot at the corner of each cell
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const { x, y } = this.projection.mapGridToScreen(i, j)

        if (x > this.gridCanvas.width || y > this.gridCanvas.height) continue

        let tileColor = gridColor
        let strokeColor = 'rgba(173,255,222,0.07)'
        let textColor = undefined
        // const index = getCellIndex(i, j, this.cols)
        // if (index == this._activeCellIdx) {
        //   tileColor = 'rgba(255,0,0,0.5)'
        // }
        if (this._activeGridPos?.[0] == i && this._activeGridPos?.[1] == j) {
          tileColor = 'rgba(74,176,162,0.5)'
          textColor = 'rgba(255,255,255,0.85)'
          //strokeColor = 'rgba(74,176,162,0.5)'
        } else if (this._activeGridPos?.[0] == i || this._activeGridPos?.[1] == j) {
          //tileColor = 'rgba(142,182,194,0.29)'
          strokeColor = 'rgba(142,182,194,0.29)'
        }

        // if (index == this._selectedCellIdx) {
        //   strokeColor = 'rgba(91,255,2,0.85)'
        // }

        if (this.projection instanceof DimetricGridProjection) {
          drawIsoTile(
            gridCtx,
            x,
            y,
            this.tsize,
            this.tsize / 2,
            tileColor,
            strokeColor,
            `[${i},${j}]`,
            textColor,
          )
        } else {
          gridCtx.fillStyle = tileColor
          gridCtx.fillRect(x, y, this.tsize, this.tsize)
          gridCtx.strokeStyle = 'blue'
          gridCtx.strokeRect(x, y, this.tsize, this.tsize)
          if (textColor) {
            gridCtx.fillStyle = textColor
          }
          gridCtx.fillText(`[${i},${j}]`, x + 2, y + 10)
        }

        gridCtx.fillStyle = 'rgba(91,255,2,0.48)'
        gridCtx.fillRect(x - 1, y - 1, 2, 2)
      }
    }

    //gridCtx.restore()

    // draw the grid in the center of the canvas
    // mainCtx.clearRect(
    //   this._game.width / 2 - gridWidth / 2,
    //   this._game.height / 2 - gridHeight / 2,
    //   gridWidth,
    //   gridHeight,
    // )

    // const mainOffsetX = this._game.width / 2 - gridWidth / 2
    // const mainOffsetY = this._game.height / 2 - gridHeight / 2
    // mainCtx.drawImage(gridCanvas, mainOffsetX, mainOffsetY)
    mainCtx.drawImage(this.gridCanvas, 0, 0)

    this._dirty = false
  }
}
