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
import { IsoCube } from '../lib/entity/IsoCube.ts'
import { IsoHexagon } from '../lib/entity/IsoHexagon.ts'
import { TextEntity } from '../lib/entity/TextEntity.ts'
import { ObjectEntity } from '../lib/entity/ObjectEntity.ts'

const app = document.querySelector<HTMLDivElement>('#app')!

// init world
const worldConfig: WorldMapConfig = { columns: 9, rows: 9, tileSize: 128 }
const worldMap = new WorldMap(worldConfig)

// Init game
const game = new Game(app, {}, worldMap)

// Init spritesheets
await game.resources.loadSpritesheet('/fm_iso_buildings/fm_iso_buildings.png', 1)
await game.resources.loadSpritesheet('/fm_iso_pyramids/fm_iso_pyramids.png', 32)

// tile layer
game.worldMap.addTile(0, 0, 0, { backgroundColor: 'rgba(255,242,0,0.27)' })
game.worldMap.addTile(0, 1, 0, { backgroundColor: 'rgba(255,0,106,0.5)' })
game.worldMap.addTile(0, 0, 1, { backgroundColor: 'rgba(0,81,255,0.5)' })
game.worldMap.addTile(0, 1, 1, {})

// ground layer
game.worldMap.setTile(2, 0, 0, new SpriteEntity({ spriteImage: game.resources.getSprite(6) }))
game.worldMap.setTile(2, 1, 0, new SpriteEntity({ spriteImage: game.resources.getSprite(7) }))
game.worldMap.setTile(2, 0, 1, new SpriteEntity({ spriteImage: game.resources.getSprite(8) }))

// object layer
game.worldMap.addObjectAt(
  3,
  1,
  1,
  new IsoCube({
    tileSize: game.worldMap.tileWidth,
    width: game.worldMap.tileWidth / 2,
    depth: 32,
    text: 'M4',
  }),
)
game.worldMap.addObjectAt(
  3,
  2,
  1,
  new IsoHexagon({
    tileSize: game.worldMap.tileWidth,
    width: game.worldMap.tileWidth / 2,
    depth: 32,
  }),
)
game.worldMap.addObjectAt(3, 2, 2, new TextEntity({ text: 'Hello World!' }))

console.log(game.worldMap.layers)
console.log(game.worldMap.objects)

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
