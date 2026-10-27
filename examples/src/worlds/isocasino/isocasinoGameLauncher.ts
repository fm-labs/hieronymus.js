import type { GameConfig } from '@fmlabs/world'
import { CameraSystem, Game, InputSystem, TileMapSystem } from '@fmlabs/world'
import isoCasinoWorldBuilder, { LAYER_GUESTS } from './isocasino.world.ts'
import { IsoCasinoSystem } from './IsoCasinoSystem.ts'

export const isocasinoGameLauncher = async (app: HTMLDivElement) => {
  const config: GameConfig = { id: 'isocasino', name: 'Iso Casino', fullscreen: true }
  const game = new Game(app, config)

  game.addSystem(new InputSystem(game))
  // WASD and the mouse wheel pan, ctrl/cmd + wheel zooms
  game.addSystem(new CameraSystem(game))

  const world = await isoCasinoWorldBuilder()
  // added before the TileMapSystem, so each frame draws the guests of the same frame
  game.addSystem(new IsoCasinoSystem(game, world, { guestLayer: LAYER_GUESTS }))
  game.addSystem(new TileMapSystem(game, world.tileMap))

  return game
}
