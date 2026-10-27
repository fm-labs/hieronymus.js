import type { IGame, ITileMap, TileMapConfig } from '@fmlabs/world'
import { TileMap } from '@fmlabs/world'
import { SnakeBoardComponent } from './SnakeBoardComponent.ts'

export const SNAKE_COLUMNS = 20
export const SNAKE_ROWS = 20
export const SNAKE_TILE_SIZE = 32

export const LAYER_BOARD = 0
export const LAYER_FOOD = 1
export const LAYER_SNAKE = 2

const snakeWorldBuilder = async (game: IGame): Promise<ITileMap> => {
  const worldConfig: TileMapConfig = {
    columns: SNAKE_COLUMNS,
    rows: SNAKE_ROWS,
    tileSize: SNAKE_TILE_SIZE,
    projection: 'orthogonal',
  }
  const worldMap = new TileMap(worldConfig)

  worldMap.addLayer(LAYER_BOARD, { name: 'Board', type: 'OBJECT', data: [] })
  worldMap.addLayer(LAYER_FOOD, { name: 'Food', type: 'OBJECT', data: [] })
  worldMap.addLayer(LAYER_SNAKE, { name: 'Snake', type: 'OBJECT', data: [] })

  worldMap.addObjectAtGridPos(
    LAYER_BOARD,
    0,
    0,
    new SnakeBoardComponent({
      columns: SNAKE_COLUMNS,
      rows: SNAKE_ROWS,
      tileSize: SNAKE_TILE_SIZE,
    }),
  )

  return worldMap
}

export default snakeWorldBuilder
