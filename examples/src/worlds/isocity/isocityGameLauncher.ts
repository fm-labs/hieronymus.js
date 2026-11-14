import type { GameConfig } from '@fmlabs/hieronimo'
import { CameraSystem, Game, InputSystem, TileMapSystem } from '@fmlabs/hieronimo'
import isoCityWorldBuilder, { CITY_MAP, cityRoadMap, LAYER_VEHICLES } from './isocity.world.ts'
import { IsoCitySystem } from './IsoCitySystem.ts'

export const isocityGameLauncher = async (app: HTMLDivElement) => {
  const config: GameConfig = { id: 'isocity', name: 'Iso City', fullscreen: true }
  const game = new Game(app, config)

  game.addSystem(new InputSystem(game))
  // WASD and the mouse wheel pan, ctrl/cmd + wheel zooms
  game.addSystem(new CameraSystem(game))

  const tileMap = await isoCityWorldBuilder(CITY_MAP)
  // added before the TileMapSystem, so each frame draws the traffic of the same frame
  game.addSystem(
    new IsoCitySystem(game, tileMap, {
      vehicleLayer: LAYER_VEHICLES,
      isRoad: cityRoadMap(CITY_MAP),
    }),
  )
  game.addSystem(new TileMapSystem(game, tileMap))

  return game
}
