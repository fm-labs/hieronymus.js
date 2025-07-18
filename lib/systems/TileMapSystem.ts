import { getCellIndex } from '../utils/gridutil.ts'
import { AbstractGameSystem } from './AbstractGameSystem.ts'
import { DimetricGridProjection } from '../map/DimetricGridProjection.ts'
import { ComponentManager } from '../kernel/ComponentManager.ts'
import IsoCharacterComponent from '../components/IsoCharacterComponent.ts'

export class TileMapSystem extends AbstractGameSystem implements IGameSystem {
  public name = 'TileMapSystem'

  private readonly tileMap: ITileMap
  private readonly tsize: number
  private readonly cols: number
  private readonly rows: number

  private readonly worldCanvas: HTMLCanvasElement
  //private dirty = true

  private _drawCounter: number = 0

  constructor(game: IGame, tileMap: ITileMap) {
    super(game)

    this.tileMap = tileMap
    this.cols = tileMap.columns
    this.rows = tileMap.rows
    this.tsize = tileMap.tileWidth
    this.worldCanvas = document.createElement('canvas')
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
    if (this.tileMap.projection instanceof DimetricGridProjection) {
      //this._game.camera.offset.x = -this._game.$container.offsetWidth / 2
      this._game.camera.offset.x = -gridWidth / 2
    }

    this._game.$container.appendChild(this.worldCanvas)

    this._game.eventbus.on('resize', (event: any) => {
      console.log('resize tilemap', event)
      //this.worldCanvas.width = event.width
      //this.worldCanvas.height = event.height
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
    //console.log('TileMapSystem.update', deltaTime)
    this.tileMap.layers.forEach((layer, layerIdx) => {
      this.updateLayer(layerIdx, deltaTime)
    })
    this.draw(this.worldCanvas.getContext('2d')!)
  }

  public draw(layerCanvasCtx: CanvasRenderingContext2D) {
    //if (!this.dirty) return
    //console.log('TileMapSystem.draw')
    this._drawCounter = 0

    layerCanvasCtx.reset()
    layerCanvasCtx.translate(-this._game.camera.offset.x, -this._game.camera.offset.y)
    layerCanvasCtx.scale(this._game.camera.zoom, this._game.camera.zoom)
    this.tileMap.layers.forEach((layer, layerIdx) => {
      //console.log('layer', layerIdx, layer.type)
      if (layer.type === 'TILE') {
        this.drawTiles(layerIdx, layerCanvasCtx)
      } else if (layer.type === 'OBJECT') {
        this.drawObjects(layerIdx, layerCanvasCtx)
      }
    })

    //this.dirty = false

    this._game.eventbus.emit('system.draw', {
      system: this.name,
      context: layerCanvasCtx,
      drawCounter: this._drawCounter,
    })
  }

  private drawTiles(layerIdx: number, layerCtx: CanvasRenderingContext2D) {
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        const cellIdx = getCellIndex(c, r, this.cols)
        const componentIdx = this.tileMap.layers[layerIdx]?.data[cellIdx]
        if (!componentIdx) continue

        const component = this.tileMap.getTile(layerIdx, c, r)
        if (!component) continue

        //console.log('entity', componentIdx, component)
        if (component.draw) {
          layerCtx.save()
          component.draw(layerCtx)
          layerCtx.restore()
          this._drawCounter++
        }
      }
    }
  }

  private drawObjects(layerIdx: number, layerCtx: CanvasRenderingContext2D) {
    //console.log('TileMapSystem.drawObjects', layerIdx, this.tileMap.layers[layerIdx].data.length)
    const objects = this.tileMap.layers[layerIdx].data || []
    objects.forEach((componentId, idx) => {
      const component = this.tileMap.components.get(componentId)
      if (component && component.draw) {
        //console.log('entity', componentId, component)
        layerCtx.save()
        component.draw(layerCtx)
        layerCtx.restore()
        this._drawCounter++
      }
    })
  }

  private updateLayer(layerIdx: number, deltaTime: number) {
    const layerData = this.tileMap.layers[layerIdx].data
    layerData.forEach((componentId, idx) => {
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
