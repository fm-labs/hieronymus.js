import type { GameConfig } from '@fmlabs/world'
import { Game, GamepadSystem, HeroSystem } from '@fmlabs/world'
import { GridSystem } from '@fmlabs/world'
import { TileMapSystem } from '@fmlabs/world'
import { InputSystem } from '@fmlabs/world'
import { TileMapEditorSystem } from '@fmlabs/world'
import { InfoSystem } from '@fmlabs/world'
import { CameraSystem } from '@fmlabs/world'
import devWorldBuilder from './dev.world.ts'
import { MechDemoSystem } from './MechDemoSystem.ts'
import { GridLinesSystem } from '@fmlabs/world'

export const devGameLauncher = async (app: HTMLDivElement) => {
  // Init gamec
  const config: GameConfig = { id: 'dev', name: 'Dev Game' }
  const game = new Game(app, config)

  game.addSystem(new InfoSystem(game))
  game.addSystem(new InputSystem(game))
  game.addSystem(new CameraSystem(game))
  game.addSystem(new GamepadSystem(game))
  //game.addSystem(new HeroSystem(game))

  const tileMap = await devWorldBuilder(game)
  game.addSystem(new GridSystem(game, tileMap))
  game.addSystem(new GridLinesSystem(game, tileMap))
  game.addSystem(new TileMapSystem(game, tileMap))
  game.addSystem(new TileMapEditorSystem(game, tileMap))
  game.addSystem(new MechDemoSystem(game, tileMap, 5)) // 5 = 'Objects' layer, depth-sorted with the buildings

  return game
}
