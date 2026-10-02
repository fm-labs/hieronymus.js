import type { GameConfig } from '../../../lib/game.types'
import { GameResourcesManager } from '../../../lib'
import { Game } from '../../../lib'
import { GridSystem } from '../../../lib'
import { TileMapSystem } from '../../../lib'
import { InputSystem } from '../../../lib'
import { InfoSystem } from '../../../lib'
import casinoWorldBuilder from './casino.world.ts'
import { CameraSystem } from '../../../lib/systems/CameraSystem.ts'
import gameIdx from './gameidx-web.json'

const fetchInventory = async (): Promise<any> => {
  return gameIdx
}

export const casinoGameLauncher = async (app: HTMLDivElement) => {
  const urlParams = new URLSearchParams(window.location.search)

  const casinoInventory: any = await fetchInventory()

  console.log('AWS Inventory Items:', casinoInventory.length)
  if (casinoInventory.length === 0) {
    throw new Error('No inventory items found')
  }

  // Init gamec
  const config: GameConfig = { id: 'casino', name: 'AWS Inventory Game' }
  const game = new Game(app, config)

  game.addSystem(new InfoSystem(game))
  game.addSystem(new InputSystem(game))
  game.addSystem(new CameraSystem(game))
  //game.addSystem(new GamepadInputSystem())
  //game.addSystem(new HeroSystem(game))

  if (casinoInventory) {
    const tileMap = await casinoWorldBuilder(game, casinoInventory)
    game.addSystem(new TileMapSystem(game, tileMap))
    game.addSystem(new GridSystem(game, tileMap))
  } else {
    throw new Error('No inventory provided')
  }

  //game.addSystem(new WebUiSystem(game, tileMap))

  return game
}
