import { drawIsoTile } from '../draw2d/drawiso.ts'
import { AbstractGameSystem } from './AbstractGameSystem.ts'
import { getCellIndex } from '../utils/gridutil.ts'
import { DimetricGridProjection } from '../map/DimetricGridProjection.ts'

export class GridSystem extends AbstractGameSystem implements IGameSystem {
  public readonly name = 'GridSystem'
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
    infoDiv.style.left = '0'
    infoDiv.style.background = 'black'
    infoDiv.style.padding = '0.1rem'
    infoDiv.style.fontFamily = 'monospace'
    infoDiv.style.fontSize = '10px'
    this.infoDiv = infoDiv
  }

  public onLoad() {
    console.log('GridSystem.onLoad')

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
    console.log('GridSystem.onUnload')
  }

  public start() {
    console.log('GridSystem.start')

    // Register DOM events
    this.handleMouseMove = this.handleMouseMove.bind(this)
    this._game.$container.addEventListener('mousemove', this.handleMouseMove.bind(this))
    this._game.$container.addEventListener('mousedown', this.handleMouseClick.bind(this))
  }

  public stop() {
    console.log('GridSystem.stop')

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
      this.infoDiv.textContent = `MOUSE: ${e.clientX.toFixed(2)},${e.clientY.toFixed(2)}
      CANVASPOS: ${x.toFixed(2)},${y.toFixed(2)}
      GRIDPOS: [${pos.col},${pos.row}]
      IDX: ${index}
      CELLSRND: ${this._cellsRendered}
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
    //console.log('GridSystem.draw')

    const cols = this.cols
    const rows = this.rows
    const tileSize = this.tsize
    const gridColor = 'rgba(0,0,0,0.03)'
    const cameraOffsetX = this._game.camera.offset.x
    const cameraOffsetY = this._game.camera.offset.y

    // draw the grid
    gridCtx.reset()
    gridCtx.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height)

    gridCtx.translate(-cameraOffsetX, -cameraOffsetY)
    gridCtx.scale(this._game.camera.zoom, this._game.camera.zoom)

    const gridDimensions = this.projection.getGridDimensions()
    gridCtx.fillStyle = 'white'
    gridCtx.fillText(`${gridDimensions.width}/${gridDimensions.height}`, 0, 10)

    // @todo draw grid lines
    // draw grid tiles
    let renderedCells = 0
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const { x, y } = this.projection.mapGridToScreen(i, j)

        // skip if the cell is outside of the canvas / not visible
        const _x = x * this._game.camera.zoom
        const _y = y * this._game.camera.zoom
        //if (x < 0 || y < 0) continue
        if (_x - cameraOffsetX + tileSize < 0 || _y - cameraOffsetY + tileSize < 0) continue
        if (_x > window.innerWidth + cameraOffsetX || _y > window.innerHeight + cameraOffsetY)
          continue

        //renderedCells.push([i, j])

        let tileColor = gridColor
        let strokeColor = 'rgba(200,218,255,0.38)'
        let textColor = undefined
        // const index = getCellIndex(i, j, this.cols)
        // if (index == this._activeCellIdx) {
        //   tileColor = 'rgba(255,0,0,0.5)'
        // }
        if (this._activeGridPos?.col == i && this._activeGridPos?.row == j) {
          tileColor = 'rgba(74,176,162,0.5)'
          textColor = 'rgba(255,255,255,0.85)'
          //strokeColor = 'rgba(74,176,162,0.5)'
        } else if (this._activeGridPos?.col == i || this._activeGridPos?.row == j) {
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
            tileSize,
            tileSize / 2,
            tileColor,
            strokeColor,
            `[${i},${j}]`,
            textColor,
          )
        } else {
          gridCtx.fillStyle = tileColor
          gridCtx.fillRect(x, y, tileSize, tileSize)
          gridCtx.strokeStyle = 'rgba(163,164,163,0.48)'
          gridCtx.setLineDash([1, 3])
          gridCtx.strokeRect(x, y, tileSize, tileSize)
          if (textColor) {
            gridCtx.fillStyle = textColor
          }
          gridCtx.fillText(`[${i},${j}]`, x + 2, y + 10)
        }

        gridCtx.fillStyle = 'rgba(154,2,255,0.48)'
        gridCtx.fillRect(x - 1, y - 1, 2, 2)

        renderedCells++
      }
      //console.log('renderedCells', renderedCells)
    }
    //this._dirty = false
    this._cellsRendered = renderedCells

    this._game.eventbus.emit('system.draw', {
      system: this.name,
      context: gridCtx,
      drawCounter: this._cellsRendered,
    })
  }

  public async tick(deltaTime: number) {
    // only draw the grid every X frames to reduce CPU usage
    // if (this._game.frameCount % 2 !== 0) {
    //   return
    // }

    this.draw(this.gridCtx)
  }
}
