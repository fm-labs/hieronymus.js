import type { IGame, ITileMap, TileMapConfig } from '@fmlabs/hieronimo'
import { TileMap } from '@fmlabs/hieronimo'
import { IsoSnakeBoardComponent } from './IsoSnakeBoardComponent.ts'

export const ISOSNAKE_COLUMNS = 16
export const ISOSNAKE_ROWS = 16
export const ISOSNAKE_TILE_SIZE = 64

export const LAYER_BOARD = 0
export const LAYER_FOOD = 1
export const LAYER_SNAKE = 2

const isoSnakeWorldBuilder = async (game: IGame): Promise<ITileMap> => {
  const worldConfig: TileMapConfig = {
    columns: ISOSNAKE_COLUMNS,
    rows: ISOSNAKE_ROWS,
    tileSize: ISOSNAKE_TILE_SIZE,
    projection: 'isometric',
  }
  const worldMap = new TileMap(worldConfig)

  worldMap.addLayer(LAYER_BOARD, { name: 'Board', type: 'OBJECT', data: [] })
  // food and snake stand up from the ground, so they are depth-sorted together
  worldMap.addLayer(LAYER_FOOD, { name: 'Food', type: 'OBJECT', data: [], depthSort: true })
  worldMap.addLayer(LAYER_SNAKE, { name: 'Snake', type: 'OBJECT', data: [], depthSort: true })

  worldMap.addObjectAtGridPos(
    LAYER_BOARD,
    0,
    0,
    new IsoSnakeBoardComponent({
      columns: ISOSNAKE_COLUMNS,
      rows: ISOSNAKE_ROWS,
      tileSize: ISOSNAKE_TILE_SIZE,
    }),
  )

  return worldMap
}

export default isoSnakeWorldBuilder
