import type { IGameResources } from '../game.types'
import GameAssets from './GameAssets'

export class GameResourcesManager implements IGameResources {
  public loadImage(name: string, url: string): Promise<HTMLImageElement> {
    return GameAssets.loadImage(name, url)
  }

  public loadSpritesheet = async (
    name: string,
    imageUrl: string,
    atlasUrl: string,
    nextgid?: number,
  ): Promise<void> => {
    return GameAssets.loadSpritesheet(name, imageUrl, atlasUrl, nextgid)
  }

  public loadTilesheet = async (
    name: string,
    url: string,
    columns: number,
    rows: number,
    //tileWidth?: number,
    //tileHeight?: number,
    nextgid?: number,
  ): Promise<void> => {
    //const image: HTMLImageElement = await fetchImage(url)
    // const tilesetResource: TilesheetResource = {
    //   type: 'TILESET',
    //   $element: image,
    //   name: name,
    //   tileWidth: image.width / columns,
    //   tileHeight: image.height / rows,
    //   columns: columns,
    //   rows: rows,
    // }
    // if (nextgid) {
    //   if (nextgid < this._nextgid) throw new Error('nextgid must be greater than previous')
    //   this._nextgid = nextgid
    // }
    // this.registerSpritesFromTilesheet(image, columns, rows)
    //this.spritesheets.push(tilesetResource)
    return GameAssets.loadTilesheet(name, url, columns, rows, nextgid)
  }

  // public loadKenneySpritesheet = async (name: string, nextgid?: number): Promise<void> => {
  //   const url = `/assets/2d/${name}/${name}.png`
  //   const sname = `kenney-${name}`
  //   return this.loadSpritesheet(sname, url, nextgid)
  // }

  public loadFont = async (name: string, url: string): Promise<void> => {
    // const font = new FontFace(name, `url(${url})`)
    // await font.load()
    // document.fonts.add(font)
    // this.fonts.push({ type: 'FONT', $font: font, $element: document.createElement('div') })
    return GameAssets.loadFont(name, url)
  }

  // public getSprite(gid: number): SpriteResource | undefined {
  //   return this.sprites[gid]
  // }

  // public getSpriteByName(name: string): SpriteResource | undefined {
  //   return this.sprites.find((sprite) => sprite.sprite.name === name)
  // }

  // public getSpritesheet(name: string): SpritesheetResource | TilesheetResource | undefined {
  //   return this.spritesheets.find((spritesheet) => spritesheet.name === name)
  // }

  // private registerSpritesFromSpritesheet(spritesheet: SpritesheetResource) {
  //   // create resource and entity indices
  //   const spritesheetId = this.spritesheets.length
  //
  //   spritesheet.sprites.forEach((sprite) => {
  //     const spriteGid = this._nextgid++
  //     this.sprites[spriteGid] = {
  //       type: 'SPRITE',
  //       $element: spritesheet.$element,
  //       sprite: sprite,
  //     }
  //   })
  //   this.spritesheets[spritesheetId] = spritesheet
  // }

  // private registerSpritesFromTilesheet(tileset: TilesheetResource, columns: number, rows: number) {
  //   const image = tileset.$element
  //   const width = image.width / columns
  //   const height = image.height / rows
  //
  //   const spriteIdx = 0
  //   for (let row = 0; row < rows; row++) {
  //     for (let col = 0; col < columns; col++) {
  //       const spriteGid = this._nextgid++
  //       const spriteX = col * width
  //       const spriteY = row * height
  //       const sprite = {
  //         x: spriteX,
  //         y: spriteY,
  //         width: width,
  //         height: height,
  //         name: 'tileset',
  //         id: spriteIdx,
  //       }
  //       this.sprites[spriteGid] = {
  //         type: 'SPRITE',
  //         $element: image,
  //         sprite: sprite,
  //       }
  //       console.log(spriteGid, sprite.name, sprite.x, sprite.y, sprite.width, sprite.height)
  //     }
  //   }
  // }
}
