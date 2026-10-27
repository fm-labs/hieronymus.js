import type { IGame, TileMapConfig, ITileMap } from '@fmlabs/world'
import {
  IsoCubeComponent,
  IsoCylinderComponent,
  orthogonalGridToScreen,
  SpriteComponent,
  TileMap,
} from '@fmlabs/world'
import { IsoTextComponent } from '@fmlabs/world'
import { TileComponent } from '@fmlabs/world'
import { LineComponent } from '@fmlabs/world'
import { TextComponent } from '@fmlabs/world'

const buildChessPeaceSpriteComponent = (
  tileSize: number,
  pieceColor: 'white' | 'black',
  pieceType: 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king',
): SpriteComponent => {
  // return new SpriteComponent({
  //   tileSize: tileSize,
  //   spriteSheetId: 'chess-pieces',
  //   spriteName: `${pieceColor}_${pieceType}`,
  //   scale: 1,
  //   offsetX: 0,
  //   offsetY: 0,
  // })
  let spriteId = 1
  switch (pieceType) {
    case 'pawn':
      spriteId = pieceColor === 'white' ? 1 : 7
      break
    case 'rook':
      spriteId = pieceColor === 'white' ? 2 : 8
      break
    case 'knight':
      spriteId = pieceColor === 'white' ? 3 : 9
      break
    case 'bishop':
      spriteId = pieceColor === 'white' ? 4 : 10
      break
    case 'queen':
      spriteId = pieceColor === 'white' ? 5 : 11
      break
    case 'king':
      spriteId = pieceColor === 'white' ? 6 : 12
      break
  }

  const _sprite = new SpriteComponent({
    tileSize: tileSize,
    spriteId: spriteId,
    data: {},
  })
  return _sprite
}

const chessWorldBuilder = async (game: IGame): Promise<ITileMap> => {
  const ROWS = 8
  const COLUMNS = 8
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
    0,
    0,
    new IsoTextComponent({
      text: 'Isometric Casino',
      font: '48px Tektur',
      orientation: 'horizontal',
    }),
  )

  const initialPositions = [
    ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'],
    ['pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn'],
    [],
    [],
    [],
    [],
    ['_pawn', '_pawn', '_pawn', '_pawn', '_pawn', '_pawn', '_pawn', '_pawn'],
    ['_rook', '_knight', '_bishop', '_queen', '_king', '_bishop', '_knight', '_rook'],
  ]

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      const piece = initialPositions[row][col]
      if (piece) {
        const isWhite = !piece.startsWith('_')
        const pieceType = isWhite ? piece : piece.substring(1)
        const spriteComponent = buildChessPeaceSpriteComponent(
          TILE_SIZE,
          isWhite ? 'white' : 'black',
          pieceType as 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king',
        )
        worldMap.addTile(LAYER_BUILDINGS, col, row, spriteComponent)
      }
    }
  }

  return worldMap
}

export default chessWorldBuilder
