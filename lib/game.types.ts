/** GAME ENGINE **/

type GameConfig = {
  id: string
  name?: string
}

interface IGame {
  $container: HTMLDivElement
  //$canvas: HTMLCanvasElement

  // config
  config: GameConfig

  // resources
  resources: IGameResources

  // scene
  mainScene?: IScene

  // events
  eventbus: IEventBus

  // camera & projection
  camera: Camera2D
  width: number
  height: number

  // systems
  run: () => void | Promise<void>
  tick: (deltaTime: number) => void | Promise<void>
  //draw: () => void | Promise<void>

  // fps
  fps: number
  frameCount: number
  lastFrameTime: number
  deltaTime: number
}

interface IGameSystem {
  name: string
  onLoad?: () => void
  onUnload?: () => void
  start?: () => void
  stop?: () => void
  tick?: (deltaTime: number) => void
  draw?: (ctx: CanvasRenderingContext2D) => void
}

interface IScene {
  name: string
}

interface ISceneManager {
  addScene(scene: IScene): void
  getScene(name: string): IScene | undefined
  removeScene(name: string): void
  setActiveScene(name: string): void
  getActiveScene(): IScene | undefined
}

/** EVENTS **/

interface IEventBus {
  on: (eventName: string, callback: (e: any) => void) => void
  off: (eventName: string, callback: (e: any) => void) => void
  emit: (eventName: string, e: any) => void
}

/** GRID **/

type Grid2DPosition = {
  col: number
  row: number
}

type Grid2DCell = Grid2DPosition & {
  //col: number
  //row: number
  props?: any
}

type Screen2DPosition = {
  x: number
  y: number
}

type Grid2DPoint = [number, number]
type Screen2DPoint = [number, number]

interface IGrid2DProjection {
  mapGridToScreen(col: number, row: number): { x: number; y: number }
  mapScreenToGrid(x: number, y: number): { col: number; row: number }
  getGridDimensions(): { width: number; height: number }
}

/** TILE MAP **/

type TileMapConfig = {
  columns: number
  rows: number
  tileSize: number
  projection: 'orthogonal' | 'isometric' | 'dimetric'
}

type TileMapLayer = {
  name: string
  type: 'TILELAYER' | 'OBJECTLAYER' | 'BACKGROUND' | 'IMAGELAYER' | 'OVERLAY'
  data: TileMapLayerData[]
  locked?: boolean
  visible?: boolean
}

type TileMapLayerData = number

type TileMapDump = {
  columns: number
  rows: number
  tileWidth: number
  tileHeight: number
  layers: TileMapLayer[]
  objects: TileMapLayerData[][]
  entities: { [key: number]: GameEntity }
}

interface ITileMap {
  columns: number
  rows: number
  tileWidth: number
  tileHeight: number

  projection: IGrid2DProjection

  entities: IEntityManager
  layers: TileMapLayer[]
  objects: TileMapLayerData[][]

  addTile(layerId: number, col: number, row: number, properties: GameComponentProperties): void
  setTile(layerId: number, col: number, row: number, tile: IGameComponent): void
  getTile(layerId: number, col: number, row: number): IGameComponent | undefined

  addObject(layerId: number, obj: IGameComponent): void
  addObjectAt(layerId: number, col: number, row: number, obj: IGameComponent): void
  getObject(layerId: number, id: number): IGameComponent | undefined
  updateObject(layerId: number, id: number, obj: IGameComponent): void

  dump(): TileMapDump
  restore(dump: TileMapDump): void
}

type GameComponentData = {
  [key: string]: any
}

type GameComponentProperties = {
  x?: number
  y?: number
  name?: string
  //[key: string]: any
  data?: GameComponentData
}

interface IGameComponent {
  properties?: GameComponentProperties
  setPosition: (x: number, y: number) => void
  update?: (deltaTime: number) => void | boolean
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
  url: string
}

type FontAsset = GameAsset & {
  type: 'FONT'
  name: string
  url: string
}

type ImageAsset = GameAsset & {
  type: 'IMAGE'
  name: string
  url: string
}

type SpritesheetAsset = ImageAsset & {
  type: 'SPRITESHEET'
  name: string
  url: string
  //sprites: SpritesheetItem[]
}

type TilesetAsset = SpritesheetAsset & {
  type: 'TILESET'
  name: string
  url: string
  //sprites: SpritesheetItem[]
}

type AudioAsset = GameAsset & {
  type: 'AUDIO'
  name: string
  url: string
}

/** RESOURCE TYPES **/

type GameResourceType =
  | 'SPRITESHEET'
  | 'TILESET'
  | 'SPRITE'
  | 'TILE'
  | 'IMAGE'
  | 'AUDIO'
  | 'VIDEO'
  | 'FONT'

type GameResource = {
  type: GameResourceType
  $element: HTMLElement
}

type ImageResource = GameResource & {
  type: 'IMAGE'
  $element: HTMLImageElement
}

type SpritesheetResource = GameResource & {
  type: 'SPRITESHEET'
  $element: HTMLImageElement
  name: string
  sprites: SpritesheetItem[]
}

type TilesetResource = GameResource & {
  type: 'TILESET'
  $element: HTMLImageElement
  name: string
  tileWidth: number
  tileHeight: number
  columns: number
  rows: number
  //count?: number
}

type SpriteResource = GameResource & {
  type: 'SPRITE'
  $element: HTMLImageElement
  sprite: SpritesheetItem
}

type AudioResource = GameResource & {
  type: 'AUDIO'
  $element: HTMLImageElement
}

type VideoResource = GameResource & {
  type: 'VIDEO'
  $element: HTMLImageElement
}

type FontResource = GameResource & {
  type: 'FONT'
  $font: FontFace
}

/** RESOURCE TYPES **/

interface IGameResources {
  spritesheets: (SpritesheetResource | TilesetResource)[] // @TODO: remove from interface. Use getter instead.
  sprites: SpriteResource[] // @TODO: remove from interface. Use getter instead.
  loadFont(name: string, url: string): Promise<void>
  loadHtmlImage(url: string): Promise<HTMLImageElement>
  loadSpritesheet(name: string, url: string, nextgid?: number): Promise<void>
  loadTileset(
    name: string,
    url: string,
    columns: number,
    rows: number,
    nextgid?: number,
  ): Promise<void>
  loadKenneySpritesheet(name: string, nextgid?: number): Promise<void>
  getSprite(gid: number): SpriteResource | undefined
  getSpritesheet(name: string): SpritesheetResource | TilesetResource | undefined
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
  //width: number
  //height: number
  zoom: number
  //depth: number
  //angle: number
}

type Point2D = {
  x: number
  y: number
}
