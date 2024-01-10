import { AbstractBaseEntity } from './AbstractBaseEntity.ts'

interface SpriteEntityProps extends GameEntityProperties {
  x: 0
  y: 0
  tileSize: 0
  spriteImage: undefined
}

export class SpriteEntity extends AbstractBaseEntity implements IGameEntity {
  public static readonly defaultProperties: GameEntityProperties = {
    x: 0,
    y: 0,
    tileSize: 0,
    spriteImage: undefined,
  }

  public readonly name: string

  constructor(properties: SpriteEntityProps) {
    properties = properties || {}
    super({ ...SpriteEntity.defaultProperties, ...properties })
    this.name = properties.name || 'SpriteEntity'
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const x = this.properties.x
    const y = this.properties.y
    const spriteImage = this.properties.spriteImage
    const tsize = this.properties.tileSize

    ctx.save()

    //const spriteImage = this.game.resources.sprites[spriteIdx]
    if (!spriteImage) {
      console.log(`No sprite image selected`)
      return
    }
    console.log('spriteImage', spriteImage)

    const sprite = spriteImage.sprite
    const spriteCanvas = document.createElement('canvas')
    spriteCanvas.width = sprite.width
    spriteCanvas.height = sprite.height
    const spriteCanvasCtx = spriteCanvas.getContext('2d')!
    spriteCanvasCtx.drawImage(
      spriteImage.image,
      sprite.x,
      sprite.y,
      sprite.width,
      sprite.height,
      0,
      0,
      sprite.width,
      sprite.height,
    )

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

    ctx.restore()
  }

  update(deltaTime: number): void {}
}
