import type { IGame, TileMapConfig, ITileMap } from '../../../lib/game.types'
import {
  IsoCubeComponent,
  IsoCylinderComponent,
  orthogonalGridToScreen,
  SpriteComponent,
  TileMap,
} from '../../../lib'
import { IsoTextComponent } from '../../../lib'
import { TileComponent } from '../../../lib/components/TileComponent.ts'
import { LineComponent } from '../../../lib/components/LineComponent.ts'
import { TextComponent } from '../../../lib/components/TextComponent.ts'

const casinoWorldBuilder = async (game: IGame, casinoInventory: any): Promise<ITileMap> => {
  const ROWS = 25
  const COLUMNS = 25
  const TILE_SIZE = 128

  const LAYER_TILES = 0
  //const LAYER_UNDERGROUND = 1
  //const LAYER_GROUND = 2
  const LAYER_LABELS = 3
  const LAYER_BUILDINGS = 4
  //const LAYER_OBJECTS = 5

  const resources = game.resources

  // Init resources
  await resources.loadSpritesheet(
    'fm_iso_buildings',
    '/assets/sprites/fm_iso_buildings/fm_iso_buildings.png',
    '/assets/sprites/fm_iso_buildings/fm_iso_buildings.json',
    1,
  )
  await resources.loadSpritesheet(
    'fm_iso_pyramids',
    '/assets/sprites/fm_iso_pyramids/fm_iso_pyramids.png',
    '/assets/sprites/fm_iso_pyramids/fm_iso_pyramids.json',
    32,
  )
  await resources.loadTilesheet('mech-up', '/assets/sprites/mechanoid/Walk_Body_045.png', 6, 4, 64)
  await resources.loadTilesheet('mech-left', '/assets/sprites/mechanoid/Walk_Body_135.png', 6, 4)
  await resources.loadTilesheet('mech-down', '/assets/sprites/mechanoid/Walk_Body_225.png', 6, 4)
  await resources.loadTilesheet('mech-right', '/assets/sprites/mechanoid/Walk_Body_315.png', 6, 4)

  await resources.loadFont('BungeeSpice', '/assets/fonts/Bungee_Spice/BungeeSpice-Regular.ttf')
  await resources.loadFont('Tektur', '/assets/fonts/Tektur/Tektur-VariableFont_wdth,wght.ttf')

  const worldConfig: TileMapConfig = {
    columns: COLUMNS,
    rows: ROWS,
    tileSize: TILE_SIZE,
    //projection: 'orthogonal',
    projection: 'isometric',
  }
  const worldMap = new TileMap(worldConfig)

  // Init layers
  worldMap.addLayer(LAYER_TILES, { name: 'Tiles', type: 'TILE', data: [] })
  //worldMap.addLayer(LAYER_UNDERGROUND, { name: 'Underground', type: 'TILE', data: [] })
  //worldMap.addLayer(LAYER_GROUND, { name: 'Ground', type: 'TILE', data: [] })
  worldMap.addLayer(LAYER_LABELS, { name: 'Labels', type: 'OBJECT', data: [] })
  worldMap.addLayer(LAYER_BUILDINGS, { name: 'Buildings', type: 'TILE', data: [] })
  //worldMap.addLayer(LAYER_OBJECTS, { name: 'Objects', type: 'OBJECT', data: [] })

  worldMap.addObjectAtGridPos(
    LAYER_LABELS,
    1,
    -1,
    new IsoTextComponent({
      text: 'Boxxx Casino',
      font: '148px Tektur',
      orientation: 'horizontal',
    }),
  )

  const games: any[] = casinoInventory.games || []
  let rowNr = 0
  let colNr = 1

  {
    games.forEach((game: any) => {
      worldMap.createTile(LAYER_TILES, colNr, rowNr, { backgroundColor: 'rgb(219,136,237)' })
      worldMap.addTile(
        LAYER_BUILDINGS,
        colNr,
        rowNr,
        new IsoCubeComponent({
          tileSize: worldMap.tileWidth,
          width: worldMap.tileWidth / 2,
          depth: worldMap.tileWidth / 6,
          //text: 'M4',
        }),
      )
      worldMap.addObjectAtGridPos(
        LAYER_LABELS,
        colNr,
        rowNr,
        new TextComponent({
          text: game.id,
          font: '12px Tektur',
          orientation: 'horizontal',
          color: 'rgba(172,239,1,0.5)',
        }),
      )
      // const _sprite = new SpriteComponent({
      //   tileSize: worldMap.tileWidth,
      //   spriteId: 10,
      //   data: game,
      // })
      // worldMap.addTile(LAYER_BUILDINGS, colNr, rowNr, _sprite)

      colNr = colNr + 1
      if (colNr >= COLUMNS - 1) {
        colNr = 1
        const modulo = rowNr % 3
        rowNr = rowNr + (modulo === 0 ? 2 : 1)
      }
    })
  }

  return worldMap
}

export default casinoWorldBuilder
