import { getCellIndex } from '../utils/gridutil.ts'
import { AbstractBaseSystem } from './AbstractBaseSystem.ts'

export class TileMapSystem extends AbstractBaseSystem implements IGameSystem {
  public name = 'TileMapSystem'

  private readonly tileMap: ITileMap
  private readonly tsize: number
  private readonly cols: number
  private readonly rows: number

  private readonly worldCanvas: HTMLCanvasElement
  //private dirty = true

  constructor(game: IGame, tileMap: ITileMap) {
    super(game)

    this.tileMap = tileMap
    this.cols = tileMap.columns
    this.rows = tileMap.rows
    this.tsize = tileMap.tileWidth
    this.worldCanvas = document.createElement('canvas')
  }

  private handleMouseClick(e: MouseEvent) {
    //this._game.eventbus.emit('rerender', {})
  }

  public onLoad() {
    console.log('TileMapSystem.onLoad')

    this.worldCanvas.id = 'worldCanvas'

    const gridWidth = this.cols * this.tsize
    const gridHeight = this.rows * this.tsize
    this.worldCanvas.width = gridWidth // this._game.width
    this.worldCanvas.height = gridHeight // this._game.height
    //this.worldCanvas.width = this.cols * this.tsize
    //this.worldCanvas.height = (this.rows * this.tsize) / 2

    this._game.$container.appendChild(this.worldCanvas)
    this._game.$container.addEventListener('click', this.handleMouseClick.bind(this))
    //this._game.$container.addEventListener('mousemove', this.handleMouseClick.bind(this))

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

    //this._game.camera.offset.x = -this.worldCanvas.width / 2

    // this._game.eventbus.on('rerender', () => {
    //   this.dirty = true
    // })
  }

  public stop() {
    console.log('TileMapSystem.stop')
  }

  public update(deltaTime: number) {
    //console.log('TileMapSystem.update', deltaTime)
    this.tileMap.layers.forEach((layer, layerIdx) => {
      this.updateLayer(layerIdx, deltaTime)
    })
    this.draw(this.worldCanvas.getContext('2d')!)
  }

  public draw(layerCanvasCtx: CanvasRenderingContext2D) {
    //if (!this.dirty) return
    //console.log('TileMapSystem.draw')

    // const tsize = this.tsize
    // const twidth = tsize
    // const theight = tsize / 2
    //
    const gridWidth = this.cols * this.tsize
    const gridHeight = this.rows * this.tsize

    // const projectionOffset = this.tileMap.projection.getProjectionOffset()
    // const projectionOffsetX = projectionOffset.x
    // const projectionOffsetY = projectionOffset.y
    // const cameraOffsetX = this._game.camera.offset.x
    // const cameraOffsetY = this._game.camera.offset.y

    // draw all layers
    // const layerCanvas: HTMLCanvasElement[] = []
    // this._game.worldMap.layers.forEach((layer, layerIdx) => {
    //   layerCanvas[layerIdx] = document.createElement('canvas')
    //   layerCanvas[layerIdx].width = gridWidth
    //   layerCanvas[layerIdx].height = gridHeight
    // })

    // const worldCtx = this.worldCanvas.getContext('2d')!
    // worldCtx.reset()
    // worldCtx.clearRect(0, 0, worldCanvas.width, worldCanvas.height)
    // worldCtx.translate(worldCanvas.width / 2, 0)

    //const translateX = projectionOffsetX - cameraOffsetX
    //const translateY = projectionOffsetY - cameraOffsetY
    //const layerCanvasCtx = this.worldCanvas.getContext('2d')!
    layerCanvasCtx.reset()
    //layerCanvasCtx.clearRect(0, 0, gridWidth, gridHeight)
    //layerCanvasCtx.translate(translateX, translateY)
    layerCanvasCtx.translate(-this._game.camera.offset.x, -this._game.camera.offset.y)
    this.tileMap.layers.forEach((layer, layerIdx) => {
      //console.log('layer', layerIdx, layer.type)
      if (layer.type === 'TILELAYER') {
        this.drawTiles(layerIdx, layerCanvasCtx)
      } else if (layer.type === 'OBJECTLAYER') {
        this.drawObjects(layerIdx, layerCanvasCtx)
      } else if (layer.type === 'BACKGROUND') {
        //this.drawBackground(layerIdx, layerCanvasCtx)
      } else if (layer.type === 'OVERLAY') {
        //this.drawOverlay(layerIdx, layerCanvasCtx)
      }

      // mainCtx.drawImage(
      //   layerCanvasCtx.canvas,
      //   0, //this._game.width / 2 - gridWidth / 2,
      //   0, //this._game.height / 2 - gridHeight / 2,
      // )
    })
    //layerCanvasCtx.translate(-gridWidth / 2 - projectionOffsetX, -projectionOffsetY)
    // layerCanvasCtx.rect(0, 0, gridWidth, gridHeight)
    // layerCanvasCtx.setLineDash([10, 10])
    // layerCanvasCtx.strokeStyle = 'purple'
    // layerCanvasCtx.stroke()

    //mainCtx.reset()
    // mainCtx.drawImage(
    //   this.worldCanvas,
    //   0, //this._game.width / 2 - gridWidth / 2,
    //   0, //this._game.height / 2 - gridHeight / 2,
    // )

    //this.dirty = false
  }

  private drawTiles(layerIdx: number, layerCtx: CanvasRenderingContext2D) {
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        const cellIdx = getCellIndex(c, r, this.cols)
        const entityIdx = this.tileMap.layers[layerIdx]?.data[cellIdx]
        if (!entityIdx) continue

        const component = this.tileMap.getTile(layerIdx, c, r)
        if (!component) continue

        //console.log('entity', entityIdx, component)
        if (component.draw) {
          layerCtx.save()
          component.draw(layerCtx)
          layerCtx.restore()
        }
      }
    }
  }

  private drawObjects(layerIdx: number, layerCtx: CanvasRenderingContext2D) {
    //const objects = this._game.worldMap.objects[layerIdx] || []
    const objects = this.tileMap.layers[layerIdx].data || []
    //console.log('drawObjects', layerIdx, objects)
    objects.forEach((entityId, idx) => {
      const entity = this.tileMap.entities.get(entityId)
      const component = entity?.component
      //const component = this._game.worldMap.entities.get(entityId)?.component
      //const component = this._game.worldMap.getObject(layerIdx, idx)
      if (component && component.draw) {
        //console.log('entity', entityId, component)
        layerCtx.save()
        component.draw(layerCtx)
        layerCtx.restore()
      }
    })
  }

  private updateLayer(layerIdx: number, deltaTime: number) {
    const layerData = this.tileMap.layers[layerIdx].data
    layerData.forEach((entityId, idx) => {
      const entity = this.tileMap.entities.get(entityId)
      const component = entity?.component
      if (component && component.update) {
        if (component.update(deltaTime) === true) {
          //console.log('update', layerIdx, idx, component)
          //this.dirty = true
        }
      }
    })
  }
}
