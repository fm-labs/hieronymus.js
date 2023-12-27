import {
  getIsometricGridPosition,
  getTileIndexFromIsometricGridPosition,
} from '../../lib/kernel/util.ts'

// random colors
const colors = [
  '#ff0000',
  '#00ff00',
  '#0000ff',
  '#ffff00',
  '#00ffff',
  '#ff00ff',
  '#ffffff',
  '#000000',
]

export class WebUiSystem implements IGameSystem {
  public name = 'WebUiSystem'
  private game!: IGame
  private uiDiv!: HTMLDivElement
  private dirty = true
  private selectedSpriteImage: any = null

  public onLoad(game: IGame) {
    console.log('WebUiSystem.onLoad')
    this.game = game

    const uiCanvas = document.createElement('canvas')
    const uiCtx = uiCanvas.getContext('2d')!
    uiCanvas.width = game.width
    uiCanvas.height = game.height

    const uiDiv = document.createElement('div')
    uiDiv.id = 'uiDiv'
    uiDiv.style.position = 'absolute'
    uiDiv.style.top = '0px'
    uiDiv.style.left = '0px'
    uiDiv.style.width = '320px'
    uiDiv.style.height = '100vh'
    uiDiv.style.overflowY = 'scroll'
    //uiDiv.style.pointerEvents = 'none'
    //uiDiv.style.display = 'flex'
    //uiDiv.style.flexDirection = 'row'
    //uiDiv.style.backgroundColor = 'rgba(215,6,6,0.2)'
    //uiDiv.style.border = '1px solid rgba(215,6,6,0.5)'
    this.uiDiv = uiDiv
    this.game.$container.appendChild(uiDiv)

    const mainCanvas = this.game.$canvas
    mainCanvas.addEventListener('click', (e) => {
      const rect = mainCanvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // const spriteIndex = getSpriteIndex(x, y)
      // console.log('spriteIndex', x, y, spriteIndex)
      // //syslog('spriteIndex', x, y, spriteIndex)
      // if (spriteIndex >= 0) {
      //   console.log('sprite clicked', spritesheet1.sprites[spriteIndex])
      //   return
      // }

      //const pos = getIsometricGridPosition(x, y, this.game.twidth)
      const index = getTileIndexFromIsometricGridPosition(x, y, this.game.twidth, this.game.cols)
      console.log('clicked tile', index, this.selectedSpriteImage)
      if (index >= 0) {
        const randomColorIndex = Math.floor(Math.random() * colors.length)
        this.game.cells[index].color = colors[randomColorIndex] // Change the color of the clicked tile
        // lastClickedTileInfo = getTilePath(tiles[index])

        // if (selectedSpriteImage) {
        //   const objIdx = getCellIndex(tiles[index].col, tiles[index].row)
        //   const obj = {
        //     col: tiles[index].col,
        //     row: tiles[index].row,
        //     spriteRef: selectedSpriteImage,
        //   }
        //   objects[objIdx] = obj
        //   console.log('Object', objIdx, obj)
        // }
      }
      this.game.draw() // Redraw all the tiles to reflect the color change
    })
  }

  public onUnload() {
    console.log('WebUiSystem.onUnload')
  }

  public start() {
    console.log('WebUiSystem.start')
  }

  public stop() {
    console.log('WebUiSystem.stop')
  }

  public update() {
    console.log('WebUiSystem.update')
  }

  public draw() {
    console.log('WebUiSystem.draw')
    if (!this.dirty) return

    const spriteWidth = 32
    const spriteHeight = 32

    this.uiDiv.innerHTML = ''

    this.game?.spritesheets.forEach((spritesheet: any) => {
      const spritesContainer = document.createElement('div')
      spritesContainer.style.display = 'flex'
      spritesContainer.style.flexDirection = 'row'
      spritesContainer.style.flexWrap = 'wrap'
      spritesContainer.style.width = 320 + 'px'
      //spritesContainer.style.height = 100 + '%'
      spritesContainer.style.borderTop = '5px solid red'

      let spriteIdx = -1
      spritesheet.sprites.forEach((sprite: any) => {
        spriteIdx++
        const { x, y, width, height } = sprite
        const spriteCanvas = document.createElement('canvas')
        spriteCanvas.width = spriteWidth
        spriteCanvas.height = spriteHeight
        spriteCanvas.style.position = 'relative'
        const spriteCanvasCtx = spriteCanvas.getContext('2d')!
        spriteCanvasCtx.drawImage(
          spritesheet.image,
          x,
          y,
          width,
          height,
          0,
          0,
          spriteWidth,
          spriteHeight,
        )

        const self = this
        const spriteDiv = document.createElement('div')
        spriteDiv.title = `${spritesheet.url} ${sprite.name} (${sprite.x}, ${sprite.y})`
        spriteDiv.style.width = `${spriteWidth}px`
        spriteDiv.style.height = `${spriteHeight}px`
        spriteDiv.dataset.spriteIndex = spriteIdx.toString()
        spriteDiv.dataset.spriteSheetName = spritesheet.url.toString()
        spriteDiv.onclick = (ev) => {
          //const $el = ev.target as HTMLDivElement
          const spriteIdx = parseInt(spriteDiv.dataset.spriteIndex!)
          const spritesheetName = spriteDiv.dataset.spriteSheetName!
          const spritesheet = self.game?.spritesheets.find((s) => s.url === spritesheetName)
          //syslog('sprite clicked', ev, spritesheetName, spriteIdx)
          if (spritesheet) {
            console.log('spritesheet found', spritesheet)
            self.selectedSpriteImage = {
              spriteSheetName: spritesheet.url,
              spriteIndex: spriteIdx,
            }
            console.log('selectedSpriteImage', self.selectedSpriteImage)
          }
          self.dirty = true
          self.draw()
        }

        if (
          this.selectedSpriteImage &&
          this.selectedSpriteImage.spriteSheetName === spritesheet.url &&
          this.selectedSpriteImage.spriteIndex === spriteIdx
        ) {
          //spriteDiv.style.border = '2px solid red'
          spriteDiv.style.backgroundColor = 'rgba(72,255,0,0.8)'
        }
        spriteDiv.appendChild(spriteCanvas)
        spritesContainer.appendChild(spriteDiv)
      })
      this.uiDiv.appendChild(spritesContainer)
    })

    this.dirty = false
  }
}
