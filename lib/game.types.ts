/** GAME ENGINE TYPES **/

interface IGame {
  $container: HTMLDivElement
  $canvas: HTMLCanvasElement

  // config
  config: GameConfig

  // world
  worldMap: IWorldMap
  resources: IGameResources

  // events
  eventbus: IEventBus

  // camera & projection
  camera: Camera2D
  width: number
  height: number

  // systems
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
  name?: string
}

type WorldMapConfig = {
  columns: number
  rows: number
  tileSize: number
  projection: 'orthogonal' | 'isometric' | 'dimetric'
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

type Screen2DPosition = {
  x: number
  y: number
}

type Grid2DPoint = [number, number]
type Screen2DPoint = [number, number]

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

  projection: IGrid2DProjection

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

type GameResourceType = 'SPRITESHEET' | 'SPRITE' | 'TILE' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'FONT'

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
  sprites: SpritesheetItem[]
}

type TilesetResource = GameResource & {
  type: 'TILESET'
  $element: HTMLImageElement
  tileWidth: number
  tileHeight: number
  columns: number
  rows: number
  count: number
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
  spritesheets: SpritesheetResource[]
  sprites: SpriteResource[]
  loadFont(name: string, url: string): Promise<void>
  loadHtmlImage(url: string): Promise<HTMLImageElement>
  loadSpritesheet(url: string, nextgid?: number): Promise<void>
  loadKenneySpritesheet(name: string, nextgid?: number): Promise<void>
  getSprite(gid: number): SpriteResource | undefined
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
