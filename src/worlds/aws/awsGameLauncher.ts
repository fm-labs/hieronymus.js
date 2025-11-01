import { GameResourcesManager } from '../../../lib'
import { Game } from '../../../lib'
import { GridSystem } from '../../../lib'
import { TileMapSystem } from '../../../lib'
import { InputSystem } from '../../../lib'
import { TileMapEditorSystem } from '../../../lib'
import { InfoSystem } from '../../../lib'
import awsWorldBuilder from './aws.world.ts'
import { CameraSystem } from '../../../lib/systems/CameraSystem.ts'
import { AwsInventoryItemFull } from '../../../../cloudia-common/src'
import { InventorySystem } from './InventorySystem.ts'

const fetchInventory = async (url: string): Promise<AwsInventoryItemFull[]> => {
  return await fetch(url).then((response) => {
    return response.json()
  })
}

export const awsGameLauncher = async (app: HTMLDivElement) => {
  const urlParams = new URLSearchParams(window.location.search)
  const inventoryUrl = urlParams.get('inventory') || '/aws/inventory/aws.inventory.json'
  const awsInventory: AwsInventoryItemFull[] = await fetchInventory(inventoryUrl)
  console.log('AWS Inventory Items:', awsInventory.length)
  if (awsInventory.length === 0) {
    throw new Error('No inventory items found')
  }

  // Init gamec
  const config: GameConfig = { id: 'aws', name: 'AWS Inventory Game' }
  const game = new Game(app, config)

  game.addSystem(new InfoSystem(game))
  game.addSystem(new InputSystem(game))
  game.addSystem(new CameraSystem(game))
  //game.addSystem(new GamepadInputSystem())
  //game.addSystem(new HeroSystem(game))

  if (inventoryUrl) {
    const tileMap = await awsWorldBuilder(game, awsInventory)
    game.addSystem(new GridSystem(game, tileMap))
    game.addSystem(new TileMapSystem(game, tileMap))
    game.addSystem(new InventorySystem(game, awsInventory))
  } else {
    throw new Error('No inventory URL provided')
  }

  //game.addSystem(new WebUiSystem(game, tileMap))

  return game
}
