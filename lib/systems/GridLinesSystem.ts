import { drawIsoTile } from '../draw2d/drawiso.ts'
import { AbstractGameSystem } from './AbstractGameSystem.ts'
import { getCellIndex } from '../utils/gridutil.ts'
import { IsometricGridProjection } from '../map/IsometricGridProjection.ts'

export class GridLinesSystem extends AbstractGameSystem implements IGameSystem {
  public readonly name = 'GridLinesSystem'
  private readonly tsize: number
  private readonly cols: number
  private readonly rows: number
  private readonly projection: IGrid2DProjection
  private infoDiv!: HTMLDivElement
  private gridCanvas!: HTMLCanvasElement
  private gridCtx!: CanvasRenderingContext2D

  //private _dirty: boolean = true

  //private _clientScreenPos: { x: number; y: number } = { x: 0, y: 0 }
  private _activeCellIdx?: number = undefined
  private _activeGridPos?: Grid2DPosition = undefined
  private _cellsRendered: number = 0

  private _selectedCellIdx?: number = undefined
  private _selectedCell?: Grid2DPosition = undefined
  private _gridColor = 'rgba(230,151,82,0.4)'

  constructor(game: IGame, tileMap: ITileMap) {
    super(game)

    this.tsize = tileMap.tileWidth
    this.cols = tileMap.columns
    this.rows = tileMap.rows
    this.projection = tileMap.projection

    //@todo center the grid on the screen
    // if (this.projection instanceof DimetricGridProjection) {
    //   this._game.camera.offset.x = -this._game.$container.offsetWidth / 2
    // }

    const infoDiv = document.createElement('div')
    infoDiv.id = 'infoDiv'
    infoDiv.style.position = 'fixed'
    infoDiv.style.bottom = '0'
    infoDiv.style.left = '200px'
    infoDiv.style.background = 'rgb(255,255,255)'
    infoDiv.style.padding = '0.1rem'
    infoDiv.style.fontFamily = 'monospace'
    infoDiv.style.fontSize = '10px'
    infoDiv.style.color = 'rgb(0,0,0)'
    infoDiv.style.zIndex = '10000'
    this.infoDiv = infoDiv
  }

  public onLoad() {
    console.log('GridLinesSystem.onLoad')

    this._game.$container.appendChild(this.infoDiv)

    const gridCanvas = document.createElement('canvas')
    gridCanvas.id = 'gridCanvas'
    gridCanvas.width = this._game.width
    gridCanvas.height = this._game.height
    this.gridCanvas = gridCanvas
    this.gridCtx = gridCanvas.getContext('2d')!
    this._game.$container.appendChild(this.gridCanvas)

    this._game.eventbus.on('resize', (event: any) => {
      console.log('resize grid', event)
      this.gridCanvas.width = event.width
      this.gridCanvas.height = event.height
    })
  }

  public onUnload() {
    console.log('GridLinesSystem.onUnload')
  }

  public start() {
    console.log('GridLinesSystem.start')

    // Register DOM events
    this.handleMouseMove = this.handleMouseMove.bind(this)
    this._game.$container.addEventListener('mousemove', this.handleMouseMove.bind(this))
    this._game.$container.addEventListener('mousedown', this.handleMouseClick.bind(this))
  }

  public stop() {
    console.log('GridLinesSystem.stop')

    // Unregister game events
    this._game.$container.removeEventListener('mousemove', this.handleMouseMove)
    this._game.$container.removeEventListener('mousedown', this.handleMouseClick)
  }

  private handleMouseMove(e: MouseEvent) {
    const mainContainer = this._game.$container
    const rect = mainContainer.getBoundingClientRect()

    const x = e.clientX - rect.left + this._game.camera.offset.x
    const y = e.clientY - rect.top + this._game.camera.offset.y

    const pos = this.projection.mapScreenToGrid(
      x / this._game.camera.zoom,
      y / this._game.camera.zoom,
    )
    //console.log('move', { cameraOffsetX, cameraOffsetY }, { x, y }, pos)
    const index = getCellIndex(pos.col, pos.row, this.cols)

    if (pos.col >= 0 && pos.col < this.cols && pos.row >= 0 && pos.row < this.rows) {
      if (index != this._activeCellIdx) {
        this._game.eventbus.emit('grid.cellHover', {
          index: index,
          col: pos.col,
          row: pos.row,
        })
        //console.log('cell changed', index, [pos.col, pos.row], this._activeCellIdx)
        this._activeCellIdx = index
        this._activeGridPos = pos
        //this._dirty = true
      }
    } else if (this._activeCellIdx) {
      this._activeCellIdx = undefined
      this._activeGridPos = undefined
      //this._dirty = true
    }

    //console.log('handleMouseMove', x, y, index)
    if (this.infoDiv) {
      this.infoDiv.innerHTML = `<div>MOUSE: ${e.clientX.toFixed(2)},${e.clientY.toFixed(2)}</div>
      <div>CANVASPOS: ${x.toFixed(2)},${y.toFixed(2)}</div>
      <div>GRIDPOS: [${pos.col},${pos.row}]</div>
      <div>IDX: ${index}</div>
      <div>CELLSRND: ${this._cellsRendered}</div>
      `
    }
  }

  private handleMouseClick(e: MouseEvent) {
    // const mainCanvas = this._game.$container
    // const rect = mainCanvas.getBoundingClientRect()
    // const offsetX = mainCanvas.width / 2
    // const offsetY = mainCanvas.height / 2 - (this.cols / 2) * (this.tsize / 2)
    // const x = e.clientX - rect.left - offsetX + this._game.camera.offset.x
    // const y = e.clientY - rect.top - offsetY + this._game.camera.offset.y
    // const pos = this.projection.mapScreenToGrid(x, y)
    console.log('handleMouseClick', this._activeCellIdx, this._activeGridPos)
    const index = this._activeCellIdx
    const pos = this._activeGridPos
    if (index !== undefined && pos !== undefined) {
      this._game.eventbus.emit('grid.cellClick', { index: index, col: pos.col, row: pos.row })
      this._selectedCellIdx = index
      this._selectedCell = pos
      //this._dirty = true
    }
    // if (pos.col >= 0 && pos.col < this.cols && pos.row >= 0 && pos.row < this.rows) {
    //   if (index != this._selectedCellIdx) {
    //     console.log('clicked cell', index, pos)
    //     this._game.eventbus.emit('grid.cellClick', { index: index, col: pos.col, row: pos.row })
    //
    //     this._selectedCellIdx = index
    //     this.dirty = true
    //   }
    // }
  }

  public draw(gridCtx: CanvasRenderingContext2D) {
    //if (!this.dirty) return
    //console.log('GridLinesSystem.draw')

    const cols = this.cols
    const rows = this.rows
    //const tileSize = this.tsize
    //const gridColor = 'rgba(234,116,116,0.4)'
    const cameraOffsetX = this._game.camera.offset.x
    const cameraOffsetY = this._game.camera.offset.y

    // draw the grid
    gridCtx.reset()
    gridCtx.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height)

    gridCtx.translate(-cameraOffsetX, -cameraOffsetY)
    gridCtx.scale(this._game.camera.zoom, this._game.camera.zoom)

    const gridDimensions = this.projection.getGridDimensions()
    gridCtx.fillStyle = 'purple'
    gridCtx.fillText(`${gridDimensions.width}/${gridDimensions.height}`, 0, -40)

    // draw lines
    gridCtx.strokeStyle = this._gridColor
    gridCtx.lineWidth = 1

    // vertical lines
    for (let col = -cols; col <= cols * 2; col++) {
      const start = this.projection.mapGridToScreen(col, -rows)
      const end = this.projection.mapGridToScreen(col, rows * 2)
      gridCtx.beginPath()
      gridCtx.moveTo(start.x, start.y)
      gridCtx.lineTo(end.x, end.y)
      gridCtx.stroke()
    }

    // horizontal lines
    for (let row = -rows; row <= rows * 2; row++) {
      const start = this.projection.mapGridToScreen(-cols, row)
      const end = this.projection.mapGridToScreen(cols * 2, row)
      gridCtx.beginPath()
      gridCtx.moveTo(start.x, start.y)
      gridCtx.lineTo(end.x, end.y)
      gridCtx.stroke()
    }
  }

  public async tick(deltaTime: number) {
    // only draw the grid every X frames to reduce CPU usage
    // if (this._game.frameCount % 2 !== 0) {
    //   return
    // }

    this.draw(this.gridCtx)
  }
}
