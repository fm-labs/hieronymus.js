import { AbstractGameComponent } from './AbstractGameComponent.ts'

interface SpriteComponentProps extends GameComponentProperties {
  tileSize: number
  spriteImage?: SpriteResource
}

export class SpriteComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: SpriteComponentProps

  public static readonly defaultProperties: SpriteComponentProps = {
    x: 0,
    y: 0,
    tileSize: 0,
    spriteImage: undefined,
  }

  public readonly componentType: string = 'Sprite'
  public readonly name: string

  private _rendered: boolean = false
  private _spriteCanvas: HTMLCanvasElement

  constructor(properties: SpriteComponentProps) {
    properties = properties || {}
    super({ ...SpriteComponent.defaultProperties, ...properties })
    this.name = properties.name || 'SpriteEntity'

    const spriteImage = this.properties.spriteImage
    this._spriteCanvas = document.createElement('canvas')

    //ctx.save()

    //const spriteImage = this.game.resources.sprites[spriteIdx]
    if (!spriteImage) {
      throw new Error(`No sprite image selected`)
    }
    //console.log('spriteImage', spriteImage)

    const sprite = spriteImage.sprite
    this._spriteCanvas.width = sprite.width
    this._spriteCanvas.height = sprite.height
    const spriteCanvasCtx = this._spriteCanvas.getContext('2d')!
    spriteCanvasCtx.drawImage(
      spriteImage.$element,
      sprite.x,
      sprite.y,
      sprite.width,
      sprite.height,
      0,
      0,
      sprite.width,
      sprite.height,
    )
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this._rendered) return

    const x = this.properties.x
    const y = this.properties.y
    if (x === undefined || y === undefined) return

    const tsize = this.properties.tileSize
    const twidth = tsize
    const theight = tsize / 2
    const ratio = this._spriteCanvas.width / this._spriteCanvas.height
    const imgW = Math.min(this._spriteCanvas.width, twidth)
    const imgH = imgW / ratio

    // adjust width to fit the tile
    // if (ratio < 1) {
    //   imgW = twidth
    //   imgH = imgW / (twidth / sprite.height)
    // }

    //console.log('sprite', cellIdx, spriteIdx, ratio, imgW, imgH)

    const offsetX = -(imgW / 2)
    const offsetY = -imgH + theight

    //ctx.globalAlpha = 0.7
    ctx.drawImage(
      this._spriteCanvas,
      0,
      0,
      this._spriteCanvas.width,
      this._spriteCanvas.height,
      x + offsetX,
      y + offsetY,
      imgW,
      imgH,
    )
    //ctx.globalAlpha = 1

    //ctx.restore()
    //this._rendered = true
  }

  update(deltaTime: number): void {}
}
