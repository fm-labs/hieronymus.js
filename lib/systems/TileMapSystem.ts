import type { IGame, IGameComponent, IGameSystem, ITileMap } from '../game.types'
import { getCellIndex } from '../utils/gridutil'
import { AbstractGameSystem } from './AbstractGameSystem'
import { IsometricGridProjection } from '../map/IsometricGridProjection'

export class TileMapSystem extends AbstractGameSystem implements IGameSystem {
  public name = 'TileMapSystem'

  private readonly tileMap: ITileMap
  private readonly tsize: number
  private readonly cols: number
  private readonly rows: number

  public readonly worldCanvas: HTMLCanvasElement
  //private dirty = true

  private _drawCounter: number = 0

  /**
   * Cell indices in back-to-front (painter's) order.
   * Cells are sorted by their screen y position, which is row by row for orthogonal maps
   * and diagonal by diagonal (col + row) for isometric maps.
   */
  private readonly cellDrawOrder: number[]

  constructor(game: IGame, tileMap: ITileMap, canvas?: HTMLCanvasElement) {
    super(game)

    this.tileMap = tileMap
    this.cols = tileMap.columns
    this.rows = tileMap.rows
    this.tsize = tileMap.tileWidth
    this.worldCanvas = canvas ? canvas : document.createElement('canvas')
    this.cellDrawOrder = this.computeCellDrawOrder()
    console.log('TileMapSystem.constructor', this.cols, this.rows, this.tsize)
  }

  private computeCellDrawOrder(): number[] {
    const cells: { idx: number; x: number; y: number }[] = []
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const { x, y } = this.tileMap.projection.mapGridToScreen(c, r)
        cells.push({ idx: getCellIndex(c, r, this.cols), x, y })
      }
    }
    return cells.sort((a, b) => a.y - b.y || a.x - b.x).map((cell) => cell.idx)
  }

  public onLoad() {
    console.log('TileMapSystem.onLoad')

    const gridWidth = this.cols * this.tsize
    const gridHeight = this.rows * this.tsize
    //this.worldCanvas.width = gridWidth
    //this.worldCanvas.height = gridHeight
    this.worldCanvas.width = this._game.width
    this.worldCanvas.height = this._game.height
    this.worldCanvas.id = 'worldCanvas'

    //@todo center the grid on the screen
    if (this.tileMap.projection instanceof IsometricGridProjection) {
      //this._game.camera.offset.x = -this._game.$container.offsetWidth / 2
      this._game.camera.offset.x = -gridWidth / 2
    }

    this._game.$container.appendChild(this.worldCanvas)

    this._game.eventbus.on('resize', (event: any) => {
      console.log('resize tilemap', event)
      this.worldCanvas.width = event.width
      this.worldCanvas.height = event.height
    })
  }

  public onUnload() {
    console.log('TileMapSystem.onUnload')
  }

  public start() {
    console.log('TileMapSystem.start')
  }

  public stop() {
    console.log('TileMapSystem.stop')
  }

  public async tick(deltaTime: number) {
    //console.log('TileMapSystem.update', deltaTime, this.tileMap.layers.length)
    this.tileMap.layers.forEach((layer, layerIdx) => {
      this.updateLayer(layerIdx, deltaTime)
    })
    this.draw(this.worldCanvas.getContext('2d')!)
  }

  public draw(layerCanvasCtx: CanvasRenderingContext2D) {
    //if (!this.dirty) return
    //console.log('TileMapSystem.draw', this.tileMap.layers.length)
    this._drawCounter = 0

    layerCanvasCtx.reset()
    //layerCanvasCtx.imageSmoothingEnabled = true
    //layerCanvasCtx.imageSmoothingQuality = 'high'
    layerCanvasCtx.translate(-this._game.camera.offset.x, -this._game.camera.offset.y)
    layerCanvasCtx.scale(this._game.camera.zoom, this._game.camera.zoom)
    let depthSortedDrawn = false
    this.tileMap.layers.forEach((layer, layerIdx) => {
      if (layer.depthSort) {
        // all depthSort layers are merged and drawn at the position of the first one
        if (!depthSortedDrawn) {
          this.drawComponents(this.collectDepthSortedComponents(), layerCanvasCtx)
          depthSortedDrawn = true
        }
      } else if (layer.type === 'TILE') {
        this.drawComponents(this.collectTiles(layerIdx), layerCanvasCtx)
      } else if (layer.type === 'OBJECT') {
        this.drawComponents(sortByDepth(this.collectObjects(layerIdx)), layerCanvasCtx)
      }
    })

    // draw border for debugging
    /*
    layerCanvasCtx.save()
    layerCanvasCtx.strokeStyle = 'red'
    layerCanvasCtx.lineWidth = 2
    layerCanvasCtx.strokeRect(0, 0, this.cols * this.tsize, this.rows * this.tsize)
    layerCanvasCtx.restore()
    */

    //this.dirty = false

    this._game.eventbus.emit('system.draw', {
      system: this.name,
      context: layerCanvasCtx,
      drawCounter: this._drawCounter,
    })
  }

  /** Tiles of a TILE layer in painter's order. */
  private collectTiles(layerIdx: number): IGameComponent[] {
    const data = this.tileMap.layers[layerIdx]?.data || []
    const components: IGameComponent[] = []
    for (const cellIdx of this.cellDrawOrder) {
      const componentId = data[cellIdx]
      if (!componentId) continue
      const component = this.tileMap.components.get(componentId)
      if (component) components.push(component)
    }
    return components
  }

  /** Components of an OBJECT layer in insertion order. */
  private collectObjects(layerIdx: number): IGameComponent[] {
    const data = this.tileMap.layers[layerIdx]?.data || []
    const components: IGameComponent[] = []
    for (const componentId of data) {
      const component = this.tileMap.components.get(componentId)
      if (component) components.push(component)
    }
    return components
  }

  /** Components of all depthSort layers, sorted back-to-front. */
  private collectDepthSortedComponents(): IGameComponent[] {
    const components: IGameComponent[] = []
    this.tileMap.layers.forEach((layer, layerIdx) => {
      if (!layer.depthSort) return
      const layerComponents =
        layer.type === 'TILE' ? this.collectTiles(layerIdx) : this.collectObjects(layerIdx)
      components.push(...layerComponents)
    })
    return sortByDepth(components)
  }

  private drawComponents(components: IGameComponent[], ctx: CanvasRenderingContext2D) {
    for (const component of components) {
      if (!component.draw) continue
      ctx.save()
      component.draw(ctx)
      ctx.restore()
      this._drawCounter++
    }
  }

  private updateLayer(layerIdx: number, deltaTime: number) {
    // iterate over a copy, components may be removed during the update
    const layerData = [...this.tileMap.layers[layerIdx].data]
    layerData.forEach((componentId) => {
      const component = this.tileMap.components.get(componentId)
      if (component && component.update) {
        const updateResult = component.update(deltaTime)
        if (updateResult === null) {
          // NULL means the component should be removed
          console.log('updateTriggeredRemoval', layerIdx, componentId)
          this.tileMap.removeObject(layerIdx, componentId)
        }
      }
    })
  }
}

/**
 * Sort components back-to-front by their screen y position (stable, so ties keep their order).
 * For isometric maps y grows with col + row, for orthogonal maps with the row.
 */
function sortByDepth(components: IGameComponent[]): IGameComponent[] {
  return components.sort((a, b) => a.y - b.y)
}
