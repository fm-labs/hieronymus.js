import { AbstractGameComponent } from './AbstractGameComponent.ts'
import GameAssets, { Sprite, Tilesheet } from '../kernel/GameAssets.ts'
import { drawElevation } from '../draw2d/drawelevation.ts'

const DEFAULT_SPEED = 1

export interface AnimatedSpriteComponentProps extends GameComponentProperties {
  tilesheetName?: string
  tileSize: number
  startIdx?: number
  endIdx?: number
  speed?: number
  loop?: number
  autoPlay?: boolean
  ttl?: number // Time to live in milliseconds
  elevation?: number // Elevation adjustment
}

export class AnimatedSpriteComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: AnimatedSpriteComponentProps

  public static readonly defaultProperties: Partial<AnimatedSpriteComponentProps> = {
    tileSize: 32,
    speed: DEFAULT_SPEED,
    loop: 0,
    autoPlay: true,
    elevation: 0,
  }

  public readonly componentType: string = 'AnimatedSprite'
  public readonly name: string

  private _spriteIdx: number = 0
  private _lastUpdate: number = 0

  private _tilesheet?: Tilesheet
  private _tilesheetImage?: HTMLImageElement

  constructor(properties: AnimatedSpriteComponentProps) {
    properties = properties || {}
    super({ ...AnimatedSpriteComponent.defaultProperties, ...properties })
    this.name = properties.name || 'AnimatedSpriteEntity'

    const tilesheetName = this.properties.tilesheetName
    this.applyTilesheet(tilesheetName)
  }

  protected applyTilesheet(tilesheetName: string | undefined): void {
    if (!tilesheetName) {
      this._tilesheet = undefined
      this._tilesheetImage = undefined
      return
    }

    const tilesheet = GameAssets.getTilesheet(tilesheetName)
    if (!tilesheet) {
      throw new Error(`Tilesheet with name ${tilesheetName} not found`)
    }
    this._tilesheet = tilesheet

    const tilesheetImage = GameAssets.getTilesheetImage(tilesheetName)
    if (!tilesheetImage) {
      throw new Error(`Tilesheet image for tilesheet with name ${tilesheetName} not found`)
    }
    this._tilesheetImage = tilesheetImage
  }

  draw(ctx: CanvasRenderingContext2D): void {
    //console.log('AnimatedSpriteComponent.draw')
    const x = this.x
    const y = this.y
    if (x === undefined || y === undefined) return
    if (!this._tilesheet || !this._tilesheetImage) return

    const tilesheet = this._tilesheet

    const spriteIdx = this._spriteIdx
    const col = spriteIdx % tilesheet.columns
    const row = Math.floor(spriteIdx / tilesheet.columns)

    const spriteX = col * tilesheet.tileWidth
    const spriteY = row * tilesheet.tileHeight

    const sprite: Sprite = {
      x: spriteX,
      y: spriteY,
      width: tilesheet.tileWidth,
      height: tilesheet.tileHeight,
      name: `sprite-${spriteIdx}`,
      imageName: this.properties.tilesheetName!, //tilesheetName is guaranteed to be defined
    }

    //console.log('sprite', sprite)

    const spriteCanvas = document.createElement('canvas')
    spriteCanvas.width = sprite.width
    spriteCanvas.height = sprite.height
    const spriteCanvasCtx = spriteCanvas.getContext('2d')!
    spriteCanvasCtx.drawImage(
      this._tilesheetImage,
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

    const centerX = x
    const centerY = y + this.properties.tileSize / 2 / 2

    // draw a center dot
    // ctx.fillStyle = 'blue'
    // ctx.beginPath()
    // ctx.arc(centerX, centerY, 4, 0, Math.PI * 2)
    // ctx.fill()

    const elevation = this.properties.elevation || 0
    drawElevation(ctx, elevation, centerX, centerY)

    const _x = x - imgW / 2
    const _y = y - imgH + theight - elevation

    ctx.drawImage(spriteCanvas, 0, 0, sprite.width, sprite.height, _x, _y, imgW, imgH)

    //ctx.globalAlpha = 0.5
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'
    ctx.lineWidth = 1
    //ctx.strokeRect(x + offsetX, y + offsetY, imgW, imgH)
    ctx.strokeRect(_x, _y, imgW, imgH)
    ctx.save()
    //ctx.setTransform(1, 0, 0, 1, 0, 0) // Reset the transformation matrix to the identity matrix
    ctx.resetTransform()
    ctx.restore()
    //ctx.globalAlpha = 1

    //ctx.restore()
  }

  update(deltaTime: number): void | boolean | null {
    if (!this._tilesheet || !this._tilesheetImage) return

    const cols = this._tilesheet.columns
    const rows = this._tilesheet.rows
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
