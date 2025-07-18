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
  tick?: (deltaTime: number) => Promise<void>
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
  type: 'TILE' | 'OBJECT' //| 'BACKGROUND' | 'IMAGELAYER' | 'OVERLAY'
  data: TileMapLayerData[]
  locked?: boolean
  visible?: boolean
}

type TileMapLayerData = number

type TileMapDump = {
  config: TileMapConfig
  resources: any
  layers: TileMapLayer[]
  components: { id: number; componentType: string; properties: GameComponentProperties }[]
}

interface ITileMap {
  columns: number
  rows: number
  tileWidth: number
  tileHeight: number

  projection: IGrid2DProjection

  components: IComponentManager
  layers: TileMapLayer[]
  //objects: TileMapLayerData[][]

  /**
   * Creates a tile at the specified layer, column, and row with the given properties.
   * @param layerId - The ID of the layer to add the tile to.
   * @param col - The column index of the tile.
   * @param row - The row index of the tile.
   * @param properties - Partial properties for the tile.
   * @returns The component ID of the created tile.
   * @deprecated Use assignTile instead
   */
  createTile(layerId: number, col: number, row: number, properties: GameComponentProperties): number // returns componentId

  /**
   * @param layerId
   * @param col
   * @param row
   * @param obj
   */
  addTile(layerId: number, col: number, row: number, obj: IGameComponent): number // returns componentId
  assignTile(layerId: number, col: number, row: number, componentId: number): void
  getTile(layerId: number, col: number, row: number): IGameComponent | undefined
  resetTile(layerId: number, col: number, row: number): void

  //addObject(layerId: number, obj: IGameComponent): number // returns componentId
  addObjectAtGridPos(layerId: number, col: number, row: number, obj: IGameComponent): number // returns componentId
  //getObject(layerId: number, id: number): IGameComponent | undefined
  //updateObject(layerId: number, id: number, obj: IGameComponent): void
  removeObject(layerId: number, componentId: number): void

  dump(): TileMapDump
  //restore(dump: TileMapDump): void
}

type GameComponentProperties = {
  name?: string
  ttl?: number // time to live in seconds
  [key: string]: any
}

interface IGameComponent {
  componentType: string
  x: number
  y: number
  properties?: GameComponentProperties
  update?: (deltaTime: number) => void | boolean | null
  draw?: (ctx: CanvasRenderingContext2D) => void
  setPosition: (x: number, y: number) => void
}

interface IComponentManager {
  add(component: IGameComponent, nextId?: number): number
  set(id: number, component: IGameComponent): void
  get(id: number): IGameComponent | undefined
}

/** SPRITESHEET ATLAS **/
type SpritesheetAtlas = {
  sprites: SpritesheetAtlasItem[]
}

type SpritesheetAtlasItem = {
  id: number
  name: string
  x: number
  y: number
  width: number
  height: number
}

// /** ASSET TYPES **/
// type GameAssetType = 'SPRITESHEET' | 'TILESET' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'FONT'
//
// type GameAsset = {
//   nextgid: number
//   type: GameAssetType
//   name: string
//   url: string
// }
//
// type FontAsset = GameAsset & {
//   type: 'FONT'
//   name: string
//   url: string
// }
//
// type ImageAsset = GameAsset & {
//   type: 'IMAGE'
//   name: string
//   url: string
// }
//
// type SpritesheetAsset = ImageAsset & {
//   type: 'SPRITESHEET'
//   name: string
//   url: string
//   //sprites: SpritesheetItem[]
// }
//
// type TilesheetAsset = SpritesheetAsset & {
//   type: 'TILESET'
//   name: string
//   url: string
//   //sprites: SpritesheetItem[]
// }
//
// type AudioAsset = GameAsset & {
//   type: 'AUDIO'
//   name: string
//   url: string
// }

/** RESOURCE TYPES **/

// type GameResourceType =
//   | 'SPRITESHEET'
//   | 'TILESET'
//   | 'SPRITE'
//   | 'TILE'
//   | 'IMAGE'
//   | 'AUDIO'
//   | 'VIDEO'
//   | 'FONT'

// type GameResource = {
//   type: GameResourceType
//   $element: HTMLElement
// }
//
// type ImageResource = GameResource & {
//   type: 'IMAGE'
//   $element: HTMLImageElement
// }
//
// type SpritesheetResource = GameResource & {
//   type: 'SPRITESHEET'
//   $element: HTMLImageElement
//   name: string
//   sprites: SpritesheetItem[]
// }
//
// type TilesheetResource = GameResource & {
//   type: 'TILESET'
//   $element: HTMLImageElement
//   name: string
//   tileWidth: number
//   tileHeight: number
//   columns: number
//   rows: number
//   //count?: number
// }
//
// type SpriteResource = GameResource & {
//   type: 'SPRITE'
//   $element: HTMLImageElement
//   sprite: SpritesheetItem
// }

// type AudioResource = GameResource & {
//   type: 'AUDIO'
//   $element: HTMLImageElement
// }
//
// type VideoResource = GameResource & {
//   type: 'VIDEO'
//   $element: HTMLImageElement
// }
//
// type FontResource = GameResource & {
//   type: 'FONT'
//   $font: FontFace
// }

/** RESOURCE TYPES **/

interface IGameResources {
  loadFont(name: string, url: string): Promise<void>
  loadImage(name: string, url: string): Promise<HTMLImageElement>
  loadSpritesheet(name: string, imageUrl: string, atlasUrl: string, nextgid?: number): Promise<void>
  loadTilesheet(
    name: string,
    url: string,
    columns: number,
    rows: number,
    nextgid?: number,
  ): Promise<void>
  //getSprite(gid: number): SpriteResource | undefined
  //getSpritesheet(name: string): SpritesheetResource | TilesheetResource | undefined
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
