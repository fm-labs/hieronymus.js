import { fetchImage, fetchSpritesheet } from './loader.ts'

export class GameResourcesManager implements IGameResources {
  public readonly spritesheets: (SpritesheetResource | TilesetResource)[] = []
  public readonly sprites: SpriteResource[] = []
  public readonly fonts: FontResource[] = []

  private _nextgid: number = 1

  public loadHtmlImage(url: string): Promise<HTMLImageElement> {
    return fetchImage(url)
  }

  public loadAsset = async (asset: GameAsset, nextgid?: number): Promise<void> => {
    switch (asset.type) {
      case 'SPRITESHEET':
        return this.loadSpritesheet(asset.name, asset.url, nextgid)
      case 'FONT':
        return this.loadFont(asset.name, asset.url)
      default:
        throw new Error(`Unknown asset type: ${asset.type}`)
    }
  }

  public loadSpritesheet = async (name: string, url: string, nextgid?: number): Promise<void> => {
    const spritesheet = await fetchSpritesheet(url)
    const spritesheetResource: SpritesheetResource = {
      type: 'SPRITESHEET',
      $element: spritesheet.$element,
      name: name,
      sprites: spritesheet.sprites,
    }
    if (nextgid) {
      if (nextgid < this._nextgid) throw new Error('nextgid must be greater than previous')
      this._nextgid = nextgid
    }
    this.registerSpritesFromSpritesheet(spritesheetResource)
  }

  public loadTileset = async (
    name: string,
    url: string,
    columns: number,
    rows: number,
    nextgid?: number,
  ): Promise<void> => {
    const image: HTMLImageElement = await fetchImage(url)

    const tilesetResource: TilesetResource = {
      type: 'TILESET',
      $element: image,
      name: name,
      tileWidth: image.width / columns,
      tileHeight: image.height / rows,
      columns: columns,
      rows: rows,
    }

    // if (nextgid) {
    //   if (nextgid < this._nextgid) throw new Error('nextgid must be greater than previous')
    //   this._nextgid = nextgid
    // }
    // this.registerSpritesFromTileset(image, columns, rows)
    this.spritesheets.push(tilesetResource)
  }

  public loadKenneySpritesheet = async (name: string, nextgid?: number): Promise<void> => {
    const url = `/assets/2d/${name}/${name}.png`
    const sname = `kenney-${name}`
    return this.loadSpritesheet(sname, url, nextgid)
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

  public getSpritesheet(name: string): SpritesheetResource | TilesetResource | undefined {
    return this.spritesheets.find((spritesheet) => spritesheet.name === name)
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

  private registerSpritesFromTileset(tileset: TilesetResource, columns: number, rows: number) {
    const image = tileset.$element
    const width = image.width / columns
    const height = image.height / rows

    const spriteIdx = 0
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const spriteGid = this._nextgid++
        const spriteX = col * width
        const spriteY = row * height
        const sprite = {
          x: spriteX,
          y: spriteY,
          width: width,
          height: height,
          name: 'tileset',
          id: spriteIdx,
        }
        this.sprites[spriteGid] = {
          type: 'SPRITE',
          $element: image,
          sprite: sprite,
        }
        console.log(spriteGid, sprite.name, sprite.x, sprite.y, sprite.width, sprite.height)
      }
    }
  }
}
