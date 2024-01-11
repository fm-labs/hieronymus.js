import { AbstractBaseComponent } from './AbstractBaseComponent.ts'

const DEFAULT_SPEED = 1

interface AnimatedSpriteComponentProps extends GameComponentProperties {
  tileSize: number
  tileset: TilesetResource
  startIdx?: number
  endIdx?: number
  speed?: number
  loop?: number
  autoPlay?: boolean
}

export class AnimatedSpriteComponent extends AbstractBaseComponent implements IGameComponent {
  declare properties: AnimatedSpriteComponentProps

  public static readonly defaultProperties: Partial<AnimatedSpriteComponentProps> = {
    x: 0,
    y: 0,
    tileSize: 32,
    speed: DEFAULT_SPEED,
    loop: 0,
    autoPlay: true,
  }

  public readonly name: string

  private _spriteIdx: number = 0
  private _lastUpdate: number = 0

  constructor(properties: AnimatedSpriteComponentProps) {
    properties = properties || {}
    super({ ...AnimatedSpriteComponent.defaultProperties, ...properties })
    this.name = properties.name || 'AnimatedSpriteEntity'
  }

  draw(ctx: CanvasRenderingContext2D): void {
    //console.log('AnimatedSpriteComponent.draw')
    const x = this.properties.x
    const y = this.properties.y
    if (x === undefined || y === undefined) return

    const tileset = this.properties.tileset

    const spriteIdx = this._spriteIdx
    const col = spriteIdx % tileset.columns
    const row = Math.floor(spriteIdx / tileset.columns)

    const spriteX = col * tileset.tileWidth
    const spriteY = row * tileset.tileHeight

    const sprite: SpritesheetItem = {
      id: spriteIdx,
      x: spriteX,
      y: spriteY,
      width: tileset.tileWidth,
      height: tileset.tileHeight,
      name: `sprite-${spriteIdx}`,
    }

    //console.log('sprite', sprite)

    const spriteCanvas = document.createElement('canvas')
    spriteCanvas.width = sprite.width
    spriteCanvas.height = sprite.height
    const spriteCanvasCtx = spriteCanvas.getContext('2d')!
    spriteCanvasCtx.drawImage(
      tileset.$element,
      sprite.x,
      sprite.y,
      sprite.width,
      sprite.height,
      0,
      0,
      sprite.width,
      sprite.height,
    )

    const tsize = this.properties.tileSize
    const twidth = tsize
    const theight = tsize / 2
    const ratio = sprite.width / sprite.height
    const imgW = Math.min(sprite.width, twidth)
    const imgH = imgW / ratio

    // adjust width to fit the tile
    // if (ratio < 1) {
    //   imgW = twidth
    //   imgH = imgW / (twidth / sprite.height)
    // }

    //console.log('sprite', cellIdx, spriteIdx, ratio, imgW, imgH)

    const offsetX = -(imgW / 2)
    const offsetY = -imgH + theight

    //ctx.globalAlpha = 0.5
    ctx.drawImage(
      spriteCanvas,
      0,
      0,
      sprite.width,
      sprite.height,
      x + offsetX,
      y + offsetY,
      imgW,
      imgH,
    )
    //ctx.globalAlpha = 1

    //ctx.restore()
  }

  update(deltaTime: number): void | boolean {
    const cols = this.properties.tileset.columns
    const rows = this.properties.tileset.rows
    const speed = this.properties.speed || DEFAULT_SPEED
    const startIdx = this.properties.startIdx || 0
    const endIdx = this.properties.endIdx || cols * rows
    const autoPlay = this.properties.autoPlay || true
    const loop = this.properties.loop || true

    const now = Date.now()
    if (now - this._lastUpdate < 100 / speed) {
      return false
    }

    //console.log('AnimatedSpriteComponent.update', deltaTime)
    this._spriteIdx++
    if (this._spriteIdx >= endIdx) {
      this._spriteIdx = startIdx
    }

    this._lastUpdate = now
    return true
  }
}
