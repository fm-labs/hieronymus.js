import { EventBus } from './eventbus.ts'

export class Game implements IGame {
  /**
   * The container element for the game.
   */
  public $container: HTMLDivElement

  /**
   * The main canvas element for the game.
   */
  public $canvas: HTMLCanvasElement

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
  public spritesheets: SpritesheetImage[] = []

  /**
   * The event bus.
   */
  public eventbus: EventBus = new EventBus()

  public width: number
  public height: number

  public cols: number
  public rows: number
  public cells: Grid2DCell[] = []

  constructor($container: HTMLDivElement, cols: number, rows: number) {
    //@todo make game dimensions configurable
    this.cols = cols
    this.rows = rows

    this.$container = $container
    this.$container.style.position = 'absolute'
    this.$container.style.top = '0px'
    this.$container.style.left = '0px'
    this.$container.style.width = '100vw'
    this.$container.style.height = '100vh'
    this.width = $container.clientWidth
    this.height = $container.clientHeight

    // canvas
    const $canvas = document.createElement('canvas')
    $canvas.width = this.width
    $canvas.height = this.height
    this.$canvas = $canvas
    this.$container.appendChild($canvas)

    // logging
    const logDiv = document.createElement('div')
    this.logDiv = logDiv

    console.log('Game constructor', this.cols, this.rows, this.width, this.height)
  }

  public updateDimensions(width: number, height: number) {
    this.width = width
    this.height = height
    this.$canvas.width = width
    this.$canvas.height = height
  }

  public addSystem(system: IGameSystem) {
    try {
      if (system.onLoad) {
        system.onLoad(this)
      }
      this.systems.push(system)
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  public draw() {
    const ctx = this.$canvas.getContext('2d')!

    // render a red rectangle
    //ctx.fillStyle = 'red'
    //ctx.fillRect(0, 0, this.width / 2, this.height / 2)

    this.systems.forEach((system) => {
      if (system.draw) {
        system.draw(ctx)
      }
    })
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

    this.draw()

    requestAnimationFrame(this.tick.bind(this))
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
    this.tick(0)
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
