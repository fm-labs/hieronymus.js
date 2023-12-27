import { objectDict } from '../objectDict.ts'
import { getCellIndex, getIsometricCellCords } from '../../lib/kernel/util.ts'

export class IsoObjectSystem implements IGameSystem {
  public name = 'IsoObjectSystem'
  private game!: IGame
  private objects: any[] = []

  public onLoad(game: IGame) {
    console.log('IsoObjectSystem.onLoad')
    this.game = game

    // init objects
    objectDict.forEach((obj) => {
      const objIdx = getCellIndex(obj.col, obj.row, this.game.cols)
      this.objects[objIdx] = obj
    })
  }

  public onUnload() {
    console.log('IsoObjectSystem.onUnload')
  }

  public start() {
    console.log('IsoObjectSystem.start')
  }

  public stop() {
    console.log('IsoObjectSystem.stop')
  }

  public update() {
    console.log('IsoObjectSystem.update')
  }

  public draw(mainCtx: CanvasRenderingContext2D) {
    console.log('IsoObjectSystem.draw')

    const objCanvas = document.createElement('canvas')
    const objCtx = objCanvas.getContext('2d')!
    objCanvas.width = this.game.width
    objCanvas.height = this.game.height

    const twidth = this.game.twidth
    const theight = this.game.theight
    const cols = this.game.cols
    const rows = this.game.rows
    //const objects: any[] = []

    // draw the objects
    console.log('draw objects')

    objCtx.reset()
    objCtx.clearRect(0, 0, this.game.width, this.game.height)
    objCtx.translate(this.game.width / 2 - (rows / 2) * twidth, this.game.height / 2)

    for (let c = cols - 1; c >= 0; c--) {
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

        //const tileIdx = col * rows + row
        //const tpath = getTilePath(tiles[tileIdx])
        //const tpoint0 = tpath[0]
        const tpoint0 = getIsometricCellCords(col, row, this.game.twidth)

        const ratio = sprite.width / sprite.height
        const imgW = Math.min(sprite.width, twidth)
        const imgH = imgW / ratio
        const offsetX = twidth / 2 - imgW / 2
        const offsetY = -imgH + theight / 2

        objCtx.drawImage(
          spriteCanvas,
          0,
          0,
          sprite.width,
          sprite.height,
          tpoint0.x + offsetX,
          tpoint0.y + offsetY,
          imgW,
          imgH,
        )
        objCtx.strokeStyle = 'rgba(115,255,0,0.84)'
        objCtx.strokeRect(tpoint0.x + offsetX, tpoint0.y + offsetY, imgW, imgH)
      }
    }

    mainCtx.drawImage(objCanvas, 0, 0)
  }
}
