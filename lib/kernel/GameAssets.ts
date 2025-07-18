import { fetchSpritesheetAtlas } from '../utils/assetfetch.ts'

export type Sprite = {
  imageName: string // sprite sheet image in image cache
  name: string
  x: number
  y: number
  width: number
  height: number
}

export type Tilesheet = {
  imageName: string // tilesheet image in image cache
  name: string
  tileWidth: number
  tileHeight: number
  columns: number
  rows: number
}

class GameAssets {
  private static _nextgid: number = 1 // next global ID for sprites

  private static readonly imageCache: Map<string, HTMLImageElement> = new Map()
  private static readonly fontCache: Map<string, FontFace> = new Map()
  private static readonly audioCache: Map<string, HTMLAudioElement> = new Map()

  public static readonly sprites: Record<number, Sprite> = {}
  private static readonly tilesheets: Record<string, Tilesheet> = {}

  static async loadSpritesheet(
    name: string,
    imageUrl: string,
    atlasUrl: string,
    nextgid?: number,
  ): Promise<void> {
    console.log(`Load spritesheet for ${name}`, imageUrl, atlasUrl)
    const imageName = name
    const image = GameAssets.loadImage(imageName, imageUrl)
    if (!image) {
      throw new Error(`Failed to load image from ${imageUrl}`)
    }

    const atlas = await fetchSpritesheetAtlas(atlasUrl)
    if (!atlas || !atlas.sprites || atlas.sprites.length === 0) {
      throw new Error(`Spritesheet atlas at ${atlasUrl} is empty or invalid`)
    }

    if (nextgid) {
      if (nextgid < this._nextgid) throw new Error('nextgid must be greater than previous')
      this._nextgid = nextgid
    }

    atlas.sprites.forEach((sprite) => {
      const _gid = this._nextgid++
      console.log('Registering sprite', _gid, sprite)
      this.sprites[_gid] = { ...sprite, imageName: imageName }
    })
  }

  static getSprite(gid: number): Sprite | undefined {
    return this.sprites[gid] || undefined
  }

  static getSpriteImage(gid: number): HTMLImageElement | undefined {
    const sprite = this.getSprite(gid)
    if (!sprite) {
      console.warn(`Sprite with gid ${gid} not found.`)
      return undefined
    }

    const imageName = sprite.imageName
    const img = this.imageCache.get(imageName)
    if (!img) {
      console.warn(`Image for sprite with gid ${gid} not loaded.`)
      return undefined
    }
    return img
  }

  static async loadTilesheet(
    name: string,
    url: string,
    columns: number,
    rows: number,
    nextgid?: number,
  ): Promise<void> {
    const imageName = 'tilesheet-' + name
    const image = await this.loadImage(imageName, url)
    if (!image) {
      throw new Error(`Failed to load tilesheet image from ${url}`)
    }

    if (nextgid) {
      if (nextgid < this._nextgid) throw new Error('nextgid must be greater than previous')
      this._nextgid = nextgid
    }

    this.tilesheets[name] = {
      imageName: imageName,
      name: name,
      tileWidth: image.width / columns,
      tileHeight: image.height / rows,
      columns: columns,
      rows: rows,
    }
  }

  static getTilesheet(name: string): Tilesheet | undefined {
    return this.tilesheets[name] || undefined
  }

  static getTilesheetImage(name: string): HTMLImageElement | undefined {
    const tilesheet = this.getTilesheet(name)
    if (!tilesheet) {
      console.warn(`Tilesheet with name "${name}" not found.`)
      return undefined
    }
    const img = this.imageCache.get(tilesheet.imageName)
    if (!img) {
      console.warn(`Image for tilesheet "${name}" not loaded.`)
      return undefined
    }
    return img
  }

  /**
   * Loads an image from a URL and caches it with the provided key.
   * If the image is already cached, it returns immediately.
   * @param key A unique identifier for the image.
   * @param url The URL of the image to load.
   */
  static async loadImage(key: string, url: string): Promise<HTMLImageElement> {
    console.log(`Load image ${key}`, url)

    if (this.imageCache.has(key)) {
      console.warn(`Image "${key}" already loaded.`)
      return this.imageCache.get(key)!
    }

    const img = new Image()
    img.src = url

    return await new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => {
        this.imageCache.set(key, img)
        resolve(img)
      }
      img.onerror = (err) => {
        console.error(`Failed to load image "${key}":`, err)
        reject(err)
      }
    })
  }

  /**
   * Loads a font from a URL and caches it with the provided key.
   * @param key A unique identifier for the font.
   * @param url The URL of the font to load.
   */
  static async loadFont(key: string, url: string): Promise<void> {
    if (this.fontCache.has(key)) {
      console.warn(`Font "${key}" already loaded.`)
      return
    }

    const font = new FontFace(key, `url(${url})`)
    await font.load()
    document.fonts.add(font)
    this.fontCache.set(key, font)
  }

  /**
   * Loads an audio file from a URL and caches it with the provided key.
   * @param key A unique identifier for the audio.
   * @param url The URL of the audio file to load.
   */
  static async loadAudio(key: string, url: string): Promise<void> {
    if (this.audioCache.has(key)) {
      console.warn(`Audio "${key}" already loaded.`)
      return
    }

    const audio = new Audio(url)
    await new Promise<void>((resolve, reject) => {
      audio.oncanplaythrough = () => {
        this.audioCache.set(key, audio)
        resolve()
      }
      audio.onerror = (err) => {
        console.error(`Failed to load audio "${key}":`, err)
        reject(err)
      }
    })
  }

  /**
   * Gets a cached font.
   * @param key The key of the font.
   */
  static getFont(key: string): FontFace {
    const font = this.fontCache.get(key)
    if (!font) {
      throw new Error(`Font "${key}" not loaded.`)
    }
    return font
  }

  /**
   * Gets a cached audio.
   * @param key The key of the audio.
   */
  static getAudio(key: string): HTMLAudioElement {
    const audio = this.audioCache.get(key)
    if (!audio) {
      throw new Error(`Audio "${key}" not loaded.`)
    }
    return audio
  }

  /**
   * Gets a cached image.
   * @param key The key of the image.
   */
  static getImage(key: string): HTMLImageElement {
    const img = this.imageCache.get(key)
    if (!img) {
      throw new Error(`Image "${key}" not loaded.`)
    }
    return img
  }

  // /**
  //  * Checks if an image is loaded and cached.
  //  * @param key The key of the image.
  //  */
  // static isImageLoaded(key: string): boolean {
  //   return this.imageCache.has(key)
  // }
  //
  // /**
  //  * Draws a cached image onto a canvas.
  //  * @param ctx CanvasRenderingContext2D
  //  * @param key Cached image key
  //  * @param x X position
  //  * @param y Y position
  //  * @param width Optional width
  //  * @param height Optional height
  //  */
  // static drawImage(
  //   ctx: CanvasRenderingContext2D,
  //   key: string,
  //   x: number,
  //   y: number,
  //   width?: number,
  //   height?: number,
  // ): void {
  //   const img = this.getImage(key)
  //   if (width && height) {
  //     ctx.drawImage(img, x, y, width, height)
  //   } else {
  //     ctx.drawImage(img, x, y)
  //   }
  // }
}

export default GameAssets
