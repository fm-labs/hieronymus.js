import type { IGame, IGameSystem, IGrid2DProjection, ITileMap } from '../game.types'
import { AbstractGameSystem } from './AbstractGameSystem'

/**
 * Renders grid lines for the tile map on its own canvas.
 *
 * Purely visual: mouse interaction (grid.cellHover / grid.cellClick) is handled by the GridSystem.
 */
export class GridLinesSystem extends AbstractGameSystem implements IGameSystem {
  public readonly name = 'GridLinesSystem'
  private readonly cols: number
  private readonly rows: number
  private readonly projection: IGrid2DProjection
  private gridCanvas!: HTMLCanvasElement
  private gridCtx!: CanvasRenderingContext2D

  private _gridColor = 'rgba(230,151,82,0.4)'

  constructor(game: IGame, tileMap: ITileMap) {
    super(game)

    this.cols = tileMap.columns
    this.rows = tileMap.rows
    this.projection = tileMap.projection
  }

  public onLoad() {
    console.log('GridLinesSystem.onLoad')

    const gridCanvas = document.createElement('canvas')
    gridCanvas.id = 'gridLinesCanvas'
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

  public draw(gridCtx: CanvasRenderingContext2D) {
    const cols = this.cols
    const rows = this.rows
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
    this.draw(this.gridCtx)
  }
}
