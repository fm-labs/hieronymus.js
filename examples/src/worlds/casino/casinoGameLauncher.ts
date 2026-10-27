import type { GameConfig } from '@fmlabs/world'
import { GameResourcesManager } from '@fmlabs/world'
import { Game } from '@fmlabs/world'
import { GridSystem } from '@fmlabs/world'
import { TileMapSystem } from '@fmlabs/world'
import { InputSystem } from '@fmlabs/world'
import { InfoSystem } from '@fmlabs/world'
import casinoWorldBuilder from './casino.world.ts'
import { CameraSystem } from '@fmlabs/world'
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
