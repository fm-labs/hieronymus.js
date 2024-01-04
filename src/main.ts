import { Game } from '../lib/kernel/game.ts'
import { InfoSystem } from '../lib/systems/InfoSystem.ts'
import { InputSystem } from '../lib/systems/InputSystem.ts'
import { IsoGridSystem } from '../lib/systems/IsoGridSystem.ts'
import { IsoObjectSystem } from '../lib/systems/IsoObjectSystem.ts'
import { GamepadInputSystem } from '../lib/systems/GamepadInputSystem.ts'
import { HeroSystem } from '../lib/systems/HeroSystem.ts'
import { WebUiSystem } from '../lib/systems/WebUiSystem.ts'
import { getCellIndex } from '../lib/utils/gridutil.ts'
import { loadSpritesheetImage } from '../lib/kernel/loader.ts'
import './style.css'
import { awsWorldMap } from './worlds/aws/aws.world.ts'
import { WebUiSystem2 } from '../lib/systems/WebUiSystem2.ts'

const app = document.querySelector<HTMLDivElement>('#app')!
const tsize = 128

const gameConfig: GameConfig = awsWorldMap
const game = new Game(app, gameConfig)

// Init spritesheets
game.spritesheets.push(
  await loadSpritesheetImage('/fm_iso_buildings/fm_iso_buildings.png'),
  await loadSpritesheetImage('/fm_iso_pyramids/fm_iso_pyramids.png'),
  //await loadSpritesheet('map_pack/map_pack.png'),
  //await loadSpritesheetByName('isometric_tiles_base'),
  //await loadSpritesheetByName('isometric_blocks'),
  //await loadSpritesheetByName('isometric_minigolf'),
  //await loadSpritesheetByName('isometric_modular_buildings'),
  //await loadSpritesheetByName('isometric_modular_roads'),
  //await loadSpritesheetByName('isometric_nature'),
  //await loadSpritesheetByName('isometric_space_interior'),
  //await loadSpritesheetByName('isometric_tiles_base'),
  //await loadSpritesheetByName('isometric_tiles_buildings'),
  //await loadSpritesheetByName('isometric_tiles_city'),
  //await loadSpritesheetByName('isometric_tiles_vehicles'),
  //await loadSpritesheet('isometric_watercraft'),
  //await loadSpritesheetByName('isometric_vector_roads_base'),
  //await loadSpritesheetByName('isometric_vector_roads_water'),
)

// game.addSystem(new DebugSystem())
// game.addSystem(new OrthogonalGridSystem())
game.addSystem(new IsoGridSystem(game, tsize))
game.addSystem(new IsoObjectSystem(game, tsize))
// game.addSystem(new InputSystem())
// game.addSystem(new GamepadInputSystem())
game.addSystem(new WebUiSystem(game))
// game.addSystem(new WebUiSystem2(game))
game.addSystem(new InfoSystem(game))
// game.addSystem(new HeroSystem())

// @todo move to game or renderer class
window.addEventListener('resize', () => {
  const width = window.innerWidth
  const height = window.innerHeight
  console.log('resize', width, height)
  game.updateDimensions(width, height)
  game.draw()
})

await game.run()
