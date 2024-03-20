import { TileMap } from '../../../lib'
import { SpriteComponent } from '../../../lib'
import { TextComponent } from '../../../lib'
import { IsoCubeComponent } from '../../../lib'
import { IsoHexagonComponent } from '../../../lib'
import { IsoCylinderComponent } from '../../../lib'
import { AnimatedSpriteComponent } from '../../../lib'

const awsWorldBuilder = async (resources: IGameResources): Promise<ITileMap> => {
  const ROWS = 30
  const COLUMNS = 30
  const TILE_SIZE = 128

  const LAYER_TILES = 0
  const LAYER_UNDERGROUND = 1
  const LAYER_GROUND = 2
  const LAYER_LABELS = 3
  const LAYER_BUILDINGS = 4
  const LAYER_OBJECTS = 4

  // Init resources
  await resources.loadSpritesheet(
    'fm_iso_buildings',
    '/assets/sprites/fm_iso_buildings/fm_iso_buildings.png',
    1,
  )
  await resources.loadSpritesheet(
    'fm_iso_pyramids',
    '/assets/sprites/fm_iso_pyramids/fm_iso_pyramids.png',
    32,
  )
  await resources.loadTileset('mech-up', '/assets/sprites/mechanoid/Walk_Body_045.png', 6, 4, 64)
  await resources.loadTileset('mech-left', '/assets/sprites/mechanoid/Walk_Body_135.png', 6, 4)
  await resources.loadTileset('mech-down', '/assets/sprites/mechanoid/Walk_Body_225.png', 6, 4)
  await resources.loadTileset('mech-right', '/assets/sprites/mechanoid/Walk_Body_315.png', 6, 4)

  await resources.loadFont('BungeeSpice', '/assets/fonts/Bungee_Spice/BungeeSpice-Regular.ttf')
  await resources.loadFont('Tektur', '/assets/fonts/Tektur/Tektur-VariableFont_wdth,wght.ttf')

  const worldConfig: TileMapConfig = {
    columns: COLUMNS,
    rows: ROWS,
    tileSize: TILE_SIZE,
    //projection: 'orthogonal',
    projection: 'dimetric',
  }
  const worldMap = new TileMap(worldConfig)

  // Init layers
  worldMap.addLayer(LAYER_TILES, { name: 'Tiles', type: 'TILELAYER', data: [] })
  worldMap.addLayer(LAYER_UNDERGROUND, { name: 'Underground', type: 'TILELAYER', data: [] })
  worldMap.addLayer(LAYER_GROUND, { name: 'Ground', type: 'TILELAYER', data: [] })
  worldMap.addLayer(LAYER_LABELS, { name: 'Labels', type: 'OBJECTLAYER', data: [] })
  worldMap.addLayer(LAYER_BUILDINGS, { name: 'Buildings', type: 'OBJECTLAYER', data: [] })
  worldMap.addLayer(LAYER_OBJECTS, { name: 'Objects', type: 'OBJECTLAYER', data: [] })

  const rowNr = 0

  worldMap.addObjectAt(
    LAYER_LABELS,
    0,
    rowNr,
    new TextComponent({
      text: 'AWS Inventory',
      font: '48px Tektur',
      orientation: 'horizontal',
    }),
  )

  return worldMap
}

export default awsWorldBuilder
