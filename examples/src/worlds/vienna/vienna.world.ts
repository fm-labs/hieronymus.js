import type { IGame, TileMapConfig, ITileMap } from '@fmlabs/world'
import { IsoCubeComponent, IsoCylinderComponent, SpriteComponent, TileMap } from '@fmlabs/world'
import { IsoTextComponent } from '@fmlabs/world'
import { TileComponent } from '@fmlabs/world'
import viennaInventoryData from './vienna.inventory.json'

type ViennaInventory = {
  points: Array<{ id: string; x: number; y: number }>
  index: { [key: string]: any }
}

const viennaWorldBuilder = async (game: IGame): Promise<ITileMap> => {
  const ROWS = 10
  const COLUMNS = 10
  const TILE_SIZE = 128

  const LAYER_TILES = 0
  //const LAYER_UNDERGROUND = 1
  //const LAYER_GROUND = 2
  const LAYER_LABELS = 3
  const LAYER_BUILDINGS = 4
  //const LAYER_OBJECTS = 5

  const resources = game.resources
  const viennaInventory: ViennaInventory = viennaInventoryData as ViennaInventory

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
    0,
    0,
    new IsoTextComponent({
      text: 'VIENNA Inventory',
      font: '48px Tektur',
      orientation: 'horizontal',
    }),
  )

  // const rowNr = 1
  // const colNr = 0
  //
  // worldMap.addObjectAtGridPos(
  //   LAYER_LABELS,
  //   colNr,
  //   rowNr,
  //   new TextComponent({
  //     text: service.label + ' (' + serviceIds.length + '/' + inventory.length + ')',
  //     font: '24px Tektur',
  //     orientation: 'horizontal',
  //     color: 'rgb(255, 255, 255)',
  //   }),
  // )

  const points = viennaInventory?.points as Array<{ id: string; x: number; y: number }>

  points.forEach((point, pindex) => {
    const item: any = viennaInventory?.index[point.id] || null
    if (!item) return

    const colNr = point.x
    const rowNr = point.y

    if (item?.category === 'church') {
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
    } else if (item?.category.startsWith('museum')) {
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
  })

  return worldMap
}

export default viennaWorldBuilder
