import { AbstractBaseSystem } from './AbstractBaseSystem.ts'

export class WebUiSystem2 extends AbstractBaseSystem implements IGameSystem {
  public name = 'WebUiSystem'
  private uiDiv!: HTMLDivElement
  private controlsDiv!: HTMLDivElement
  private dirty = true
  private selectedSpriteImage: any = null

  private thumbSize = 32

  constructor(game: IGame) {
    super(game)
  }

  public onLoad() {
    console.log('WebUiSystem.onLoad')

    const uiCanvas = document.createElement('canvas')
    const uiCtx = uiCanvas.getContext('2d')!
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

    this.uiDiv.innerHTML = ''

    this.dirty = false
  }
}
