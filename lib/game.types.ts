/** GAME ENGINE TYPES **/

interface IGame {
  $container: HTMLDivElement
  $canvas: HTMLCanvasElement
  spritesheets: SpritesheetImage[]
  width: number
  height: number

  // events
  eventbus: IEventBus

  // @todo move to Grid2D renderer
  cols: number
  rows: number
  cells: Grid2DCell[]

  run: () => void
  tick: (deltaTime: number) => void
  draw: () => void

  // fps
  fps: number
  frameCount: number
  lastFrameTime: number
  deltaTime: number
}

interface IGameSystem {
  name: string
  onLoad?: (game: IGame) => void
  onUnload?: (game: IGame) => void
  start?: () => void
  stop?: () => void
  update?: (deltaTime: number) => void
  draw?: (ctx: CanvasRenderingContext2D) => void
}

/** EVENT TYPES **/

interface IEventBus {
  on: (eventName: string, callback: (e: any) => void) => void
  off: (eventName: string, callback: (e: any) => void) => void
  emit: (eventName: string, e: any) => void
}

/** GRID TYPES **/

type Grid2DCell = {
  col: number
  row: number
  props?: any
  color: string
}

interface IGrid2DProjection {
  mapGridToScreen(col: number, row: number): { x: number; y: number }
  mapScreenToGrid(x: number, y: number): { col: number; row: number }
}

/** ASSET TYPES **/

type AssetImage = {
  url: string
  image: HTMLImageElement
}

type SpritesheetImage = {
  url: string
  sprites: any[]
  image: HTMLImageElement
}

type SpriteInfo = {
  name?: string
  x: number
  y: number
  width: number
  height: number
}

type SpriteImage = {
  url: string
  sprite: SpriteInfo
  image: HTMLImageElement
}

/** INPUT TYPES **/

type GamepadInputEvent = {}

type GamepadStickChangeEvent = GamepadInputEvent & {
  stickLeft: boolean
  stickRight: boolean
  stickUp: boolean
  stickDown: boolean
}

type GamepadButtonChangeEvent = GamepadInputEvent & {
  button: number
  state: ButtonState
}

type ButtonState = 'pressed' | 'released'

type MoveDirection = 'up' | 'down' | 'left' | 'right'
