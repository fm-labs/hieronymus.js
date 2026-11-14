import type { GameConfig } from '@fmlabs/hieronimo'
import { Game, InputSystem, TileMapSystem } from '@fmlabs/hieronimo'
import snakeWorldBuilder, { LAYER_FOOD, LAYER_SNAKE } from './snake.world.ts'
import { SnakeSystem } from './SnakeSystem.ts'
import { SnakeCellComponent } from './SnakeCellComponent.ts'

export const snakeGameLauncher = async (app: HTMLDivElement) => {
  const config: GameConfig = { id: 'snake', name: 'Snake', fullscreen: true }
  const game = new Game(app, config)

  // no CameraSystem: WASD steers the snake, and the SnakeSystem positions the camera itself
  game.addSystem(new InputSystem(game))

  const tileMap = await snakeWorldBuilder(game)
  // added before the TileMapSystem, so each frame draws the state of the same frame
  game.addSystem(
    new SnakeSystem(game, tileMap, {
      foodLayer: LAYER_FOOD,
      snakeLayer: LAYER_SNAKE,
      createCell: (kind, color) => new SnakeCellComponent({ size: tileMap.tileWidth, kind, color }),
    }),
  )
  game.addSystem(new TileMapSystem(game, tileMap))

  return game
}
