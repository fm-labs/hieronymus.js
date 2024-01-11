import { AbstractBaseSystem } from './AbstractBaseSystem.ts'

export class EntitySystem extends AbstractBaseSystem implements IGameSystem {
  public name = 'EntitySystem'
  private _selectedSpriteImage: any | undefined

  constructor(game: IGame) {
    super(game)
  }

  public onLoad() {
    console.log('EntitySystem.onLoad')
  }

  public onUnload() {
    console.log('EntitySystem.onUnload')
  }

  public start() {
    console.log('EntitySystem.start')

    this._game.eventbus.on('grid.cellClick', this.handleCellClick.bind(this))

    this._game.eventbus.on('editor.selectedSpriteImage', (selectedSpriteImage) => {
      //console.log('The selected sprite image changed', selectedSpriteImage)
      this._selectedSpriteImage = selectedSpriteImage
    })

    // this._game.eventbus.on('hero.move', (hero) => {
    //   console.log('Hero position changed changed', hero)
    // })
  }

  public stop() {
    console.log('EntitySystem.stop')
  }

  public update() {
    //console.log('EntitySystem.update')
  }

  private handleCellClick({ index, col, row }: any) {
    console.log('[Entitys] clicked cell', index, col, row, this._selectedSpriteImage)

    if (this._selectedSpriteImage) {
      const obj = {
        col: col,
        row: row,
        spriteRef: this._selectedSpriteImage,
      }
      console.log('Update Object', index, obj)
      //this.objects[index] = obj
      //this.dirty = true

      this._game.eventbus.emit('object.update', obj)
    }
  }

  public draw(mainCtx: CanvasRenderingContext2D) {
    //if (!this.dirty) return
    //console.log('EntitySystem.draw')
    // const cols = this._game.worldMap.columns
    // const rows = this._game.worldMap.rows
    // const tsize = this._game.worldMap.tileWidth
    // const twidth = tsize
    // const theight = tsize / 2
    //
    // const gridWidth = cols * twidth
    // const gridHeight = rows * theight
    //
    // const objCanvas = document.createElement('canvas')
    // const objCtx = objCanvas.getContext('2d')!
    // objCanvas.width = gridWidth
    // objCanvas.height = gridHeight
    //
    // objCtx.reset()
    // objCtx.clearRect(0, 0, objCanvas.width, objCanvas.height)
    //
    // objCtx.save()
    // objCtx.translate(objCanvas.width / 2, 0)
    //
    // mainCtx.drawImage(
    //   objCanvas,
    //   this._game.width / 2 - gridWidth / 2,
    //   this._game.height / 2 - gridHeight / 2,
    // )
    //this.dirty = false
  }
}
