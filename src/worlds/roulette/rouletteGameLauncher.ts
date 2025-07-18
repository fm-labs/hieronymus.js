import { Game } from '../../../lib'
import { GridSystem } from '../../../lib'
import { TileMapSystem } from '../../../lib'
import { InputSystem } from '../../../lib'
import { TileMapEditorSystem } from '../../../lib'
import { InfoSystem } from '../../../lib'
import { CameraSystem } from '../../../lib/systems/CameraSystem.ts'
import rouletteWorldBuilder from './roulette.world.ts'
import { RoutletteSystem } from '../../../lib/systems/RouletteSystem.ts'

export const rouletteGameLauncher = async (app: HTMLDivElement) => {
  // Init gamec
  const config: GameConfig = { id: 'roulette', name: 'Roulette Game' }
  const game = new Game(app, config)

  game.addSystem(new InfoSystem(game))
  game.addSystem(new InputSystem(game))
  game.addSystem(new CameraSystem(game))
  //game.addSystem(new GamepadInputSystem())
  //game.addSystem(new HeroSystem(game))

  //const tileMap = await rouletteWorldBuilder(game)
  //game.addSystem(new GridSystem(game, tileMap))
  //game.addSystem(new TileMapSystem(game, tileMap))
  //game.addSystem(new WebUiSystem(game, tileMap))
  game.addSystem(new RoutletteSystem(game))
  return game
}
