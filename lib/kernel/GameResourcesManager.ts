import { fetchImage, fetchSpritesheet } from './loader.ts'

export class GameResourcesManager {
  public readonly spritesheets: SpritesheetResource[] = []
  public readonly sprites: SpriteResource[] = []
  public readonly fonts: FontResource[] = []

  private _nextgid: number = 1

  public loadHtmlImage(url: string): Promise<HTMLImageElement> {
    return fetchImage(url)
  }

  public loadAsset = async (asset: GameAsset, nextgid?: number): Promise<void> => {
    switch (asset.type) {
      case 'SPRITESHEET':
        return this.loadSpritesheet(asset.url, nextgid)
      case 'FONT':
        return this.loadFont(asset.name, asset.url)
      default:
        throw new Error(`Unknown asset type: ${asset.type}`)
    }
  }

  public loadSpritesheet = async (url: string, nextgid?: number): Promise<void> => {
    const spritesheet: SpritesheetResource = await fetchSpritesheet(url)

    if (nextgid) {
      if (nextgid < this._nextgid) throw new Error('nextgid must be greater than previous')
      this._nextgid = nextgid
    }
    this.registerSpritesFromSpritesheet(spritesheet)
  }

  public loadKenneySpritesheet = async (name: string, nextgid?: number): Promise<void> => {
    const url = `/assets/2d/${name}/${name}.png`
    return this.loadSpritesheet(url, nextgid)
  }

  public loadFont = async (name: string, url: string): Promise<void> => {
    const font = new FontFace(name, `url(${url})`)
    await font.load()
    document.fonts.add(font)
    this.fonts.push({ type: 'FONT', $font: font, $element: document.createElement('div') })
  }

  public getSprite(gid: number): SpriteResource | undefined {
    return this.sprites[gid]
  }

  public getSpriteByName(name: string): SpriteResource | undefined {
    return this.sprites.find((sprite) => sprite.sprite.name === name)
  }

  private registerSpritesFromSpritesheet(spritesheet: SpritesheetResource) {
    // create resource and entity indices
    const spritesheetId = this.spritesheets.length

    spritesheet.sprites.forEach((sprite) => {
      const spriteGid = this._nextgid++
      this.sprites[spriteGid] = {
        type: 'SPRITE',
        $element: spritesheet.$element,
        sprite: sprite,
      }
      console.log(
        spriteGid,
        spritesheetId,
        sprite.name,
        sprite.x,
        sprite.y,
        sprite.width,
        sprite.height,
      )
    })
    //console.log(spriteIdx)
    console.log('spriteIdx', this.sprites.length)
    this.spritesheets[spritesheetId] = spritesheet
  }
}
