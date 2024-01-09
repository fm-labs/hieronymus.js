import { getCellIndex } from '../utils/gridutil.ts'
import { AbstractBaseSystem } from './AbstractBaseSystem.ts'

export class WorldMapSystem extends AbstractBaseSystem implements IGameSystem {
  public name = 'WorldMapSystem'
  private readonly tsize: number
  private dirty = true

  constructor(game: IGame) {
    super(game)

    this.tsize = this._game.config.tileSize
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

    const cols = this._game.config.columns
    const rows = this._game.config.rows

    const tsize = this.tsize
    const twidth = tsize
    const theight = tsize / 2

    const gridWidth = cols * twidth
    const gridHeight = rows * theight

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

    objCtx.save()
    objCtx.translate(objCanvas.width / 2, 0)

    this._game.worldMap.layers.forEach((layer, layerIdx) => {
      console.log('layer', layerIdx, layer.type)
      if (layer.type === 'OBJECTLAYER') {
        this.drawObjects(layerIdx, objCtx)
      } else if (layer.type === 'TILELAYER') {
        this.drawObjects(layerIdx, objCtx)
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

  private drawObjects(layerIdx: number, objCtx: CanvasRenderingContext2D) {
    const tsize = this.tsize
    const twidth = tsize
    const theight = tsize / 2

    for (let c = 0; c < this._game.config.columns; c++) {
      for (let r = 0; r < this._game.config.rows; r++) {
        const cellIdx = getCellIndex(c, r, this._game.config.columns)
        const entityIdx = this._game.worldMap.layers[layerIdx]?.data[cellIdx]
        if (!entityIdx) continue

        const entity = this._game.entityManager.get(entityIdx)
        if (!entity) continue

        console.log('entity', entityIdx, entity)
        if (entity.draw) {
          entity.draw(objCtx)
        }

        /*
        const spriteIdx = this._game.worldMap.layers[layerIdx]?.data[cellIdx]
        if (!spriteIdx) continue

        const spriteImage = this._game.resources.sprites[spriteIdx]
        if (!spriteImage) {
          console.log(`Sprite not found: ${spriteIdx}`)
          continue
        }

        const sprite = spriteImage.sprite
        const spriteCanvas = document.createElement('canvas')
        spriteCanvas.width = sprite.width
        spriteCanvas.height = sprite.height
        const spriteCanvasCtx = spriteCanvas.getContext('2d')!
        spriteCanvasCtx.drawImage(
          spriteImage.image,
          sprite.x,
          sprite.y,
          sprite.width,
          sprite.height,
          0,
          0,
          sprite.width,
          sprite.height,
        )

        const tpos = this.projection.mapGridToScreen(c, r)
        const ratio = sprite.width / sprite.height

        const imgW = Math.min(sprite.width, twidth)
        const imgH = imgW / ratio

        // adjust width to fit the tile
        // if (ratio < 1) {
        //   imgW = twidth
        //   imgH = imgW / (twidth / sprite.height)
        // }
        //console.log('sprite', cellIdx, spriteIdx, ratio, imgW, imgH)

        const offsetX = -(imgW / 2) - this._game.camera.offset.x
        const offsetY = -imgH + theight - this._game.camera.offset.y

        objCtx.drawImage(
          spriteCanvas,
          0,
          0,
          sprite.width,
          sprite.height,
          tpos.x + offsetX,
          tpos.y + offsetY,
          imgW,
          imgH,
        )
        //objCtx.strokeStyle = 'rgba(115,255,0,0.84)'
        //objCtx.strokeRect(tpos.x + offsetX, tpos.y + offsetY, imgW, imgH)
      */
      }
    }
  }

  private drawTiles(layerIdx: number, objCtx: CanvasRenderingContext2D) {}
}
