import { TileMap } from '../../../lib'
import { SpriteComponent } from '../../../lib'
import { TextComponent } from '../../../lib'
import { IsoCubeComponent } from '../../../lib'
import { IsoHexagonComponent } from '../../../lib'
import { IsoCylinderComponent } from '../../../lib'
import { AnimatedSpriteComponent } from '../../../lib'

const devWorldBuilder = async (game: IGame): Promise<ITileMap> => {
  const ROWS = 30
  const COLUMNS = 30
  const TILE_SIZE = 128

  const LAYER_TILES = 0
  const LAYER_UNDERGROUND = 1
  const LAYER_GROUND = 2
  const LAYER_LABELS = 3
  const LAYER_BUILDINGS = 4
  const LAYER_OBJECTS = 5

  const resources = game.resources

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

  let rowNr = 0

  worldMap.addObjectAt(
    LAYER_LABELS,
    0,
    rowNr,
    new TextComponent({
      text: 'Tiles',
      font: '48px Tektur',
      orientation: 'horizontal',
    }),
  )

  // TILE layer
  worldMap.addTile(LAYER_TILES, 0, rowNr, { backgroundColor: 'rgba(255,242,0,0.27)' })
  worldMap.addTile(LAYER_TILES, 1, rowNr, { backgroundColor: 'rgba(255,0,106,0.5)' })
  worldMap.addTile(LAYER_TILES, 2, rowNr, { backgroundColor: 'rgba(0,81,255,0.5)' })
  worldMap.addTile(LAYER_TILES, 3, rowNr, {})

  // SHAPES layer
  rowNr++
  rowNr++
  rowNr++
  worldMap.addObjectAt(
    LAYER_LABELS,
    0,
    rowNr,
    new TextComponent({
      text: 'Shapes',
      font: '48px Tektur',
      orientation: 'horizontal',
    }),
  )

  // cube
  worldMap.addObjectAt(
    LAYER_OBJECTS,
    0,
    rowNr,
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
    rowNr,
    new IsoCubeComponent({
      tileSize: worldMap.tileWidth,
      width: worldMap.tileWidth / 2,
      depth: 32,
      //text: 'M4',
    }),
  )

  // hexagon
  rowNr++
  worldMap.addObjectAt(
    LAYER_OBJECTS,
    0,
    rowNr,
    new IsoHexagonComponent({
      tileSize: worldMap.tileWidth,
      sideLength: worldMap.tileWidth / 2,
      depth: 64,
    }),
  )
  worldMap.addObjectAt(
    LAYER_OBJECTS,
    1,
    rowNr,
    new IsoHexagonComponent({
      tileSize: worldMap.tileWidth,
      sideLength: worldMap.tileWidth / 4,
      depth: 32,
    }),
  )

  // cylinder
  rowNr++
  worldMap.addObjectAt(
    LAYER_OBJECTS,
    0,
    rowNr,
    new IsoCylinderComponent({
      tileSize: worldMap.tileWidth,
      radius: 48,
      depth: 64,
    }),
  )
  worldMap.addObjectAt(
    LAYER_OBJECTS,
    1,
    rowNr,
    new IsoCylinderComponent({
      tileSize: worldMap.tileWidth,
      radius: 32,
      depth: 32,
    }),
  )

  // BUILDINGS layer
  rowNr++
  rowNr++
  rowNr++
  worldMap.addObjectAt(
    LAYER_LABELS,
    0,
    rowNr,
    new TextComponent({
      text: 'Sprites',
      font: '48px Tektur',
      orientation: 'horizontal',
    }),
  )

  worldMap.setTile(
    LAYER_BUILDINGS,
    0,
    rowNr,
    new SpriteComponent({
      tileSize: worldMap.tileWidth,
      spriteImage: resources.getSprite(6),
    }),
  )
  worldMap.setTile(
    LAYER_BUILDINGS,
    1,
    rowNr,
    new SpriteComponent({
      tileSize: worldMap.tileWidth,
      spriteImage: resources.getSprite(7),
    }),
  )
  worldMap.setTile(
    LAYER_BUILDINGS,
    2,
    rowNr,
    new SpriteComponent({
      tileSize: worldMap.tileWidth,
      spriteImage: resources.getSprite(8),
    }),
  )

  // animated
  rowNr = 0
  const secondColStart = 5
  let colNr = secondColStart

  worldMap.addObjectAt(
    LAYER_LABELS,
    colNr,
    rowNr + 5,
    new TextComponent({
      text: 'Animations',
      font: '48px Tektur',
      orientation: 'vertical',
    }),
  )
  worldMap.addObjectAt(
    LAYER_OBJECTS,
    6,
    2,
    new AnimatedSpriteComponent({
      tileSize: worldMap.tileWidth,
      tileset: resources.getSpritesheet('mech-up') as TilesetResource,
      speed: 5,
    }),
  )
  worldMap.addObjectAt(
    LAYER_OBJECTS,
    5,
    3,
    new AnimatedSpriteComponent({
      tileSize: worldMap.tileWidth,
      tileset: resources.getSpritesheet('mech-right') as TilesetResource,
      speed: 5,
    }),
  )
  // worldMap.addObjectAt(
  //   LAYER_OBJECTS,
  //   7,
  //   2,
  //   new AnimatedSpriteComponent({
  //     tileSize: worldMap.tileWidth,
  //     tileset: resources.getSpritesheet('mech-left') as TilesetResource,
  //     speed: 1,
  //   }),
  // )
  worldMap.addObjectAt(
    LAYER_OBJECTS,
    7,
    3,
    new AnimatedSpriteComponent({
      tileSize: worldMap.tileWidth,
      tileset: resources.getSpritesheet('mech-left') as TilesetResource,
      speed: 5,
    }),
  )
  // worldMap.addObjectAt(
  //   LAYER_OBJECTS,
  //   7,
  //   4,
  //   new AnimatedSpriteComponent({
  //     tileSize: worldMap.tileWidth,
  //     tileset: resources.getSpritesheet('mech-left') as TilesetResource,
  //     speed: 10,
  //   }),
  // )
  worldMap.addObjectAt(
    LAYER_OBJECTS,
    6,
    4,
    new AnimatedSpriteComponent({
      tileSize: worldMap.tileWidth,
      tileset: resources.getSpritesheet('mech-down') as TilesetResource,
      speed: 5,
    }),
  )

  colNr = colNr + 4
  worldMap.addObjectAt(
    LAYER_LABELS,
    colNr,
    rowNr + 5,
    new TextComponent({
      text: 'Fonts',
      font: '48px Tektur',
      orientation: 'vertical',
    }),
  )

  // LABELS layer
  colNr++
  worldMap.addObjectAt(
    LAYER_LABELS,
    colNr,
    rowNr + 5,
    new TextComponent({
      text: 'Vertical Flat',
      font: '32px BungeeSpice',
      orientation: 'vertical',
      skewOrientation: 'flat',
    }),
  )
  colNr++
  worldMap.addObjectAt(
    LAYER_LABELS,
    colNr,
    rowNr + 5,
    new TextComponent({
      text: 'Vertical Upright',
      font: '32px BungeeSpice',
      orientation: 'vertical',
      skewOrientation: 'upright',
    }),
  )
  colNr++
  worldMap.addObjectAt(
    LAYER_LABELS,
    colNr,
    rowNr + 4,
    new TextComponent({
      text: 'Horizontal Flat',
      font: '32px BungeeSpice',
      orientation: 'horizontal',
      skewOrientation: 'flat',
    }),
  )
  worldMap.addObjectAt(
    LAYER_LABELS,
    colNr,
    rowNr + 5,
    new TextComponent({
      text: 'Horizontal Upright',
      font: '32px BungeeSpice',
      orientation: 'horizontal',
      skewOrientation: 'upright',
    }),
  )

  return worldMap
}

export default devWorldBuilder
