import type { IGame, TileMapConfig, ITileMap } from '../../../lib/game.types'
import { isometricGridToScreen, TileMap } from '../../../lib'
import { SpriteComponent } from '../../../lib'
import { IsoTextComponent } from '../../../lib'
import { IsoCubeComponent } from '../../../lib'
import { IsoHexagonComponent } from '../../../lib'
import { IsoCylinderComponent } from '../../../lib'
import { AnimatedSpriteComponent } from '../../../lib'
import IsoCharacterComponent from '../../../lib/components/IsoCharacterComponent.ts'
import { IsoImageComponent } from '../../../lib/components/IsoImageComponent.ts'
import { MovingTileComponent } from '../../../lib/components/MovingTileComponent.ts'

const devWorldBuilder = async (game: IGame): Promise<ITileMap> => {
  const ROWS = 30
  const COLUMNS = 30
  const TILE_SIZE = 64

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
  await resources.loadTilesheet('mech-right', '/assets/sprites/mechanoid/Walk_Body_135.png', 6, 4)
  await resources.loadTilesheet('mech-down', '/assets/sprites/mechanoid/Walk_Body_225.png', 6, 4)
  await resources.loadTilesheet('mech-left', '/assets/sprites/mechanoid/Walk_Body_315.png', 6, 4)

  await resources.loadFont('BungeeSpice', '/assets/fonts/Bungee_Spice/BungeeSpice-Regular.ttf')
  await resources.loadFont('Tektur', '/assets/fonts/Tektur/Tektur-VariableFont_wdth,wght.ttf')

  await resources.loadImage(
    'icon1',
    '/aws/awsicons/Architecture-Service-Icons_01312023/Arch_Compute/64/Arch_Amazon-EC2_64.png',
  )

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
  worldMap.addLayer(LAYER_UNDERGROUND, { name: 'Underground', type: 'TILE', data: [] })
  worldMap.addLayer(LAYER_GROUND, { name: 'Ground', type: 'TILE', data: [] })
  worldMap.addLayer(LAYER_LABELS, { name: 'Labels', type: 'OBJECT', data: [] })
  worldMap.addLayer(LAYER_BUILDINGS, { name: 'Buildings', type: 'TILE', data: [], depthSort: true })
  worldMap.addLayer(LAYER_OBJECTS, { name: 'Objects', type: 'OBJECT', data: [], depthSort: true })

  let rowNr = 0

  // const tilesLayer = new TileMapLayer({ type: 'TILE', name: 'Tiles' })
  //tilesLayer.data = new Array(COLUMNS * ROWS).fill(0);
  // row = 1; col = 1;
  //tilesLayer.setTile(col, row, 'Tile', { backgroundColor: 'rgba(255,242,0,0.27)' });

  // const objectsLayer = new TileMapLayer({ type: 'OBJECT', name: 'Objects' })
  //objectsLayer.data = []

  //const componentId = components.add(new IsoCubeComponent({ tileSize: worldMap.tileWidth, width: worldMap.tileWidth, depth: 64 }))
  //objectsLayer.setTile(col, row, componentId)
  //objectsLayer.setObject(x, y, componentId)

  // const textEntityId = worldMap.components.add(
  //   new TextComponent({
  //     text: 'Tiles',
  //     font: '48px Tektur',
  //     orientation: 'horizontal',
  //   }),
  // )

  // moving tile
  worldMap.addObjectAtGridPos(
    LAYER_OBJECTS,
    10,
    10,
    new MovingTileComponent({
      width: worldMap.tileWidth,
      height: worldMap.tileHeight,
    }),
  )

  // image
  worldMap.addObjectAtGridPos(
    LAYER_LABELS,
    6,
    6,
    new IsoImageComponent({
      columns: COLUMNS,
      rows: ROWS,
      tileSize: TILE_SIZE,
      scale: 1,
      imageName: 'icon1',
      orientation: 'floor',
    }),
  )

  worldMap.addObjectAtGridPos(
    LAYER_LABELS,
    0,
    rowNr,
    new IsoTextComponent({
      text: 'Tiles',
      font: '48px Tektur',
      orientation: 'horizontal',
    }),
  )

  // TILE layer
  worldMap.createTile(LAYER_TILES, 0, rowNr, { backgroundColor: 'rgba(255,242,0,0.27)' })
  worldMap.createTile(LAYER_TILES, 1, rowNr, { backgroundColor: 'rgba(255,0,106,0.5)' })
  worldMap.createTile(LAYER_TILES, 2, rowNr, { backgroundColor: 'rgba(0,81,255,0.5)' })
  worldMap.createTile(LAYER_TILES, 3, rowNr, {})

  // SHAPES layer
  rowNr++
  rowNr++
  rowNr++
  worldMap.addObjectAtGridPos(
    LAYER_LABELS,
    0,
    rowNr,
    new IsoTextComponent({
      text: 'Shapes',
      font: '48px Tektur',
      orientation: 'horizontal',
    }),
  )

  // cube
  worldMap.addObjectAtGridPos(
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

  const isoCube2 = worldMap.components.createComponent('IsoCube', {
    tileSize: worldMap.tileWidth,
    width: worldMap.tileWidth / 2,
    depth: 32,
    //text: 'M4',
    elevation: 30,
  })
  worldMap.addObjectAtGridPos(LAYER_OBJECTS, 1, rowNr, isoCube2)

  const isoCube3 = worldMap.components.createComponent('IsoCube', {
    tileSize: worldMap.tileWidth,
    width: worldMap.tileWidth / 3,
    depth: 24,
    //text: 'M4',
    elevation: 90,
  })
  worldMap.addObjectAtGridPos(LAYER_OBJECTS, 3, rowNr, isoCube3)

  // hexagon
  rowNr++
  worldMap.addObjectAtGridPos(
    LAYER_OBJECTS,
    0,
    rowNr,
    new IsoHexagonComponent({
      tileSize: worldMap.tileWidth,
      sideLength: worldMap.tileWidth / 2,
      depth: 64,
    }),
  )
  worldMap.addObjectAtGridPos(
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
  worldMap.addObjectAtGridPos(
    LAYER_OBJECTS,
    0,
    rowNr,
    new IsoCylinderComponent({
      tileSize: worldMap.tileWidth,
      radius: worldMap.tileWidth / 4,
      depth: 64,
    }),
  )
  worldMap.addObjectAtGridPos(
    LAYER_OBJECTS,
    1,
    rowNr,
    new IsoCylinderComponent({
      tileSize: worldMap.tileWidth,
      radius: worldMap.tileWidth / 8,
      depth: 32,
    }),
  )

  // BUILDINGS layer
  rowNr++
  rowNr++
  rowNr++
  worldMap.addObjectAtGridPos(
    LAYER_LABELS,
    0,
    rowNr,
    new IsoTextComponent({
      text: 'Sprites',
      font: '48px Tektur',
      orientation: 'horizontal',
    }),
  )

  worldMap.addTile(
    LAYER_BUILDINGS,
    0,
    rowNr,
    new SpriteComponent({
      tileSize: worldMap.tileWidth,
      spriteId: 6,
      //spriteImage: resources.getSprite(6),
    }),
  )
  worldMap.addTile(
    LAYER_BUILDINGS,
    1,
    rowNr,
    new SpriteComponent({
      tileSize: worldMap.tileWidth,
      spriteId: 7,
      //spriteImage: resources.getSprite(7),
    }),
  )
  worldMap.addTile(
    LAYER_BUILDINGS,
    2,
    rowNr,
    new SpriteComponent({
      tileSize: worldMap.tileWidth,
      spriteId: 8,
      //spriteImage: resources.getSprite(8),
    }),
  )

  // animated
  rowNr = 0
  const secondColStart = 5
  let colNr = secondColStart

  worldMap.addObjectAtGridPos(
    LAYER_LABELS,
    colNr,
    rowNr + 5,
    new IsoTextComponent({
      text: 'Animations',
      font: '48px Tektur',
      orientation: 'vertical',
    }),
  )
  worldMap.addObjectAtGridPos(
    LAYER_OBJECTS,
    6,
    2,
    new AnimatedSpriteComponent({
      tileSize: worldMap.tileWidth,
      tilesheetName: 'mech-up',
      speed: 5,
    }),
  )
  worldMap.addObjectAtGridPos(
    LAYER_OBJECTS,
    5,
    3,
    new AnimatedSpriteComponent({
      tileSize: worldMap.tileWidth,
      tilesheetName: 'mech-right',
      speed: 5,
      elevation: 50,
    }),
  )
  // worldMap.addObjectAt(
  //   LAYER_OBJECTS,
  //   7,
  //   2,
  //   new AnimatedSpriteComponent({
  //     tileSize: worldMap.tileWidth,
  //     tileset: resources.getSpritesheet('mech-left') as TilesheetResource,
  //     speed: 1,
  //   }),
  // )
  worldMap.addObjectAtGridPos(
    LAYER_OBJECTS,
    7,
    3,
    new AnimatedSpriteComponent({
      tileSize: worldMap.tileWidth,
      tilesheetName: 'mech-left',
      speed: 5,
    }),
  )
  // worldMap.addObjectAt(
  //   LAYER_OBJECTS,
  //   7,
  //   4,
  //   new AnimatedSpriteComponent({
  //     tileSize: worldMap.tileWidth,
  //     tileset: resources.getSpritesheet('mech-left') as TilesheetResource,
  //     speed: 10,
  //   }),
  // )
  // worldMap.addObjectAtGridPos(
  //   LAYER_OBJECTS,
  //   6,
  //   4,
  //   new IsoCharacterComponent({
  //     name: 'hero-character',
  //     tileSize: worldMap.tileWidth,
  //     tilesheetName: 'mech',
  //     speed: 5,
  //     movementSpeed: 2,
  //     movementDirection: undefined,
  //   }),
  // )

  colNr = colNr + 4
  worldMap.addObjectAtGridPos(
    LAYER_LABELS,
    colNr,
    rowNr + 5,
    new IsoTextComponent({
      text: 'Fonts',
      font: '48px Tektur',
      orientation: 'vertical',
    }),
  )

  // LABELS layer
  colNr++
  worldMap.addObjectAtGridPos(
    LAYER_LABELS,
    colNr,
    rowNr + 5,
    new IsoTextComponent({
      text: 'Vertical Flat',
      font: '32px BungeeSpice',
      orientation: 'vertical',
      skewOrientation: 'flat',
    }),
  )
  colNr++
  worldMap.addObjectAtGridPos(
    LAYER_LABELS,
    colNr,
    rowNr + 5,
    new IsoTextComponent({
      text: 'Vertical Upright',
      font: '32px BungeeSpice',
      orientation: 'vertical',
      skewOrientation: 'upright',
    }),
  )
  colNr++
  worldMap.addObjectAtGridPos(
    LAYER_LABELS,
    colNr,
    rowNr + 4,
    new IsoTextComponent({
      text: 'Horizontal Flat',
      font: '32px BungeeSpice',
      orientation: 'horizontal',
      skewOrientation: 'flat',
    }),
  )
  worldMap.addObjectAtGridPos(
    LAYER_LABELS,
    colNr,
    rowNr + 5,
    new IsoTextComponent({
      text: 'Horizontal Upright',
      font: '32px BungeeSpice',
      orientation: 'horizontal',
      skewOrientation: 'upright',
    }),
  )

  // worldMap.addObjectAt(LAYER_LABELS, colNr, rowNr + 5, 'Text', {
  //   text: 'Horizontal Upright',
  //   font: '32px BungeeSpice',
  //   orientation: 'horizontal',
  //   skewOrientation: 'upright',
  // })

  return worldMap
}

export default devWorldBuilder
