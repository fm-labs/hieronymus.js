import type { Camera2D, Point2D } from './game.types'
export interface WorldBuilderProps {
  name: string
  label?: string
  width: number
  height: number
  cells?: WorldCell[]
  resources?: WorldResources
}

export type WorldBuilder = (props: WorldBuilderProps) => World

export type WorldInstanceType = World & {
  getCell: (x: number, y: number) => WorldCell | undefined
  setCell(cell: WorldCell): void
  setCells: (cells: WorldCell[]) => void
  setCellLayer(cell: WorldCell, layer: WorldCellLayer): void
  tick(): void
  start(): void
  stop(): void
}

export interface WorldViewerProps {
  world: WorldInstanceType
  renderProps: WorldRenderProps
}

export interface WorldEditorProps extends WorldViewerProps {
  editMode?: string
  onRenderPropsChange?: (props: WorldRenderProps) => void
  onWorldChange?: (world: World) => void
}

export type World = WorldBuilderProps & {
  cells: WorldCell[]
}

export type WorldCellType = 'default' | string

export type WorldCell = {
  type?: WorldCellType
  x: number
  y: number
  alive: boolean
  properties?: any
  //tick?: (cell: WorldCell, world: World) => void
  sprite?: any //Sprite //@deprecated
  layers?: WorldCellLayer[]
}

export type WorldCellLayer = {
  idx: number
  //label?: string
  fillColor?: string
  strokeColor?: string
  sprite?: any //Sprite
  //properties?: any
}

export type WorldCellSelection = Point2D[]

// type StandardCell = WorldCell & { type: "STANDARD" }
// type VirtualCell = WorldCell & { type: "VIRTUAL" }

export interface WorldRendererProps extends WorldRenderProps {
  world: World
  resources: WorldResources
}

export interface WorldResources {
  backgroundImage?: string
  //spritesheets?: Spritesheet[]
  //images?: ImageSprite[]
}

export interface WorldRenderProps {
  rendererName: string
  cellSize: number
  canvasWidth: number
  canvasHeight: number
  camera?: Camera2D
  backgroundImage?: string
  //spritesheets?: Spritesheet[]
}

export type WorldConfig = {
  world: WorldBuilderProps
  render: WorldRenderProps
}
