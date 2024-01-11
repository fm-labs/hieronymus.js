import { getCellIndex } from '../utils/gridutil.ts'
import { AbstractBaseSystem } from './AbstractBaseSystem.ts'

export class WorldMapSystem extends AbstractBaseSystem implements IGameSystem {
  public name = 'WorldMapSystem'
  private readonly tsize: number
  private readonly cols: number
  private readonly rows: number

  private dirty = true

  constructor(game: IGame) {
    super(game)

    this.cols = this._game.worldMap.columns
    this.rows = this._game.worldMap.rows
    this.tsize = this._game.worldMap.tileWidth
  }

  private handleMouseClick(e: MouseEvent) {
    this._game.eventbus.emit('rerender', {})
  }

  public onLoad() {
    console.log('WorldMapSystem.onLoad')

    this._game.$canvas.addEventListener('click', this.handleMouseClick.bind(this))
    //this._game.$canvas.addEventListener('mousemove', this.handleMouseClick.bind(this))
  }

  public onUnload() {
    console.log('WorldMapSystem.onUnload')
  }

  public start() {
    console.log('WorldMapSystem.start')
    this._game.eventbus.on('rerender', () => {
      this.dirty = true
    })
  }

  public stop() {
    console.log('WorldMapSystem.stop')
  }

  public update(deltaTime: number) {
    //console.log('WorldMapSystem.update', deltaTime)
    this._game.worldMap.layers.forEach((layer, layerIdx) => {
      this.updateLayer(layerIdx, deltaTime)
    })
  }

  public draw(mainCtx: CanvasRenderingContext2D) {
    //if (!this.dirty) return
    //console.log('WorldMapSystem.draw')

    const tsize = this.tsize
    const twidth = tsize
    const theight = tsize / 2

    const gridWidth = this.cols * twidth
    const gridHeight = this.rows * theight

    const worldCanvas = document.createElement('canvas')
    const worldCtx = worldCanvas.getContext('2d')!
    worldCanvas.width = gridWidth
    worldCanvas.height = gridHeight

    // draw all layers
    const layerCanvas: HTMLCanvasElement[] = []
    this._game.worldMap.layers.forEach((layer, layerIdx) => {
      layerCanvas[layerIdx] = document.createElement('canvas')
      layerCanvas[layerIdx].width = gridWidth
      layerCanvas[layerIdx].height = gridHeight
    })

    worldCtx.reset()
    worldCtx.clearRect(0, 0, worldCanvas.width, worldCanvas.height)
    worldCtx.translate(worldCanvas.width / 2, 0)

    this._game.worldMap.layers.forEach((layer, layerIdx) => {
      const layerCanvasCtx = layerCanvas[layerIdx].getContext('2d')!
      layerCanvasCtx.reset()
      layerCanvasCtx.clearRect(0, 0, worldCanvas.width, worldCanvas.height)
      layerCanvasCtx.translate(worldCanvas.width / 2, 0)

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

      mainCtx.drawImage(
        layerCanvasCtx.canvas,
        this._game.width / 2 - gridWidth / 2,
        this._game.height / 2 - gridHeight / 2,
      )
    })

    // mainCtx.drawImage(
    //   worldCanvas,
    //   this._game.width / 2 - gridWidth / 2,
    //   this._game.height / 2 - gridHeight / 2,
    // )

    this.dirty = false
  }

  private drawTiles(layerIdx: number, objCtx: CanvasRenderingContext2D) {
    const tsize = this.tsize
    const twidth = tsize
    const theight = tsize / 2

    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        const cellIdx = getCellIndex(c, r, this.cols)
        const entityIdx = this._game.worldMap.layers[layerIdx]?.data[cellIdx]
        if (!entityIdx) continue

        const component = this._game.worldMap.getTile(layerIdx, c, r)
        if (!component) continue

        //console.log('entity', entityIdx, component)
        if (component.draw) {
          objCtx.save()
          component.draw(objCtx)
          objCtx.restore()
        }
      }
    }
  }

  private drawObjects(layerIdx: number, objCtx: CanvasRenderingContext2D) {
    //const objects = this._game.worldMap.objects[layerIdx] || []
    const objects = this._game.worldMap.layers[layerIdx].data || []
    //console.log('drawObjects', layerIdx, objects)
    objects.forEach((entityId, idx) => {
      const entity = this._game.worldMap.entities.get(entityId)
      const component = entity?.component
      //const component = this._game.worldMap.entities.get(entityId)?.component
      //const component = this._game.worldMap.getObject(layerIdx, idx)
      //console.log('entity', entityId, component)
      if (component && component.draw) {
        objCtx.save()
        component.draw(objCtx)
        objCtx.restore()
      }
    })
  }

  private updateLayer(layerIdx: number, deltaTime: number) {
    const layerData = this._game.worldMap.layers[layerIdx].data
    layerData.forEach((entityId, idx) => {
      const entity = this._game.worldMap.entities.get(entityId)
      const component = entity?.component
      if (component && component.update) {
        if (component.update(deltaTime) === true) {
          //console.log('update', layerIdx, idx, component)
          this.dirty = true
        }
      }
    })
  }
}
