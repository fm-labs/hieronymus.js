import type { GameComponentProperties, IGameComponent } from '../game.types'
import { AbstractGameComponent } from './AbstractGameComponent'
import GameAssets from '../kernel/GameAssets'

export interface IsoImageComponentProps extends GameComponentProperties {
  tileSize: number
  scale?: number
  imageName?: string
  orientation?: 'floor' | 'right-wall' | 'left-wall'
}

export class IsoImageComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoImageComponentProps

  public static readonly defaultProperties: IsoImageComponentProps = {
    tileSize: 0,
    scale: 1.0,
    orientation: 'floor',
  }

  public readonly componentType: string = 'Image'
  public readonly name: string

  private _rendered: boolean = false
  private _imageCanvas: HTMLCanvasElement
  private _image: HTMLImageElement

  constructor(properties: IsoImageComponentProps) {
    properties = properties || {}
    super({ ...IsoImageComponent.defaultProperties, ...properties })
    this.name = properties.name || 'ImageEntity'

    this._imageCanvas = document.createElement('canvas')

    const imageId = this.properties.imageName
    if (imageId === undefined) {
      console.warn(`imageId is required for ImageComponent`)
      throw new Error('imageId is required for ImageComponent')
    }

    // const imageImage = GameAssets.getImage(imageId)
    // if (!imageImage) {
    //   console.warn(`Image image element for image with id ${imageId} not found`)
    //   return
    // }

    //ctx.save()
    const img = GameAssets.getImage(imageId)
    if (!img) {
      console.warn(`Image with id ${imageId} not found`)
      throw new Error(`Image with id ${imageId} not found`)
    }
    this._image = img
    const imgW = img.width
    const imgH = img.height

    this._imageCanvas.width = img.width * 2
    this._imageCanvas.height = img.height

    // const ratio = image.width / image.height
    // this._imageCanvas.width = Math.min(this._imageCanvas.width, this.properties.tileSize)
    // this._imageCanvas.height = image.width / ratio
    const imageCanvasCtx = this._imageCanvas.getContext('2d')!

    let u, v
    if (this.properties.orientation === 'right-wall') {
      // right wall, experimental
      u = { x: imgW, y: 0.5 * imgW } // along +x of the image
      v = { x: 0, y: 0.5 * imgH } // along +y of the image
    } else if (this.properties.orientation === 'left-wall') {
      // left wall, experimental
      u = { x: -imgW, y: 0.5 * imgW } // along +x of the image
      v = { x: 0, y: 0.5 * imgH } // along +y of the image
    } else {
      // floor
      u = { x: imgW, y: 0.5 * imgW } // along +x of the image
      v = { x: -imgH, y: 0.5 * imgH } // along +y of the image
    }

    const cx = this.x
    const cy = this.y
    const p = { x: cx + imgW, y: cx }

    imageCanvasCtx.save()
    imageCanvasCtx.setTransform(u.x / imgW, u.y / imgW, v.x / imgH, v.y / imgH, p.x, p.y)
    imageCanvasCtx.drawImage(img, 0, 0)
    imageCanvasCtx.restore()

    // draw border around the image for debugging
    imageCanvasCtx.save()
    imageCanvasCtx.strokeStyle = 'red'
    imageCanvasCtx.lineWidth = 2
    imageCanvasCtx.strokeRect(0, 0, this._imageCanvas.width, this._imageCanvas.height)
    imageCanvasCtx.restore()
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this._rendered) return

    const x = this.x
    const y = this.y
    if (x === undefined || y === undefined) return

    const img = this._image
    const tsize = this.properties.tileSize
    const twidth = tsize
    const theight = tsize / 2
    const scaleFactor = this.properties.scale || 1.0
    // const ratio = this._imageCanvas.width / this._imageCanvas.height
    // const imgW = Math.min(this._imageCanvas.width, twidth)
    // const imgH = imgW / ratio

    // adjust width to fit the tile
    // if (ratio < 1) {
    //   imgW = twidth
    //   imgH = imgW / (twidth / image.height)
    // }

    //console.log('image', cellIdx, imageIdx, ratio, imgW, imgH)

    const offsetX = 0 // -(imgW / 2)
    const offsetY = 0 // tsize / 4 // 0 // -imgH + theight

    // fit to tile size
    ctx.drawImage(
      this._imageCanvas,
      0,
      0,
      this._imageCanvas.width,
      this._imageCanvas.height,
      x + offsetX - (this.properties.tileSize * scaleFactor) / 2,
      y + offsetY, // - (this.properties.tileSize / 4) * scaleFactor,
      this.properties.tileSize * scaleFactor,
      (this.properties.tileSize / 2) * scaleFactor,
    )

    // draw the original image for reference
    ctx.globalAlpha = 0.2
    ctx.drawImage(this._imageCanvas, x - img.width, y)
    ctx.globalAlpha = 1

    // --- CONFIG ---
    //const W = img.width,
    //  H = img.height // source image pixels

    // draw a white vertical line at cx
    ctx.save()
    ctx.strokeStyle = 'white'
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, 2000)
    ctx.stroke()
    ctx.restore()

    // draw a red dot at the center point
    ctx.save()
    ctx.fillStyle = 'red'
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, 2 * Math.PI)
    ctx.fill()
    ctx.restore()

    // 2:1 dimetric basis
    // const u = { x: img.width, y: img.width / 2 } // along +x of the image
    // const v = { x: -img.height, y: img.height / 2 } // along +y of the image
    // outlineDiamond(ctx, { x, y }, u, v)
  }

  update(deltaTime: number): void {}
}

// function outlineDiamond(ctx: CanvasRenderingContext2D, p, u, v) {
//   ctx.save()
//   //ctx.setTransform(1, 0, 0, 1, 0, 0)
//   ctx.beginPath()
//   ctx.moveTo(p.x, p.y)
//   ctx.lineTo(p.x + u.x, p.y + u.y)
//   ctx.lineTo(p.x + u.x + v.x, p.y + u.y + v.y)
//   ctx.lineTo(p.x + v.x, p.y + v.y)
//   ctx.closePath()
//   ctx.stroke()
//   ctx.restore()
// }
