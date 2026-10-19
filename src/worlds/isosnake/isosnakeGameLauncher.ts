import type { GameConfig } from '../../../lib/game.types'
import { Game, InputSystem, TileMapSystem } from '../../../lib'
import isoSnakeWorldBuilder, { LAYER_FOOD, LAYER_SNAKE } from './isosnake.world.ts'
import { SnakeSystem } from '../snake/SnakeSystem.ts'
import { IsoSnakeCellComponent } from './IsoSnakeCellComponent.ts'

export const isosnakeGameLauncher = async (app: HTMLDivElement) => {
  const config: GameConfig = { id: 'isosnake', name: 'Isometric Snake', fullscreen: true }
  const game = new Game(app, config)

  // no CameraSystem: WASD steers the snake, and the SnakeSystem positions the camera itself
  game.addSystem(new InputSystem(game))

  const tileMap = await isoSnakeWorldBuilder(game)
  // same rules and controls as the 'snake' world, only the projection and components differ
  game.addSystem(
    new SnakeSystem(game, tileMap, {
      foodLayer: LAYER_FOOD,
      snakeLayer: LAYER_SNAKE,
      highScoreKey: 'world.isosnake.highscore',
      createCell: (kind, color) =>
        new IsoSnakeCellComponent({ tileSize: tileMap.tileWidth, kind, color }),
    }),
  )
  game.addSystem(new TileMapSystem(game, tileMap))

  return game
}
