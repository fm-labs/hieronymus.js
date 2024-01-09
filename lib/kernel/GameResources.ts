import { loadHtmlImage, loadSpritesheetImage } from './loader.ts'

export class GameResources {
  public readonly spritesheets: HtmlSpritesheetImage[] = []
  public readonly sprites: HtmlSpriteImage[] = []

  private _nextgid: number = 1

  public loadHtmlImage(url: string): Promise<HTMLImageElement> {
    return loadHtmlImage(url)
  }

  public loadSpritesheet = async (url: string, nextgid?: number): Promise<void> => {
    const spritesheet = await loadSpritesheetImage(url)

    if (nextgid) {
      if (nextgid < this._nextgid) throw new Error('nextgid must be greater than previous')
      this._nextgid = nextgid
    }
    this.registerSpritesheet(spritesheet)
  }

  public loadKenneySpritesheet = async (name: string, nextgid?: number): Promise<void> => {
    const url = `/assets/2d/${name}/${name}.png`
    return this.loadSpritesheet(url, nextgid)
  }

  public getSprite(gid: number): HtmlSpriteImage | undefined {
    return this.sprites[gid]
  }

  private registerSpritesheet(spritesheet: HtmlSpritesheetImage) {
    // create resource and entity indices
    const spritesheetId = this.spritesheets.length

    spritesheet.sprites.forEach((sprite) => {
      const spriteGid = this._nextgid++
      this.sprites[spriteGid] = {
        //gid: spriteGid,
        //spritesheetId: spritesheetId,
        //spritesheetSource: spritesheet.url,
        image: spritesheet.image,
        url: spritesheet.url,
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
