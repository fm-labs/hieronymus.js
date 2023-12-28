import { objectDict } from '../../src/objectDict.ts'
import { getCellIndex, getIsometricScreenPosition } from '../utils/gridutil.ts'
import { DimetricGridProjection } from '../map/projection.ts'

export class IsoObjectSystem implements IGameSystem {
  public name = 'IsoObjectSystem'
  private game!: IGame
  private tsize: number
  private projection: IGrid2DProjection
  private objects: any[] = []
  private dirty = true
  private _selectedSpriteImage: any | undefined

  constructor(tileSize: number) {
    this.tsize = tileSize
    this.projection = new DimetricGridProjection(tileSize)
  }

  public onLoad(game: IGame) {
    console.log('IsoObjectSystem.onLoad')
    this.game = game

    // init objects
    objectDict.forEach((obj) => {
      const objIdx = getCellIndex(obj.col, obj.row, this.game.cols)
      //this.objects[objIdx] = obj
    })
  }

  public onUnload() {
    console.log('IsoObjectSystem.onUnload')
  }

  public start() {
    console.log('IsoObjectSystem.start')

    this.game.eventbus.on('grid.cellClick', this.handleCellClick.bind(this))

    this.game.eventbus.on('editor.selectedSpriteImage', (selectedSpriteImage) => {
      //console.log('The selected sprite image changed', selectedSpriteImage)
      this._selectedSpriteImage = selectedSpriteImage
    })

    this.game.eventbus.on('hero.move', (hero) => {
      //console.log('Hero position changed changed', hero)
      this.dirty = true
    })
  }

  public stop() {
    console.log('IsoObjectSystem.stop')
  }

  public update() {
    //console.log('IsoObjectSystem.update')
  }

  private handleCellClick({ index, col, row }: any) {
    console.log('[IsoObjects] clicked cell', index, col, row, this._selectedSpriteImage)

    if (this._selectedSpriteImage) {
      const obj = {
        col: col,
        row: row,
        spriteRef: this._selectedSpriteImage,
      }
      console.log('Update Object', index, obj)
      this.objects[index] = obj
      this.dirty = true

      this.game.eventbus.emit('object.update', obj)
    }
  }

  public draw(mainCtx: CanvasRenderingContext2D) {
    if (!this.dirty) return
    console.log('IsoObjectSystem.draw')

    const cols = this.game.cols
    const rows = this.game.rows

    const tsize = this.tsize
    const twidth = tsize
    const theight = tsize / 2

    const gridWidth = cols * twidth
    const gridHeight = rows * theight

    const objCanvas = document.createElement('canvas')
    const objCtx = objCanvas.getContext('2d')!
    objCanvas.width = gridWidth
    objCanvas.height = gridHeight

    // draw the objects
    //console.log('draw objects')

    objCtx.reset()
    objCtx.clearRect(0, 0, objCanvas.width, objCanvas.height)

    objCtx.save()
    objCtx.translate(objCanvas.width / 2, 0)

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const objIdx = getCellIndex(c, r, cols)
        const obj = this.objects[objIdx]
        if (!obj) continue

        const { col, row, spriteRef } = obj
        const { spriteSheetName, spriteIndex } = spriteRef
        const spritesheet = this.game.spritesheets.find((s) => s.url === spriteSheetName)
        if (!spritesheet) {
          console.log(`Spritesheet not found: ${spriteSheetName}`)
          return
        }

        const sprite = spritesheet?.sprites[spriteIndex]
        const spriteImage = spritesheet.image
        if (!sprite) {
          console.log(`Sprite not found: ${spriteSheetName} ${spriteIndex}`)
          return
        }
        //console.log('spritesheet', spritesheet)
        //console.log('sprite', sprite, spriteSheetName)

        const spriteCanvas = document.createElement('canvas')
        spriteCanvas.width = sprite.width
        spriteCanvas.height = sprite.height
        const spriteCanvasCtx = spriteCanvas.getContext('2d')!
        spriteCanvasCtx.drawImage(
          spriteImage,
          sprite.x,
          sprite.y,
          sprite.width,
          sprite.height,
          0,
          0,
          sprite.width,
          sprite.height,
        )

        const tpos = this.projection.mapGridToScreen(col, row)
        const ratio = sprite.width / sprite.height

        let imgW = Math.min(sprite.width, twidth)
        let imgH = imgW / ratio

        // adjust width to fit the tile
        if (ratio < 1) {
          imgW = twidth
          imgH = imgW / (twidth / sprite.height)
        } else if (ratio < 1.5) {
        }

        console.log('sprite', objIdx, spriteIndex, ratio, imgW, imgH)

        const offsetX = -(imgW / 2) - this.game.camera.offset.x
        const offsetY = -imgH + theight - this.game.camera.offset.y

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
        objCtx.strokeStyle = 'rgba(115,255,0,0.84)'
        objCtx.strokeRect(tpos.x + offsetX, tpos.y + offsetY, imgW, imgH)
      }
    }

    // mainCtx.clearRect(
    //   this.game.width / 2 - gridWidth / 2,
    //   this.game.height / 2 - gridHeight / 2,
    //   gridWidth,
    //   gridHeight,
    // )
    mainCtx.drawImage(
      objCanvas,
      this.game.width / 2 - gridWidth / 2,
      this.game.height / 2 - gridHeight / 2,
    )

    this.dirty = false
  }
}
