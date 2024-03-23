import { EventBus } from './EventBus.ts'
import { GameResourcesManager } from './GameResourcesManager.ts'

export class Game implements IGame {
  public readonly config: GameConfig

  /**
   * The container element for the game.
   */
  public $container: HTMLDivElement

  /**
   * The main canvas element for the game.
   */
  //public $canvas: HTMLCanvasElement

  /**
   * The logging container.
   * @private
   */
  private logDiv: HTMLDivElement

  /**
   * The attached game systems.
   */
  public systems: IGameSystem[] = []

  /**
   * The loaded spritesheets.
   */
  public resources: IGameResources

  /**
   * The event bus.
   */
  public eventbus: EventBus = new EventBus()

  public width: number = 800
  public height: number = 600

  public camera: Camera2D = {
    offset: { x: 0, y: 0 },
    zoom: 1,
  }

  private gameRunning: boolean = false

  constructor($container: HTMLDivElement, config: GameConfig, resources?: IGameResources) {
    console.log('Game constructor', config, resources)
    this.config = config
    this.resources = resources || new GameResourcesManager()

    // container
    this.$container = $container
    this.$container.style.position = 'absolute'
    this.$container.style.top = '0px'
    this.$container.style.left = '0px'
    this.$container.style.width = '100vw'
    this.$container.style.height = '100vh'
    //this.$container.style.border = '1px solid red'

    // Dimensions
    this.width = this.$container.offsetWidth
    this.height = this.$container.offsetHeight

    // // canvas
    // const $canvas = document.createElement('canvas')
    // $canvas.width = this.width
    // $canvas.height = this.height
    // this.$canvas = $canvas
    // this.$container.appendChild($canvas)

    // log container
    this.logDiv = document.createElement('div')

    this.tick = this.tick.bind(this)

    this.eventbus.on('resize', (event: any) => {
      console.log('resize game', event)
      this.updateDimensions(event.width, event.height)
    })
  }

  public updateDimensions(width: number, height: number) {
    this.width = width
    this.height = height
    //this.$container.style.width = width + 'px'
    //this.$container.style.height = height + 'px'
  }

  public addSystem(system: IGameSystem) {
    try {
      if (system.onLoad) {
        system.onLoad()
      }
      this.systems.push(system)
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  public draw() {
    //const ctx = this.$canvas.getContext('2d')!
    //ctx.clearRect(0, 0, this.width, this.height)
    this.systems.forEach((system) => {
      if (system.draw) {
        //system.draw(ctx)
      }
    })

    // ctx.rect(0, 0, this.width, this.height)
    // ctx.strokeStyle = 'red'
    // ctx.stroke()
  }

  // fps
  public lastFrameTime = 0
  public frameCount = 0
  public fps = 0
  public deltaTime = 0

  public tick(currentTime: number) {
    // if (!currentTime) {
    //   currentTime = Date.now()
    // }
    // Convert time to seconds
    //currentTime *= 0.001;

    // Calculate the difference in seconds
    this.deltaTime = currentTime - this.lastFrameTime
    //lastFrameTime = currentTime;

    // Increment the frame count
    this.frameCount++

    // Update FPS every second
    if (this.deltaTime >= 1000) {
      this.fps = this.frameCount
      this.frameCount = 0
      this.lastFrameTime = currentTime
      //console.log('FPS', this.fps)
    }

    this.systems.forEach((system) => {
      if (system.update) {
        system.update(this.deltaTime)
      }
    })

    //this.draw()

    if (!this.gameRunning) return
    requestAnimationFrame(this.tick)
  }

  public async run() {
    console.log('RUN GAME')

    //start systems
    this.systems.forEach((system) => {
      if (system.start) {
        system.start()
      }
    })

    // start game loop
    this.gameRunning = true
    // setTimeout(() => {
    //   this.stop()
    // }, 15000)
    // console.log('STOPPING GAME in 15 seconds')
    requestAnimationFrame(this.tick)
  }

  public stop() {
    console.info('STOP GAME')
    this.gameRunning = false
    // stop systems
    this.systems.forEach((system) => {
      if (system.stop) {
        system.stop()
      }
    })
  }

  async saveState(state: any) {}

  async restoreState(): Promise<any> {}

  public log(...msg: any[]) {
    console.log(...msg)
    const div = document.createElement('div')
    div.textContent = msg.join(' ')
    this.logDiv.appendChild(div)
  }

  public logwarn(...msg: any[]) {
    console.warn(...msg)
  }

  public logerr(...msg: any[]) {
    console.error(...msg)
  }
}
