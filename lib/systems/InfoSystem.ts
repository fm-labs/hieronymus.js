import { AbstractBaseSystem } from './AbstractBaseSystem.ts'

export class InfoSystem extends AbstractBaseSystem implements IGameSystem {
  public name = 'InfoSystem'
  private dirty = true

  constructor(game: IGame) {
    super(game)
  }

  public onLoad() {
    console.log('InfoSystem.onLoad')

    // const systemDiv = document.createElement('div')
    // systemDiv.id = 'systemDiv'
    // systemDiv.style.position = 'absolute'
    // systemDiv.style.top = '0px'
    // systemDiv.style.right = '0px'
    // systemDiv.style.width = '320px'
    // systemDiv.style.height = '100vh'
    // systemDiv.style.overflowX = 'ellipsis'
    // systemDiv.style.overflowY = 'scroll'
    // systemDiv.style.fontFamily = 'monospace'
    // systemDiv.style.fontSize = '10px'
    // systemDiv.style.color = 'rgba(211,211,211,0.93)'
    // systemDiv.style.opacity = '0.8'
    //
    // const logDiv = document.createElement('div')
    // logDiv.id = 'logDiv'
    // systemDiv.appendChild(logDiv)
    //
    // this.game.$container.appendChild(systemDiv)
  }

  public onUnload() {
    console.log('InfoSystem.onUnload')
  }

  public start() {
    console.log('InfoSystem.start')
  }

  public stop() {
    console.log('InfoSystem.stop')
  }

  // public update() {
  //   console.log('InfoSystem.update')
  // }

  public draw(mainCtx: CanvasRenderingContext2D) {
    if (!this.dirty) return
    //console.log('InfoSystem.draw')

    // draw FPS
    mainCtx.save()
    mainCtx.fillStyle = 'green'
    mainCtx.fillRect(this._game.width - 150, 0, 150, 20)
    mainCtx.fillStyle = 'white'
    mainCtx.font = '14px sans-serif'
    mainCtx.fillText(
      `${this._game.frameCount}/${this._game.deltaTime.toFixed(3)} ms/${this._game.fps} fps`,
      this._game.width - 145,
      16,
    )
    mainCtx.restore()
    //this.dirty = false
  }
}
