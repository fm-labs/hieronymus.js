import type { GameConfig } from '@fmlabs/world'
import { Game, GridSystem, TileMapSystem } from '@fmlabs/world'
import { InputSystem } from '@fmlabs/world'
import { InfoSystem } from '@fmlabs/world'
import { CameraSystem } from '@fmlabs/world'
import { RouletteSystem } from './RouletteSystem.ts'
import rouletteWorldBuilder from './roulette.world.ts'
import { GridLinesSystem } from '@fmlabs/world'

export const rouletteGameLauncher = async (app: HTMLDivElement) => {
  // Init gamec
  const config: GameConfig = { id: 'roulette', name: 'Roulette Game' }
  const game = new Game(app, config)

  game.addSystem(new InfoSystem(game))
  game.addSystem(new InputSystem(game))
  game.addSystem(new CameraSystem(game))
  //game.addSystem(new GamepadInputSystem())
  //game.addSystem(new HeroSystem(game))

  const tileMap = await rouletteWorldBuilder(game)
  game.addSystem(new GridLinesSystem(game, tileMap))
  game.addSystem(new GridSystem(game, tileMap))
  game.addSystem(new TileMapSystem(game, tileMap))
  //game.addSystem(new WebUiSystem(game, tileMap))
  game.addSystem(new RouletteSystem(game))
  return game
}
