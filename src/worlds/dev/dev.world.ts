import { TileMap } from '../../../lib/map/TileMap.ts'
import { SpriteComponent } from '../../../lib/components/SpriteComponent.ts'
import { TextComponent } from '../../../lib/components/TextComponent.ts'
import { IsoCubeComponent } from '../../../lib/components/IsoCubeComponent.ts'
import { IsoHexagonComponent } from '../../../lib/components/IsoHexagonComponent.ts'
import { IsoCylinderComponent } from '../../../lib/components/IsoCylinderComponent.ts'
import { AnimatedSpriteComponent } from '../../../lib/components/AnimatedSpriteComponent.ts'

const devWorldBuilder = async (resources: IGameResources): Promise<ITileMap> => {
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

  // TILE layer
  worldMap.addTile(LAYER_TILES, 0, 7, { backgroundColor: 'rgba(255,242,0,0.27)' })
  worldMap.addTile(LAYER_TILES, 1, 7, { backgroundColor: 'rgba(255,0,106,0.5)' })
  worldMap.addTile(LAYER_TILES, 2, 7, { backgroundColor: 'rgba(0,81,255,0.5)' })
  worldMap.addTile(LAYER_TILES, 3, 7, {})

  // BULILDINGS layer
  worldMap.setTile(
    LAYER_BUILDINGS,
    0,
    6,
    new SpriteComponent({
      tileSize: worldMap.tileWidth,
      spriteImage: resources.getSprite(6),
    }),
  )
  worldMap.setTile(
    LAYER_BUILDINGS,
    1,
    6,
    new SpriteComponent({
      tileSize: worldMap.tileWidth,
      spriteImage: resources.getSprite(7),
    }),
  )
  worldMap.setTile(
    LAYER_BUILDINGS,
    2,
    6,
    new SpriteComponent({
      tileSize: worldMap.tileWidth,
      spriteImage: resources.getSprite(8),
    }),
  )

  // LABELS layer
  worldMap.addObjectAt(
    LAYER_LABELS,
    4,
    4,
    new TextComponent({
      text: 'Custom Font',
      font: '48px BungeeSpice',
      orientation: 'vertical',
      skewOrientation: 'upright',
    }),
  )

  worldMap.addObjectAt(
    LAYER_LABELS,
    0,
    0,
    new TextComponent({
      text: 'Shapes',
      font: '48px Tektur',
      orientation: 'horizontal',
    }),
  )

  worldMap.addObjectAt(
    LAYER_LABELS,
    0,
    6,
    new TextComponent({
      text: 'Tiles',
      font: '48px Tektur',
      orientation: 'horizontal',
    }),
  )

  // OBJECT layer

  // cube
  worldMap.addObjectAt(
    LAYER_OBJECTS,
    0,
    0,
    new IsoCubeComponent({
      tileSize: worldMap.tileWidth,
      width: worldMap.tileWidth,
      depth: 64,
      //text: 'M4',
    }),
  )
  worldMap.addObjectAt(
    LAYER_OBJECTS,
    1,
    0,
    new IsoCubeComponent({
      tileSize: worldMap.tileWidth,
      width: worldMap.tileWidth / 2,
      depth: 32,
      //text: 'M4',
    }),
  )

  // hexagon
  worldMap.addObjectAt(
    LAYER_OBJECTS,
    0,
    1,
    new IsoHexagonComponent({
      tileSize: worldMap.tileWidth,
      sideLength: worldMap.tileWidth / 2,
      depth: 64,
    }),
  )
  worldMap.addObjectAt(
    LAYER_OBJECTS,
    1,
    1,
    new IsoHexagonComponent({
      tileSize: worldMap.tileWidth,
      sideLength: worldMap.tileWidth / 4,
      depth: 32,
    }),
  )

  // cylinder
  worldMap.addObjectAt(
    LAYER_OBJECTS,
    0,
    2,
    new IsoCylinderComponent({
      tileSize: worldMap.tileWidth,
      radius: 48,
      depth: 64,
    }),
  )
  worldMap.addObjectAt(
    LAYER_OBJECTS,
    1,
    2,
    new IsoCylinderComponent({
      tileSize: worldMap.tileWidth,
      radius: 32,
      depth: 32,
    }),
  )

  // animated
  worldMap.addObjectAt(
    LAYER_OBJECTS,
    6,
    2,
    new AnimatedSpriteComponent({
      tileSize: worldMap.tileWidth,
      tileset: resources.getSpritesheet('mech-up') as TilesetResource,
    }),
  )
  worldMap.addObjectAt(
    LAYER_OBJECTS,
    5,
    3,
    new AnimatedSpriteComponent({
      tileSize: worldMap.tileWidth,
      tileset: resources.getSpritesheet('mech-right') as TilesetResource,
    }),
  )
  worldMap.addObjectAt(
    LAYER_OBJECTS,
    7,
    3,
    new AnimatedSpriteComponent({
      tileSize: worldMap.tileWidth,
      tileset: resources.getSpritesheet('mech-left') as TilesetResource,
    }),
  )
  worldMap.addObjectAt(
    LAYER_OBJECTS,
    6,
    4,
    new AnimatedSpriteComponent({
      tileSize: worldMap.tileWidth,
      tileset: resources.getSpritesheet('mech-down') as TilesetResource,
      speed: 10,
    }),
  )

  return worldMap
}

export default devWorldBuilder
