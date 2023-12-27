import { loadSpritesheet, loadSpritesheetByName } from './loader.ts'

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

  public width: number
  public height: number
  public twidth: number
  public theight: number

  public cols: number
  public rows: number
  public cells: Grid2DCell[] = []

  constructor($container: HTMLDivElement, cols: number, rows: number, tsize: number) {
    //@todo make game dimensions configurable
    this.cols = cols
    this.rows = rows
    this.twidth = tsize
    this.theight = tsize / 2

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

  public async run() {
    console.log('RUN GAME')

    const spritesheetLoaderSuccessHandler = (spritesheet: any) => {
      console.log(`Spritesheet loaded from ${spritesheet.url}`)
      return spritesheet
    }

    this.spritesheets.push(
      //await loadSpritesheet('map_pack/map_pack.png'),
      await loadSpritesheet('/aaa_iso_buildings/aaa_iso_buildings.png').then(
        spritesheetLoaderSuccessHandler,
      ),
      //await loadSpritesheetByName('isometric_tiles_base').then(spritesheetLoaderSuccessHandler),
      await loadSpritesheetByName('isometric_blocks').then(spritesheetLoaderSuccessHandler),
      //await loadSpritesheetByName('isometric_minigolf').then(spritesheetLoaderSuccessHandler),
      await loadSpritesheetByName('isometric_modular_buildings').then(
        spritesheetLoaderSuccessHandler,
      ),
      await loadSpritesheetByName('isometric_modular_roads').then(spritesheetLoaderSuccessHandler),
      await loadSpritesheetByName('isometric_nature').then(spritesheetLoaderSuccessHandler),
      await loadSpritesheetByName('isometric_space_interior').then(spritesheetLoaderSuccessHandler),
      await loadSpritesheetByName('isometric_tiles_base').then(spritesheetLoaderSuccessHandler),
      await loadSpritesheetByName('isometric_tiles_buildings').then(
        spritesheetLoaderSuccessHandler,
      ),
      await loadSpritesheetByName('isometric_tiles_city').then(spritesheetLoaderSuccessHandler),
      //await loadSpritesheetByName('isometric_tiles_vehicles').then(spritesheetLoaderSuccessHandler),
      //await loadSpritesheet('isometric_watercraft').then(spritesheetLoaderSuccessHandler),
      await loadSpritesheetByName('isometric_vector_roads_base').then(
        spritesheetLoaderSuccessHandler,
      ),
      await loadSpritesheetByName('isometric_vector_roads_water').then(
        spritesheetLoaderSuccessHandler,
      ),
    )

    //start systems
    this.systems.forEach((system) => {
      if (system.start) {
        system.start()
      }
    })

    // start game loop
    this.draw()
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
