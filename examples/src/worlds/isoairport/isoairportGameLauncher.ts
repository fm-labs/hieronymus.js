import type { GameConfig } from '@fmlabs/hieronymus'
import { CameraSystem, Game, InputSystem, TileMapSystem } from '@fmlabs/hieronymus'
import isoAirportWorldBuilder, { LAYER_SKY, LAYER_VEHICLES } from './isoairport.world.ts'
import { IsoAirportSystem } from './IsoAirportSystem.ts'

export const isoairportGameLauncher = async (app: HTMLDivElement) => {
  const config: GameConfig = { id: 'isoairport', name: 'Iso Airport', fullscreen: true }
  const game = new Game(app, config)

  game.addSystem(new InputSystem(game))
  // WASD and the mouse wheel pan, ctrl/cmd + wheel zooms
  game.addSystem(new CameraSystem(game))

  // e.g. ?world=isoairport&hour=22 starts at night
  const hour = parseFloat(new URLSearchParams(window.location.search).get('hour') ?? '')
  const world = await isoAirportWorldBuilder(
    undefined,
    Number.isFinite(hour) ? hour % 24 : undefined,
  )
  // added before the TileMapSystem, so each frame draws the planes of the same frame
  game.addSystem(
    new IsoAirportSystem(game, world, { vehicleLayer: LAYER_VEHICLES, skyLayer: LAYER_SKY }),
  )
  game.addSystem(new TileMapSystem(game, world.tileMap))

  return game
}
