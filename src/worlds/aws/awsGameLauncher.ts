import { GameResourcesManager } from '../../../lib'
import { Game } from '../../../lib'
import { GridSystem } from '../../../lib'
import { TileMapSystem } from '../../../lib'
import { InputSystem } from '../../../lib'
import { TileMapEditorSystem } from '../../../lib'
import { InfoSystem } from '../../../lib'
import awsWorldBuilder from './aws.world.ts'
import { CameraSystem } from '../../../lib/systems/CameraSystem.ts'

export const awsGameLauncher = async (app: HTMLDivElement) => {
  const urlParams = new URLSearchParams(window.location.search)
  const inventoryUrl = urlParams.get('inventory') || '/aws/inventory/aws.inventory.json'

  // Init gamec
  const config: GameConfig = { id: 'aws', name: 'AWS Inventory Game' }
  const game = new Game(app, config)

  game.addSystem(new InfoSystem(game))
  game.addSystem(new InputSystem(game))
  game.addSystem(new CameraSystem(game))
  //game.addSystem(new GamepadInputSystem())
  //game.addSystem(new HeroSystem(game))

  if (inventoryUrl) {
    const tileMap = await awsWorldBuilder(game, inventoryUrl)
    game.addSystem(new GridSystem(game, tileMap))
    game.addSystem(new TileMapSystem(game, tileMap))
  } else {
    throw new Error('No inventory URL provided')
  }

  //game.addSystem(new WebUiSystem(game, tileMap))

  return game
}
