import { TileMap } from '../../../lib'
import { SpriteComponent } from '../../../lib'
import { TextComponent } from '../../../lib'
import { IsoCubeComponent } from '../../../lib'
import { IsoHexagonComponent } from '../../../lib'
import { IsoCylinderComponent } from '../../../lib'
import { AnimatedSpriteComponent } from '../../../lib'

const ROULETTE_SINGLE_WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14,
  31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
]

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]
const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]

const rouletteWorldBuilder = async (game: IGame): Promise<ITileMap> => {
  const ROWS = 7
  const COLUMNS = 20
  const TILE_SIZE = 92

  const LAYER_TILES = 0
  const LAYER_UNDERGROUND = 1
  const LAYER_GROUND = 2
  const LAYER_LABELS = 3
  const LAYER_BUILDINGS = 4
  const LAYER_OBJECTS = 5

  const resources = game.resources

  // // Init resources
  // await resources.loadSpritesheet(
  //   'fm_iso_buildings',
  //   '/assets/sprites/fm_iso_buildings/fm_iso_buildings.png',
  //   1,
  // )
  // await resources.loadSpritesheet(
  //   'fm_iso_pyramids',
  //   '/assets/sprites/fm_iso_pyramids/fm_iso_pyramids.png',
  //   32,
  // )
  // await resources.loadTilesheet('mech-up', '/assets/sprites/mechanoid/Walk_Body_045.png', 6, 4, 64)
  // await resources.loadTilesheet('mech-left', '/assets/sprites/mechanoid/Walk_Body_135.png', 6, 4)
  // await resources.loadTilesheet('mech-down', '/assets/sprites/mechanoid/Walk_Body_225.png', 6, 4)
  // await resources.loadTilesheet('mech-right', '/assets/sprites/mechanoid/Walk_Body_315.png', 6, 4)

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
  worldMap.addLayer(LAYER_TILES, { name: 'Tiles', type: 'TILE', data: [] })
  worldMap.addLayer(LAYER_LABELS, { name: 'Labels', type: 'OBJECT', data: [] })
  worldMap.addLayer(LAYER_OBJECTS, { name: 'Objects', type: 'OBJECT', data: [] })

  const rowNr = 0

  worldMap.addObjectAtGridPos(
    LAYER_LABELS,
    0,
    rowNr,
    new TextComponent({
      text: 'Roulette',
      font: '48px Tektur',
      orientation: 'horizontal',
    }),
  )

  // TILE layer
  // worldMap.addTile(LAYER_TILES, 0, rowNr, { backgroundColor: 'rgba(255,242,0,0.27)' })
  // worldMap.addTile(LAYER_TILES, 1, rowNr, { backgroundColor: 'rgba(255,0,106,0.5)' })
  // worldMap.addTile(LAYER_TILES, 2, rowNr, { backgroundColor: 'rgba(0,81,255,0.5)' })
  // worldMap.addTile(LAYER_TILES, 3, rowNr, {})

  const baseOffsetX = 1
  const baseOffsetY = 4

  const zeroX = baseOffsetX
  const zeroY = baseOffsetY
  for (let i = 0; i < 3; i++) {
    worldMap.createTile(LAYER_TILES, zeroX, zeroY - i, {
      backgroundColor: 'rgba(62,159,68,0.5)',
      color: 'rgba(255,255,255,0.5)',
      text: '0',
    })
  }

  for (let i = 0; i < 36; i++) {
    const number = i + 1
    const y = zeroY - (i % 3)
    const x = zeroX + 1 + Math.floor(i / 3)

    const colorRed = 'rgba(255,0,0,0.5)'
    const colorBlack = 'rgba(0,0,0,0.5)'
    let bgColor = colorBlack
    if (RED_NUMBERS.includes(number)) {
      bgColor = colorRed
    }

    worldMap.createTile(LAYER_TILES, x, y, {
      backgroundColor: bgColor,
      color: 'rgba(255,255,255,0.8)',
      text: number.toString(),
    })

    worldMap.addObjectAtGridPos(
      LAYER_LABELS,
      x + 1,
      y + 1,
      new TextComponent({
        text: number.toString(),
        font: '32px BungeeSpice',
        orientation: 'vertical',
        skewOrientation: 'flat',
      }),
    )

    for (let j = 0; j < 5; j++) {
      worldMap.addObjectAtGridPos(
        LAYER_OBJECTS,
        10 + j,
        11,
        new IsoCylinderComponent({
          tileSize: worldMap.tileWidth,
          radius: 24,
          depth: 48,
        }),
      )
    }
  }

  return worldMap
}

export default rouletteWorldBuilder
