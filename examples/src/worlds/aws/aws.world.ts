import type { IGame, TileMapConfig, ITileMap } from '@fmlabs/world'
import {
  IsoCubeComponent,
  IsoCylinderComponent,
  orthogonalGridToScreen,
  SpriteComponent,
  TileMap,
} from '@fmlabs/world'
import { IsoTextComponent } from '@fmlabs/world'
import {
  AWS_SERVICE_CATEGORIES,
  AWS_SERVICES,
  AwsServiceIdentifier,
  AwsInventoryItemFull,
} from 'cloudia-common'
import { TileComponent } from '@fmlabs/world'
import { LineComponent } from '@fmlabs/world'

const awsWorldBuilder = async (
  game: IGame,
  awsInventory: AwsInventoryItemFull[],
): Promise<ITileMap> => {
  const ROWS = 50
  const COLUMNS = 30
  const TILE_SIZE = 64
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

  const gameData: { nodes: any[]; edges: any[] } = { nodes: [], edges: [] }

  // Init layers
  worldMap.addLayer(LAYER_TILES, { name: 'Tiles', type: 'TILE', data: [] })
  //worldMap.addLayer(LAYER_UNDERGROUND, { name: 'Underground', type: 'TILE', data: [] })
  //worldMap.addLayer(LAYER_GROUND, { name: 'Ground', type: 'TILE', data: [] })
  worldMap.addLayer(LAYER_LABELS, { name: 'Labels', type: 'OBJECT', data: [] })
  worldMap.addLayer(LAYER_BUILDINGS, { name: 'Buildings', type: 'TILE', data: [] })
  //worldMap.addLayer(LAYER_OBJECTS, { name: 'Objects', type: 'OBJECT', data: [] })

  worldMap.addObjectAtGridPos(
    LAYER_LABELS,
    0,
    0,
    new IsoTextComponent({
      text: 'AWS Inventory',
      font: '48px Tektur',
      orientation: 'horizontal',
    }),
  )

  let rowNr = 1
  let colNr = 0
  AWS_SERVICE_CATEGORIES.forEach((service, index) => {
    //if (service.id === 'ManagementGovernance') return
    //if (service.id === 'SecurityIdentityCompliance') return

    const serviceIds = AWS_SERVICES.filter((item) => item.category === service.id).map(
      (item) => item.id,
    )
    const inventory: AwsInventoryItemFull[] = awsInventory.filter(
      (item) => serviceIds.indexOf(item.service_id as AwsServiceIdentifier) > -1,
    )
    if (inventory.length === 0) return

    inventory.forEach((item, index) => {
      // // cube
      // worldMap.addObjectAt(
      //   LAYER_OBJECTS,
      //   colNr,
      //   rowNr,
      //   new IsoCubeComponent({
      //     tileSize: worldMap.tileWidth,
      //     width: worldMap.tileWidth,
      //     depth: 64,
      //     //text: 'M4',
      //   }),
      // )

      const node = {
        id: index + 1000,
        type: item.resource_type,
        label: item.name || item.id || 'unknown',
        item: item,
        pos: { x: colNr, y: rowNr },
      }
      gameData.nodes.push(node)

      if (item.resource_type === 'AWS::EC2::Instance') {
        const _tile = new TileComponent({
          width: worldMap.tileWidth,
          height: worldMap.tileHeight,
          backgroundColor: 'rgb(213,32,32)',
        })
        worldMap.addTile(LAYER_TILES, colNr, rowNr, _tile)

        const _sprite = new SpriteComponent({
          tileSize: worldMap.tileWidth,
          spriteId: 6,
          data: item,
        })
        worldMap.addTile(LAYER_BUILDINGS, colNr, rowNr, _sprite)
      } else if (item.resource_type.startsWith('AWS::RDS')) {
        worldMap.createTile(LAYER_TILES, colNr, rowNr, { backgroundColor: 'rgb(82,124,181)' })
        worldMap.addTile(
          LAYER_BUILDINGS,
          colNr,
          rowNr,
          new IsoCylinderComponent({
            tileSize: worldMap.tileWidth,
            radius: worldMap.tileWidth / 4,
            depth: 32,
            //text: 'M4',
          }),
        )
      } else if (item.resource_type.startsWith('AWS::S3')) {
        worldMap.createTile(LAYER_TILES, colNr, rowNr, { backgroundColor: 'rgb(18,236,11)' })
        worldMap.addTile(
          LAYER_BUILDINGS,
          colNr,
          rowNr,
          new IsoCubeComponent({
            tileSize: worldMap.tileWidth,
            width: worldMap.tileWidth / 2,
            depth: 32,
            //text: 'M4',
          }),
        )
      } else {
        worldMap.createTile(LAYER_TILES, colNr, rowNr, { backgroundColor: 'rgb(219,136,237)' })
        worldMap.addTile(
          LAYER_BUILDINGS,
          colNr,
          rowNr,
          new IsoCubeComponent({
            tileSize: worldMap.tileWidth,
            width: worldMap.tileWidth / 2,
            depth: 32,
            //text: 'M4',
          }),
        )
      }

      worldMap.addObjectAtGridPos(
        LAYER_LABELS,
        colNr,
        rowNr,
        new IsoTextComponent({
          text: item.service_id,
          font: '10px Arial',
          orientation: 'vertical',
          skewOrientation: 'upright',
          color: 'rgb(255,255,255)',
        }),
      )

      colNr++
      if (colNr >= COLUMNS) {
        colNr = 0
        rowNr++
      }
    })

    colNr = 0
    rowNr++

    worldMap.addObjectAtGridPos(
      LAYER_LABELS,
      colNr,
      rowNr,
      new IsoTextComponent({
        text: service.label + ' (' + serviceIds.length + '/' + inventory.length + ')',
        font: '24px Tektur',
        orientation: 'horizontal',
        color: 'rgb(255, 255, 255)',
      }),
    )

    rowNr++

    worldMap.addObjectAtGridPos(
      LAYER_LABELS,
      6,
      6,
      new LineComponent({
        lineWidth: 3,
        to: [
          worldMap.projection.mapGridToScreen(6, 9),
          worldMap.projection.mapGridToScreen(9, 9),
          worldMap.projection.mapGridToScreen(9, 13),
          worldMap.projection.mapGridToScreen(10, 13),
          worldMap.projection.mapGridToScreen(10, 12),
        ],
        offset: { y: worldMap.tileHeight / 2, x: 0 }, // center of tile
        strokeColor: 'rgb(14,239,239)',
      }),
    )

    game.data = gameData
  })

  return worldMap
}

export default awsWorldBuilder
