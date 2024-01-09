import { Game } from '../lib/kernel/Game.ts'
import { InfoSystem } from '../lib/systems/InfoSystem.ts'
import { InputSystem } from '../lib/systems/InputSystem.ts'
import { GridSystem } from '../lib/systems/GridSystem.ts'
import { EntitySystem } from '../lib/systems/EntitySystem.ts'
import { GamepadInputSystem } from '../lib/systems/GamepadInputSystem.ts'
import { HeroSystem } from '../lib/systems/HeroSystem.ts'
import { WebUiSystem } from '../lib/systems/WebUiSystem.ts'
import { WorldMap } from '../lib/map/WorldMap.ts'
import { WorldMapSystem } from '../lib/systems/WorldMapSystem.ts'
import './style.css'
import { EntityManager } from '../lib/entity/EntityManager.ts'
import { TileEntity } from '../lib/entity/TileEntity.ts'
import { getCellIndex } from '../lib/utils/gridutil.ts'
import { SpriteEntity } from '../lib/entity/SpriteEntity.ts'

const app = document.querySelector<HTMLDivElement>('#app')!

// init world
const worldMap = new WorldMap(3, 3)

// Init game
const gameConfig: GameConfig = { columns: 3, rows: 3, tileSize: 128 }
const game = new Game(app, gameConfig, worldMap)

// Init spritesheets
await game.resources.loadSpritesheet('/fm_iso_buildings/fm_iso_buildings.png', 1)
await game.resources.loadSpritesheet('/fm_iso_pyramids/fm_iso_pyramids.png', 32)

// Init entities
const tileRed = game.entityManager.add(
  new TileEntity(game, { col: 1, row: 1, backgroundColor: 'rgba(255,0,106,0.5)' }),
)
const tileBlue = game.entityManager.add(
  new TileEntity(game, { col: 2, row: 2, backgroundColor: 'rgba(0,81,255,0.5)' }),
)

const spriteEntity0 = game.entityManager.add(
  new SpriteEntity(game, { col: 0, row: 1, spriteId: 6 }),
)
const spriteEntity1 = game.entityManager.add(
  new SpriteEntity(game, { col: 1, row: 1, spriteId: 7 }),
)

// Build world
game.worldMap.setTile(getCellIndex(1, 1, game.config.columns), tileRed)
game.worldMap.setTile(getCellIndex(2, 2, game.config.columns), tileBlue)
//game.worldMap.setTile(3, tileBlue)

game.worldMap.setObject(getCellIndex(0, 1, game.config.columns), spriteEntity0)
game.worldMap.setObject(getCellIndex(1, 1, game.config.columns), spriteEntity1)

//game.worldMap.setObject(4, 1)
// game.worldMap.setObject(1, 1)
// game.worldMap.setObject(2, 1)
// game.worldMap.setObject(3, 2)
// game.worldMap.setObject(4, 2)
// game.worldMap.setObject(5, 3)
// game.worldMap.setObject(6, 4)
//game.worldMap.setObject(7, 4)
//game.worldMap.setObject(8, 5)

console.log(game.worldMap.layers)

// game.addSystem(new DebugSystem())
// game.addSystem(new OrthogonalGridSystem())
game.addSystem(new GridSystem(game))
//game.addSystem(new EntitySystem(game))
game.addSystem(new WorldMapSystem(game))
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
