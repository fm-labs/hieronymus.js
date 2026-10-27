import type { GameConfig } from '@fmlabs/world'
import { GameResourcesManager } from '@fmlabs/world'
import { Game } from '@fmlabs/world'
import { GridSystem } from '@fmlabs/world'
import { TileMapSystem } from '@fmlabs/world'
import { InputSystem } from '@fmlabs/world'
import { InfoSystem } from '@fmlabs/world'
import chessWorldBuilder from './chess.world.ts'
import { CameraSystem } from '@fmlabs/world'

export const chessGameLauncher = async (app: HTMLDivElement) => {
  // Init gamec
  const config: GameConfig = { id: 'chess', name: 'AWS Inventory Game' }
  const game = new Game(app, config)

  game.addSystem(new InfoSystem(game))
  game.addSystem(new InputSystem(game))
  game.addSystem(new CameraSystem(game))
  //game.addSystem(new GamepadInputSystem())
  //game.addSystem(new HeroSystem(game))

  const tileMap = await chessWorldBuilder(game)
  game.addSystem(new TileMapSystem(game, tileMap))
  game.addSystem(new GridSystem(game, tileMap))

  //game.addSystem(new WebUiSystem(game, tileMap))

  return game
}
