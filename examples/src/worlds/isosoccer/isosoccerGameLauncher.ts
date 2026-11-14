import type { GameConfig } from '@fmlabs/hieronymus'
import { CameraSystem, Game, InputSystem, TileMapSystem } from '@fmlabs/hieronymus'
import isoSoccerWorldBuilder, { LAYER_MOVERS } from './isosoccer.world.ts'
import { IsoSoccerSystem } from './IsoSoccerSystem.ts'

export const isosoccerGameLauncher = async (app: HTMLDivElement) => {
  const config: GameConfig = { id: 'isosoccer', name: 'Iso Soccer', fullscreen: true }
  const game = new Game(app, config)

  game.addSystem(new InputSystem(game))
  // WASD and the mouse wheel pan, ctrl/cmd + wheel zooms
  game.addSystem(new CameraSystem(game))

  const world = await isoSoccerWorldBuilder()
  // added before the TileMapSystem, so each frame draws the players of the same frame
  game.addSystem(new IsoSoccerSystem(game, world, { moverLayer: LAYER_MOVERS }))
  game.addSystem(new TileMapSystem(game, world.tileMap))

  return game
}
