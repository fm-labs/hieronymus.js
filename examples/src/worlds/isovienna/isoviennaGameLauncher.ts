import type { GameConfig } from '@fmlabs/hieronymus'
import { CameraSystem, Game, InputSystem, TileMapSystem } from '@fmlabs/hieronymus'
import isoViennaWorldBuilder, { LAYER_VEHICLES } from './isovienna.world.ts'
import { IsoViennaSystem } from './IsoViennaSystem.ts'

export const isoviennaGameLauncher = async (app: HTMLDivElement) => {
  const config: GameConfig = { id: 'isovienna', name: 'Iso Vienna', fullscreen: true }
  const game = new Game(app, config)

  game.addSystem(new InputSystem(game))
  // WASD and the mouse wheel pan, ctrl/cmd + wheel zooms
  game.addSystem(new CameraSystem(game))

  // e.g. ?world=isovienna&hour=21&winter starts on a winter night
  const params = new URLSearchParams(window.location.search)
  const hour = parseFloat(params.get('hour') ?? '')
  const world = await isoViennaWorldBuilder(undefined, {
    hours: Number.isFinite(hour) ? hour % 24 : undefined,
    winter: params.has('winter'),
  })
  // added before the TileMapSystem, so each frame draws the vehicles of the same frame
  game.addSystem(new IsoViennaSystem(game, world, { vehicleLayer: LAYER_VEHICLES }))
  game.addSystem(new TileMapSystem(game, world.tileMap))

  return game
}
