import { GameResourcesManager } from '../lib/kernel/GameResourcesManager.ts'
import devWorldBuilder from './worlds/dev/dev.world.ts'
import { Game } from '../lib/kernel/Game.ts'
import { GridSystem } from '../lib/systems/GridSystem.ts'
import { TileMapSystem } from '../lib/systems/TileMapSystem.ts'
import { InputSystem } from '../lib/systems/InputSystem.ts'
import { WebUiSystem } from '../lib/systems/WebUiSystem.ts'
import { InfoSystem } from '../lib/systems/InfoSystem.ts'

export const WorldGame = async (app: HTMLDivElement) => {
  const resources = new GameResourcesManager()
  const worldMap = await devWorldBuilder(resources)

  // Init gamec
  const gameConfig = { name: 'My Game' }
  const game = new Game(app, gameConfig, worldMap, resources)

  // game.addSystem(new DebugSystem())
  // game.addSystem(new OrthogonalGridSystem())
  game.addSystem(new InfoSystem(game))
  game.addSystem(new InputSystem(game))
  game.addSystem(new GridSystem(game, worldMap))
  game.addSystem(new TileMapSystem(game, worldMap))
  //game.addSystem(new HeroSystem(game))
  //game.addSystem(new GamepadInputSystem())
  //game.addSystem(new WebUiSystem(game))

  return game
}
