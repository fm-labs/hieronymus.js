import { AbstractBaseSystem } from './AbstractBaseSystem.ts'

export class WebUiSystem extends AbstractBaseSystem implements IGameSystem {
  public name = 'WebUiSystem'
  private uiDiv!: HTMLDivElement
  private controlsDiv!: HTMLDivElement
  private dirty = true
  private selectedSpriteImage: any = null

  constructor(game: IGame) {
    super(game)
  }

  public onLoad() {
    console.log('WebUiSystem.onLoad')

    const uiCanvas = document.createElement('canvas')
    //const uiCtx = uiCanvas.getContext('2d')!
    uiCanvas.width = this._game.width
    uiCanvas.height = this._game.height

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
    uiDiv.style.backgroundColor = 'rgba(30,30,30,0.9)'
    //uiDiv.style.border = '1px solid rgba(215,6,6,0.5)'
    this.uiDiv = uiDiv
    this._game.$container.appendChild(uiDiv)

    const controlsDiv = document.createElement('div')
    controlsDiv.id = 'controlsDiv'
    controlsDiv.style.position = 'absolute'
    controlsDiv.style.top = '0px'
    controlsDiv.style.right = '0px'
    controlsDiv.style.width = '320px'
    controlsDiv.style.height = '100vh'
    controlsDiv.style.overflowY = 'scroll'
    //controlsDiv.style.pointerEvents = 'none'
    //controlsDiv.style.display = 'flex'
    //controlsDiv.style.flexDirection = 'row'
    controlsDiv.style.backgroundColor = 'rgba(215,6,6,0.2)'
    //controlsDiv.style.border = '1px solid rgba(215,6,6,0.5)'
    this.controlsDiv = controlsDiv
    this._game.$container.appendChild(controlsDiv)
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

  // public update() {
  //   console.log('WebUiSystem.update')
  // }

  public draw() {
    if (!this.dirty) return
    console.log('WebUiSystem.draw')

    const spriteWidth = 32
    const spriteHeight = 32

    this.uiDiv.innerHTML = ''

    this._game?.spritesheets.forEach((spritesheet: any) => {
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

        const spriteDiv = document.createElement('div')
        spriteDiv.title = `${spritesheet.url} ${sprite.name} (${sprite.x}, ${sprite.y})`
        spriteDiv.style.width = `${spriteWidth}px`
        spriteDiv.style.height = `${spriteHeight}px`
        spriteDiv.style.border = '1px solid rgba(255,255,255,1)'
        spriteDiv.style.borderWidth = '0 1px 1px 0'
        spriteDiv.dataset.spriteIndex = spriteIdx.toString()
        spriteDiv.dataset.spriteSheetName = spritesheet.url.toString()
        spriteDiv.onclick = (ev) => {
          console.log('sprite clicked', ev)
          //const $el = ev.target as HTMLDivElement
          const spriteIdx = parseInt(spriteDiv.dataset.spriteIndex!)
          const spritesheetName = spriteDiv.dataset.spriteSheetName!
          const spritesheet = this._game?.spritesheets.find((s) => s.url === spritesheetName)
          //syslog('sprite clicked', ev, spritesheetName, spriteIdx)
          if (spritesheet) {
            console.log('spritesheet found', spritesheet)
            this.selectedSpriteImage = {
              spriteSheetName: spritesheet.url,
              spriteIndex: spriteIdx,
            }
            console.log('selectedSpriteImage', this.selectedSpriteImage)
            this._game.eventbus.emit('editor.selectedSpriteImage', this.selectedSpriteImage)
            //this.game.editor.state['editor.selectedSpriteImage'] = this.selectedSpriteImage
          }
          this.dirty = true
          this.draw()
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

      // controls
      this.controlsDiv.innerHTML = ''

      const button1 = document.createElement('button')
      button1.textContent = 'Save'
      button1.onclick = () => {
        console.log('save')
        this._game.eventbus.emit('editor.save', {})
      }
      this.controlsDiv.appendChild(button1)

      const button2 = document.createElement('button')
      button2.textContent = 'Restore'
      button2.onclick = () => {
        console.log('restore')
        this._game.eventbus.emit('editor.restore', {})
      }
      this.controlsDiv.appendChild(button2)

      this.controlsDiv.appendChild(document.createElement('hr'))

      const button3 = document.createElement('button')
      button3.textContent = 'Reset camera'
      button3.onclick = () => {
        console.log('reset camera')
        this._game.eventbus.emit('camera.reset', {})
      }
      this.controlsDiv.appendChild(button3)

      this.controlsDiv.appendChild(document.createElement('hr'))

      const button4 = document.createElement('button')
      button4.textContent = 'Select'
      button4.onclick = () => {
        console.log('select cell')
        this._game.eventbus.emit('editor.set_mode', { mode: 'select' })
      }
      this.controlsDiv.appendChild(button4)
    })

    this.dirty = false
  }
}
