import { Game } from '../../../lib'
import { GridSystem } from '../../../lib'
import { TileMapSystem } from '../../../lib'
import { InputSystem } from '../../../lib'
import { TileMapEditorSystem } from '../../../lib'
import { InfoSystem } from '../../../lib'
import { CameraSystem } from '../../../lib/systems/CameraSystem.ts'
import devWorldBuilder from './dev.world.ts'
import { MechDemoSystem } from '../../../lib/systems/MechDemoSystem.ts'

export const devGameLauncher = async (app: HTMLDivElement) => {
  // Init gamec
  const config: GameConfig = { id: 'dev', name: 'Dev Game' }
  const game = new Game(app, config)

  game.addSystem(new InfoSystem(game))
  game.addSystem(new InputSystem(game))
  game.addSystem(new CameraSystem(game))
  //game.addSystem(new GamepadInputSystem())
  //game.addSystem(new HeroSystem(game))

  const tileMap = await devWorldBuilder(game)
  game.addSystem(new GridSystem(game, tileMap))
  game.addSystem(new TileMapSystem(game, tileMap))
  game.addSystem(new TileMapEditorSystem(game, tileMap))
  game.addSystem(new MechDemoSystem(game, tileMap))

  return game
}
