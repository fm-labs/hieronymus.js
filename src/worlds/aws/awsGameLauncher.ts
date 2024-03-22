import { GameResourcesManager } from '../../../lib'
import { Game } from '../../../lib'
import { GridSystem } from '../../../lib'
import { TileMapSystem } from '../../../lib'
import { InputSystem } from '../../../lib'
import { WebUiSystem } from '../../../lib'
import { InfoSystem } from '../../../lib'
import awsWorldBuilder from './aws.world.ts'

export const awsGameLauncher = async (app: HTMLDivElement) => {
  const resources = new GameResourcesManager()
  const tileMap = await awsWorldBuilder(resources)

  // Init gamec
  const gameConfig = { name: 'AWS Inventory Game' }
  const game = new Game(app, gameConfig, tileMap, resources)

  game.addSystem(new InfoSystem(game))
  game.addSystem(new InputSystem(game))
  //game.addSystem(new GamepadInputSystem())
  //game.addSystem(new HeroSystem(game))

  game.addSystem(new GridSystem(game, tileMap))
  game.addSystem(new TileMapSystem(game, tileMap))

  //game.addSystem(new WebUiSystem(game, tileMap))

  return game
}
