interface IGame {
  $container: HTMLDivElement
  $canvas: HTMLCanvasElement
  spritesheets: SpritesheetImage[]
  width: number
  height: number
  twidth: number
  theight: number
  cols: number
  rows: number
  cells: Grid2DCell[]
  //getTileIndexFromCoords: (x: number, y: number) => number
  run: () => void
  draw: () => void
}

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

type Grid2DCell = {
  col: number
  row: number
  props?: any
  color: string
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
