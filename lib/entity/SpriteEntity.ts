import { AbstractBaseEntity } from './AbstractBaseEntity.ts'

export class SpriteEntity extends AbstractBaseEntity implements IGameEntity {
  public static readonly defaultProperties: GameProperties<SpriteEntity> = {
    x: 0,
    y: 0,
    spriteId: null,
  }

  public readonly name: string

  constructor(game: IGame, properties?: GameProperties<SpriteEntity>) {
    properties = properties || {}
    super(game, { ...SpriteEntity.defaultProperties, ...properties })
    this.name = properties.name || 'SpriteEntity'
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const x = this.properties.x
    const y = this.properties.y
    const spriteIdx = this.properties.spriteId

    ctx.save()

    const spriteImage = this.game.resources.sprites[spriteIdx]
    if (!spriteImage) {
      console.log(`Sprite not found: ${spriteIdx}`)
      return
    }

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

    const tsize = this.game.config.tileSize
    const twidth = tsize
    const theight = tsize / 2

    //const tpos = this.game.projection.mapGridToScreen(c, r)
    const ratio = sprite.width / sprite.height

    const imgW = Math.min(sprite.width, twidth)
    const imgH = imgW / ratio

    // adjust width to fit the tile
    // if (ratio < 1) {
    //   imgW = twidth
    //   imgH = imgW / (twidth / sprite.height)
    // }

    //console.log('sprite', cellIdx, spriteIdx, ratio, imgW, imgH)

    const offsetX = -(imgW / 2) - this.game.camera.offset.x
    const offsetY = -imgH + theight - this.game.camera.offset.y

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
