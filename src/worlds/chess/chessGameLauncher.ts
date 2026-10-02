import type { GameConfig } from '../../../lib/game.types'
import { GameResourcesManager } from '../../../lib'
import { Game } from '../../../lib'
import { GridSystem } from '../../../lib'
import { TileMapSystem } from '../../../lib'
import { InputSystem } from '../../../lib'
import { InfoSystem } from '../../../lib'
import chessWorldBuilder from './chess.world.ts'
import { CameraSystem } from '../../../lib/systems/CameraSystem.ts'

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
