import { TileMap } from '../../../lib'
import { TextComponent } from '../../../lib'
import {
  AWS_SERVICE_CATEGORIES,
  AWS_SERVICES,
  AwsServiceIdentifier,
  IAwsInventoryItemFull,
} from 'cloudia-common'

const awsWorldBuilder = async (game: IGame): Promise<ITileMap> => {
  const ROWS = 30
  const COLUMNS = 30
  const TILE_SIZE = 128

  const LAYER_TILES = 0
  const LAYER_UNDERGROUND = 1
  const LAYER_GROUND = 2
  const LAYER_LABELS = 3
  const LAYER_BUILDINGS = 4
  const LAYER_OBJECTS = 4

  const resources = game.resources

  const awsInventory: IAwsInventoryItemFull[] = await fetch(
    '/aws/inventory/aws.inventory.json',
  ).then((response) => {
    return response.json()
  })

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

  worldMap.addObjectAt(
    LAYER_LABELS,
    0,
    0,
    new TextComponent({
      text: 'AWS Inventory',
      font: '48px Tektur',
      orientation: 'horizontal',
    }),
  )

  let rowNr = 1
  let colNr = 0
  AWS_SERVICE_CATEGORIES.forEach((service, index) => {
    if (service.id === 'ManagementGovernance') return

    const serviceIds = AWS_SERVICES.filter((item) => item.category === service.id).map(
      (item) => item.id,
    )
    const inventory: IAwsInventoryItemFull[] = awsInventory.filter(
      (item) => serviceIds.indexOf(item.service_id as AwsServiceIdentifier) > -1,
    )
    if (inventory.length === 0) return

    worldMap.addObjectAt(
      LAYER_LABELS,
      colNr,
      rowNr,
      new TextComponent({
        text: service.label + ' (' + serviceIds.length + '/' + inventory.length + ')',
        font: '24px Tektur',
        orientation: 'horizontal',
      }),
    )

    inventory.forEach((item, index) => {
      worldMap.addTile(LAYER_TILES, colNr, rowNr, { backgroundColor: 'rgba(255,242,0,0.27)' })
      colNr++
      if (colNr >= COLUMNS) {
        colNr = 0
        rowNr++
      }
    })

    colNr = 0
    rowNr++
    rowNr++
  })

  return worldMap
}

export default awsWorldBuilder
