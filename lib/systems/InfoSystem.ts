import { AbstractGameSystem } from './AbstractGameSystem.ts'

export class InfoSystem extends AbstractGameSystem implements IGameSystem {
  public name = 'InfoSystem'
  private readonly systemDiv: HTMLDivElement
  //private dirty = true

  private mousePos: Screen2DPosition = { x: 0, y: 0 }

  private metrics: { [key: string]: number } = {}

  constructor(game: IGame) {
    super(game)

    const systemDiv = document.createElement('div')
    systemDiv.id = 'systemDiv'
    systemDiv.style.position = 'absolute'
    systemDiv.style.bottom = '5px'
    systemDiv.style.right = '5px'
    //systemDiv.style.width = '320px'
    //systemDiv.style.height = '100vh'
    systemDiv.style.overflowX = 'ellipsis'
    systemDiv.style.overflowY = 'scroll'
    systemDiv.style.fontFamily = 'monospace'
    systemDiv.style.fontSize = '10px'
    systemDiv.style.color = 'rgb(132,255,0)'
    systemDiv.style.opacity = '1'
    systemDiv.style.zIndex = '100000'
    this.systemDiv = systemDiv
  }

  public onLoad() {
    console.log('InfoSystem.onLoad')

    this._game.$container.appendChild(this.systemDiv)
    this._game.$container.addEventListener('mousemove', (e: MouseEvent) => {
      //console.log('mousemove', e)
      this.mousePos = { x: e.clientX, y: e.clientY }
    })

    this._game.eventbus.on('system.draw', (event) => {
      const systemName = event?.system || 'unknown'
      const metricsKey = `${systemName}DrawCounter`
      this.metrics[metricsKey] = event?.drawCounter || 0
    })
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

  public tick() {
    this.draw()
  }

  public draw() {
    // if (!this.dirty) return
    // //console.log('InfoSystem.draw')
    //
    // // draw FPS
    // mainCtx.save()
    // mainCtx.fillStyle = 'green'
    // mainCtx.fillRect(this._game.width - 150, 0, 150, 20)
    // mainCtx.fillStyle = 'white'
    // mainCtx.font = '14px sans-serif'
    // mainCtx.fillText(
    //   `${this._game.frameCount}/${this._game.deltaTime.toFixed(3)} ms/${this._game.fps} fps`,
    //   this._game.width - 145,
    //   16,
    // )
    // mainCtx.restore()
    // //this.dirty = false

    this.systemDiv.innerHTML = `
<div>${this._game.frameCount}/${this._game.deltaTime.toFixed(3)} ms/${this._game.fps} fps</div>
<div>Screen W:${screen.width} H:${screen.height}</div>
<div>Window W:${window.innerWidth} H:${window.innerHeight}</div>
<div>Container W:${this._game.$container.offsetWidth} H:${this._game.$container.offsetHeight}</div>
<div>Canvas W:${this._game.width} H:${this._game.height}</div>
<div>Game W:${this._game.width} H:${this._game.height}</div>
<div>Camera X:${this._game.camera.offset.x} Y:${this._game.camera.offset.y} ZOOM ${this._game.camera.zoom}</div>
<div>Mouse X:${this.mousePos.x} Y:${this.mousePos.y}</div>
`
    // Add metrics
    for (const [key, value] of Object.entries(this.metrics)) {
      this.systemDiv.innerHTML += `<div>${key}: ${value}</div>`
    }
  }
}
