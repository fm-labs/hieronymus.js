const DEFAULT_SPRITE_SHEET_NAME = 'map_pack'

const defaultCamera: Camera2D = {
  offset: { x: 0, y: 0 },
  zoom: 1,
  width: 800,
  height: 600,
}

const defaultCellRenderer2d = (
  ctx: CanvasRenderingContext2D,
  cell: WorldCell,
  x: number,
  y: number,
  cellSize: number,
) => {
  ctx.beginPath()
  ctx.rect(x, y, cellSize, cellSize)
  ctx.fillStyle = cell.alive ? '#000' : '#fff'
  ctx.fill()
  ctx.strokeStyle = '#ddd'
  ctx.stroke()
}

const coloredCellRenderer2d = (
  ctx: CanvasRenderingContext2D,
  cell: WorldCell,
  x: number,
  y: number,
  cellSize: number,
) => {
  ctx.beginPath()
  ctx.rect(x, y, cellSize, cellSize)
  ctx.fillStyle = '#173bc9'
  ctx.fill()
  ctx.strokeStyle = '#44d5b1'
  ctx.stroke()
}

const blinkingCellRenderer2d = (
  ctx: CanvasRenderingContext2D,
  cell: WorldCell,
  x: number,
  y: number,
  cellSize: number,
) => {
  const colors = ['#173bc9', '#c917a5', '#38c917', '#c91717']
  const color = colors[Math.floor(Math.random() * colors.length)]
  const color2 = colors[Math.floor(Math.random() * colors.length)]

  ctx.beginPath()
  ctx.rect(x, y, cellSize, cellSize)
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = color2
  ctx.stroke()
}

// const cellRendererMap: Record<string, WorldCellRenderer> = {
//   default: defaultCellRenderer2d,
//   colored: coloredCellRenderer2d,
//   blinking: blinkingCellRenderer2d,
// }

const getCellRenderer = (cell: WorldCell) => {
  const cellType = cell.type || 'default'
  //const cellRenderer = cellRendererMap[cellType]
  const cellRenderer = defaultCellRenderer2d
  if (!cellRenderer) {
    console.warn(`Cell renderer for cell type "${cellType}" not found`)
    return defaultCellRenderer2d
  }
  return cellRenderer
}

// Now, the TypeScript class:
export class WorldRenderer2d {
  private ctx: CanvasRenderingContext2D
  private world: World
  private props: WorldRenderProps
  private camera: Camera2D
  private player: Point2D
  private images: Record<string, HTMLImageElement> = {}
  //private layers: Record<string, HTMLCanvasElement> = {};
  private selection: WorldCellSelection = []

  private lastTick: number = 0

  constructor(
    canvas: HTMLCanvasElement,
    world: World,
    props: WorldRenderProps,
    images?: Record<string, HTMLImageElement>,
  ) {
    this.ctx = canvas.getContext('2d')!
    this.world = world
    this.props = props
    this.camera = this.props.camera || defaultCamera

    this.images = images || {}

    this.player = { x: 0, y: 0 }

    console.log('WORLD RENDERER', world, props)
  }

  public setRenderProps(props: WorldRenderProps) {
    this.props = props
    this.camera = this.props.camera || this.camera || defaultCamera
  }

  public setSelection(selection: WorldCellSelection) {
    this.selection = selection
  }

  public setPlayer(player: Point2D) {
    this.player = player
  }

  public getPlayer() {
    return this.player
  }

  private drawBackground() {
    //this.ctx.drawImage(this.bg, 0, 0, this.props.canvasWidth, this.props.canvasHeight);
  }

  private drawGrid() {
    const cellSize = this.props.cellSize
    const width = this.world.width * cellSize
    const height = this.world.height * cellSize
    this.ctx.beginPath()
    for (let x = 0; x <= width; x += cellSize) {
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, height)
    }
    for (let y = 0; y <= height; y += cellSize) {
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(width, y)
    }
    this.ctx.strokeStyle = '#ddd'
    this.ctx.stroke()
  }

  // private drawSprite(sprite: Spritesheet, x: number, y: number, cellSize: number) {
  //   const spriteSheetName = sprite.spriteSheet || DEFAULT_SPRITE_SHEET_NAME
  //   if (!spriteSheetName) {
  //     console.warn(`Sprite sheet for sprite "${sprite.name}:${sprite.spriteSheet}" not found`)
  //     return
  //   }
  //   const spriteSheetEl = this.images[spriteSheetName]
  //   if (spriteSheetEl) {
  //     this.ctx.drawImage(
  //       spriteSheetEl,
  //       sprite.x,
  //       sprite.y,
  //       sprite.width,
  //       sprite.height,
  //       x,
  //       y,
  //       cellSize,
  //       cellSize,
  //     )
  //   } else {
  //     console.warn(`Sprite sheet element for "${spriteSheetName}" not found`)
  //   }
  // }

  private drawCell(cell: WorldCell) {
    const cellSize = this.props.cellSize
    const x = cell.x * cellSize
    const y = cell.y * cellSize

    const savedAlpha = this.ctx.globalAlpha // Save original alpha
    this.ctx.globalAlpha = 0.5 // 50% transparency

    const cellRenderer = getCellRenderer(cell)
    cellRenderer(this.ctx, cell, x, y, cellSize)

    // this.ctx.beginPath();
    // this.ctx.rect(x, y, cellSize, cellSize);
    // this.ctx.fillStyle = cell.alive ? '#000' : '#fff';
    // this.ctx.fill();
    // this.ctx.strokeStyle = '#ddd';
    // this.ctx.stroke();

    // Draw the sprite on the canvas
    // if (cell.sprite) {
    //   this.drawSprite(cell.sprite, x, y, cellSize);
    // }

    // Draw the cell layers on the canvas
    if (cell.layers) {
      cell.layers.forEach((layer) => {
        if (layer?.sprite) {
          //@todo this.drawSprite(layer.sprite, x, y, cellSize)
        }
      })
    }

    this.ctx.globalAlpha = savedAlpha // Restore original alpha
  }

  private drawCells() {
    this.world.cells.forEach((cell) => this.drawCell(cell))
  }

  private drawPlayer() {
    const playerSize = 32
    const x = this.player.x
    const y = this.player.y
    this.ctx.beginPath()
    this.ctx.rect(x, y, playerSize, playerSize)
    this.ctx.arc(
      x + playerSize / 2,
      y + playerSize / 2 - playerSize,
      playerSize / 2,
      0,
      2 * Math.PI,
    )
    this.ctx.fillStyle = '#ff0000'
    this.ctx.fill()
    this.ctx.closePath()
  }

  private drawSelection() {
    this.selection.forEach((point) => {
      const cellSize = this.props.cellSize
      const x = point.x * cellSize
      const y = point.y * cellSize
      this.ctx.beginPath()
      this.ctx.rect(x, y, cellSize, cellSize)
      this.ctx.fillStyle = 'rgba(27,215,37,0.29)'
      this.ctx.fill()
      this.ctx.strokeStyle = '#ddd'
      this.ctx.stroke()
    })
  }

  public clearCanvas() {
    this.ctx.clearRect(0, 0, this.props.canvasWidth, this.props.canvasHeight)
  }

  public draw() {
    this.camera = this.props.camera || defaultCamera
    const scaleFactor = this.camera.zoom

    this.clearCanvas()
    this.ctx.save()
    this.ctx.translate(this.camera.offset.x, this.camera.offset.y)
    this.ctx.scale(scaleFactor, scaleFactor)
    this.drawBackground()
    this.drawGrid()
    this.drawCells()
    //this.drawPlayer()
    this.drawSelection()
    this.ctx.restore()
  }

  public tick(time: number) {
    this.lastTick = time
    console.log('TICK')
    //this.drawCells()
    //this.drawPlayer()
  }
}
