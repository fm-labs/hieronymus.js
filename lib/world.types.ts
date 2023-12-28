interface WorldBuilderProps {
  name: string
  label?: string
  width: number
  height: number
  cells?: WorldCell[]
  resources?: WorldResources
}

type WorldBuilder = (props: WorldBuilderProps) => World

type WorldInstanceType = World & {
  getCell: (x: number, y: number) => WorldCell | undefined
  setCell(cell: WorldCell): void
  setCells: (cells: WorldCell[]) => void
  setCellLayer(cell: WorldCell, layer: WorldCellLayer): void
  tick(): void
  start(): void
  stop(): void
}

interface WorldViewerProps {
  world: WorldInstanceType
  renderProps: WorldRenderProps
}

interface WorldEditorProps extends WorldViewerProps {
  editMode?: string
  onRenderPropsChange?: (props: WorldRenderProps) => void
  onWorldChange?: (world: World) => void
}

type World = WorldBuilderProps & {
  cells: WorldCell[]
}

type WorldCellType = 'default' | string

type WorldCell = {
  type?: WorldCellType
  x: number
  y: number
  alive: boolean
  properties?: any
  //tick?: (cell: WorldCell, world: World) => void
  sprite?: Sprite //@deprecated
  layers?: WorldCellLayer[]
}

type WorldCellLayer = {
  idx: number
  //label?: string
  fillColor?: string
  strokeColor?: string
  sprite?: Sprite
  //properties?: any
}

type WorldCellSelection = Point[]

// type StandardCell = WorldCell & { type: "STANDARD" }
// type VirtualCell = WorldCell & { type: "VIRTUAL" }

interface WorldRendererProps extends WorldRenderProps {
  world: World
  resources: WorldResources
}

interface WorldResources {
  backgroundImage?: string
  spritesheets?: Spritesheet[]
  //images?: ImageSprite[]
}

interface WorldRenderProps {
  rendererName: string
  cellSize: number
  canvasWidth: number
  canvasHeight: number
  camera?: Camera
  backgroundImage?: string
  //spritesheets?: Spritesheet[]
}

type WorldConfig = {
  world: WorldBuilderProps
  render: WorldRenderProps
}

type Spritesheet = {
  name: string
  image: string
  sprites: Sprite[]
  styles?: string
}

type Sprite = {
  spriteSheet?: string
  name: string
  x: number
  y: number
  width: number
  height: number
}

type ImageSprite = Sprite & {
  image: HTMLImageElement
}
