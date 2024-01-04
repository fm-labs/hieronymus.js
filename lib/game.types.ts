/** GAME ENGINE TYPES **/

interface IGame {
  $container: HTMLDivElement
  $canvas: HTMLCanvasElement
  spritesheets: HtmlSpritesheetImage[]
  width: number
  height: number

  // events
  eventbus: IEventBus

  // camera
  camera: Camera2D

  // grid
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

type GameConfig = {
  columns: number
  rows: number
}

interface IGameSystem {
  name: string
  onLoad?: () => void
  onUnload?: () => void
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
type GameAssetType = 'SPRITESHEET' | 'TILESET' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'FONT'

type SpritesheetItem = {
  id: number
  name: string
  x: number
  y: number
  width: number
  height: number
}

type GameAsset = {
  nextgid: number
  type: GameAssetType
  name: string
  src: string
}

type ImageAsset = GameAsset & {
  type: 'IMAGE'
}

type SpritesheetAsset = ImageAsset & {
  type: 'SPRITESHEET'
  sprites: SpritesheetItem[]
}

type TilesetAsset = ImageAsset & {
  type: 'TILESET'
  columns: number
  rows: number
}

type AudioAsset = GameAsset & {
  type: 'AUDIO'
}

type VideoAsset = GameAsset & {
  type: 'VIDEO'
}

type HtmlImage = {
  url: string
  image: HTMLImageElement
}

type HtmlSpritesheetImage = HtmlImage & {
  url: string
  sprites: SpritesheetItem[]
}

type HtmlTilesetImage = HtmlImage & {
  url: string
}

type HtmlSpriteImage = HtmlImage & {
  url: string
  sprite: SpritesheetItem
}

/** INPUT TYPES **/

type GamepadInputEvent = {
  name: string
}

type GamepadStickChangeEvent = GamepadInputEvent & {
  name: 'gamepad.stick_change'
  stickLeft: boolean
  stickRight: boolean
  stickUp: boolean
  stickDown: boolean
}

type GamepadButtonChangeEvent = GamepadInputEvent & {
  name: 'gamepad.button_change'
  button: number
  state: ButtonState
}

type ButtonState = 'pressed' | 'released'

type MoveDirection = 'up' | 'down' | 'left' | 'right'

/** CAMERA TYPES **/

type Camera2D = {
  offset: Point2D
  width: number
  height: number
  zoom: number
  //depth: number
  //angle: number
}

type Point2D = {
  x: number
  y: number
}
