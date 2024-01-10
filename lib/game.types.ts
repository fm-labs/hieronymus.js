/** GAME ENGINE TYPES **/

interface IGame {
  $container: HTMLDivElement
  $canvas: HTMLCanvasElement

  resources: IGameResources

  // config
  config: GameConfig

  // events
  eventbus: IEventBus

  // camera & projection
  camera: Camera2D
  projection: IGrid2DProjection
  width: number
  height: number

  // grid
  //cols: number
  //rows: number

  // world
  worldMap: IWorldMap

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
  //columns: number
  //rows: number
  //tileSize: number
}

type WorldMapConfig = {
  columns: number
  rows: number
  tileSize: number
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

type Grid2DPosition = {
  col: number
  row: number
}

type Grid2DCell = Grid2DPosition & {
  //col: number
  //row: number
  props?: any
}

interface IGrid2DProjection {
  mapGridToScreen(col: number, row: number): { x: number; y: number }
  mapScreenToGrid(x: number, y: number): { col: number; row: number }
}

/** MAP TYPES **/

type WorldMapLayer = {
  name: string
  type: 'TILELAYER' | 'OBJECTLAYER' | 'BACKGROUND' | 'IMAGELAYER' | 'OVERLAY'
  data: WorldMapLayerData[]
  locked?: boolean
  visible?: boolean
}

type WorldMapLayerData = number

interface IWorldMap {
  columns: number
  rows: number
  tileWidth: number
  tileHeight: number

  entities: IEntityManager
  layers: WorldMapLayer[]
  objects: WorldMapLayerData[][]

  addTile(layerId: number, col: number, row: number, properties: GameComponentProperties): void
  setTile(layerId: number, col: number, row: number, tile: IGameComponent): void
  getTile(layerId: number, col: number, row: number): IGameComponent | undefined

  addObject(layerId: number, obj: IGameComponent): void
  addObjectAt(layerId: number, col: number, row: number, obj: IGameComponent): void
  getObject(layerId: number, id: number): IGameComponent | undefined
  updateObject(layerId: number, id: number, obj: IGameComponent): void

  serialize(): any
}

type GameComponentProperties = {
  //x: number
  //y: number
  [key: string]: any
}

interface IGameComponent {
  properties?: GameComponentProperties
  setPosition: (x: number, y: number) => void
  update?: (deltaTime: number) => void
  draw?: (ctx: CanvasRenderingContext2D) => void
}

type GameEntity = {
  id: number
  parentId?: number
  name?: string
  component: IGameComponent
}

interface IEntityManager {
  add(component: IGameComponent, nextId?: number): number
  set(id: number, entity: GameEntity): void
  get(id: number): GameEntity | undefined
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

/** RESOURCE TYPES **/

interface IGameResources {
  spritesheets: HtmlSpritesheetImage[]
  sprites: HtmlSpriteImage[]
  loadHtmlImage(url: string): Promise<HTMLImageElement>
  loadSpritesheet(url: string, nextgid?: number): Promise<void>
  loadKenneySpritesheet(name: string, nextgid?: number): Promise<void>
  getSprite(gid: number): HtmlSpriteImage | undefined
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
