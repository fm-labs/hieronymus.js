import type { GameConfig } from '../../../lib/game.types'
import { CameraSystem, Game, InputSystem, TileMapSystem } from '../../../lib'
import isoVegasWorldBuilder, { LAYER_VEHICLES } from './isovegas.world.ts'
import { IsoVegasSystem } from './IsoVegasSystem.ts'

export const isovegasGameLauncher = async (app: HTMLDivElement) => {
  const config: GameConfig = { id: 'isovegas', name: 'Iso Vegas', fullscreen: true }
  const game = new Game(app, config)

  game.addSystem(new InputSystem(game))
  // WASD and the mouse wheel pan, ctrl/cmd + wheel zooms
  game.addSystem(new CameraSystem(game))

  // e.g. ?world=isovegas&hour=22 starts at night
  const hour = parseFloat(new URLSearchParams(window.location.search).get('hour') ?? '')
  const world = await isoVegasWorldBuilder(undefined, Number.isFinite(hour) ? hour % 24 : undefined)
  // added before the TileMapSystem, so each frame draws the vehicles of the same frame
  game.addSystem(new IsoVegasSystem(game, world, { vehicleLayer: LAYER_VEHICLES }))
  game.addSystem(new TileMapSystem(game, world.tileMap))

  return game
}
