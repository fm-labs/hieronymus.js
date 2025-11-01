import { AbstractGameComponent, Game, IsoCubeComponent, TileMap, TileMapSystem } from '../../../lib'

export interface TileMapComponentProps extends GameComponentProperties {
  tileSize: number
}

export class TileMapComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: TileMapComponentProps

  public static readonly defaultProperties: TileMapComponentProps = {
    tileSize: 64,
  }

  public readonly componentType: string = 'TileMap'
  public readonly name: string

  private _canvas: HTMLCanvasElement | null = null
  private _tilemap: TileMap | null = null
  private _tilemapSystem: TileMapSystem | null = null
  private _subgame: IGame | null = null

  constructor(properties: TileMapComponentProps) {
    super({
      ...TileMapComponent.defaultProperties,
      ...properties,
    })
    this.name = properties.name || 'TileMapComponent'

    const conf: TileMapConfig = {
      columns: 3,
      rows: 3,
      tileSize: this.properties.tileSize,
      projection: 'isometric',
    }
    const layers: TileMapLayer[] = [
      {
        name: 'Ground',
        type: 'TILE',
        data: [],
      },
    ]
    this._tilemap = new TileMap(conf, layers)
    this._tilemap.addTile(
      0,
      3,
      3,
      new IsoCubeComponent({
        tileSize: this.properties.tileSize,
        width: this.properties.tileSize,
        depth: 32,
        //text: 'M4',
        lineDash: [1, 0],
      }),
    )

    const app = document.createElement('div')
    app.style.position = 'absolute'
    app.style.top = '0'
    app.style.left = '0'
    app.style.width = '200px'
    app.style.height = '200px'
    app.style.overflow = 'hidden'

    const game = new Game(app, { id: 'submap', name: 'Sub Game', width: 200, height: 200 })

    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 200
    this._canvas = canvas
    const tms = new TileMapSystem(game, this._tilemap, this._canvas)
    //tms.tick(1) // initial tick to render the tilemap
    game.addSystem(tms)
    game.tick(1)

    this._tilemapSystem = tms
    this._subgame = game

    console.log('TileMapComponent initialized', this._tilemap, this._tilemapSystem, this._subgame)
  }

  setPosition(x: number, y: number): this {
    return super.setPosition(x, y)
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // draw a fat red square
    ctx.fillStyle = 'red'
    ctx.fillRect(this.x, this.y, 10, 10)

    // if (this._subgame && this._tilemapSystem && this._canvas) {
    //   const tmsContext = this._tilemapSystem.worldCanvas.getContext('2d')
    //   if (tmsContext) {
    //     // merge tmsContext into ctx at this.x, this.y
    //     //ctx.drawImage(tmsContext.canvas, this.x + 10, this.y + 10, 100, 100)
    //     try {
    //       ctx.drawImage(this._canvas, this.x, this.y, 100, 100)
    //     } catch (e) {
    //       console.error('Error drawing tilemap system canvas:', e)
    //     }
    //   }
    // }
  }

  update(deltaTime: number): void {
    // if (this._subgame) {
    //   this._subgame.tick(deltaTime)
    // }
    //console.log(deltaTime)
    if (this._tilemapSystem) {
      //this._tilemapSystem.tick(1)
    }
  }
}
