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

  public draw(mainCtx: CanvasRenderingContext2D) {
    if (!this.dirty) return
    console.log('WorldMapSystem.draw')

    const tsize = this.tsize
    const twidth = tsize
    const theight = tsize / 2

    const gridWidth = this.cols * twidth
    const gridHeight = this.rows * theight

    const objCanvas = document.createElement('canvas')
    const objCtx = objCanvas.getContext('2d')!
    objCanvas.width = gridWidth
    objCanvas.height = gridHeight

    // draw the underground
    // draw the ground
    // draw the buildings
    // draw the objects
    // draw the overlays

    // draw the objects
    //console.log('draw objects')

    objCtx.reset()
    objCtx.clearRect(0, 0, objCanvas.width, objCanvas.height)

    objCtx.translate(objCanvas.width / 2, 0)

    this._game.worldMap.layers.forEach((layer, layerIdx) => {
      console.log('layer', layerIdx, layer.type)
      if (layer.type === 'OBJECTLAYER') {
        this.drawObjects(layerIdx, objCtx)
      } else if (layer.type === 'TILELAYER') {
        this.drawTiles(layerIdx, objCtx)
      } else if (layer.type === 'BACKGROUND') {
        //this.drawBackground(layerIdx, objCtx)
      } else if (layer.type === 'OVERLAY') {
        //this.drawOverlay(layerIdx, objCtx)
      }
    })

    mainCtx.drawImage(
      objCanvas,
      this._game.width / 2 - gridWidth / 2,
      this._game.height / 2 - gridHeight / 2,
    )

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

        const entity = this._game.worldMap.getTile(layerIdx, c, r)
        if (!entity) continue

        console.log('entity', entityIdx, entity)
        if (entity.draw) {
          objCtx.save()
          entity.draw(objCtx)
          objCtx.restore()
        }
      }
    }
  }

  private drawObjects(layerIdx: number, objCtx: CanvasRenderingContext2D) {
    const objects = this._game.worldMap.objects[layerIdx] || []
    console.log('drawObjects', layerIdx, objects)
    objects.forEach((entityId) => {
      const entity = this._game.worldMap.entities.get(entityId)
      console.log('entity', entityId, entity)
      if (entity && entity.draw) {
        objCtx.save()
        entity.draw(objCtx)
        objCtx.restore()
      }
    })
  }
}
