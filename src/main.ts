import { Game } from '../lib/kernel/Game.ts'
import { InfoSystem } from '../lib/systems/InfoSystem.ts'
import { InputSystem } from '../lib/systems/InputSystem.ts'
import { GridSystem } from '../lib/systems/GridSystem.ts'
import { EntitySystem } from '../lib/systems/EntitySystem.ts'
import { GamepadInputSystem } from '../lib/systems/GamepadInputSystem.ts'
import { HeroSystem } from '../lib/systems/HeroSystem.ts'
import { WebUiSystem } from '../lib/systems/WebUiSystem.ts'
import { WorldMapSystem } from '../lib/systems/WorldMapSystem.ts'
import './style.css'
import devWorldBuilder from './worlds/dev/dev.world.ts'
import { GameResourcesManager } from '../lib/kernel/GameResourcesManager.ts'
const app = document.querySelector<HTMLDivElement>('#app')!

// Init world
const resources = new GameResourcesManager()
const worldMap = await devWorldBuilder(resources)

// Init game
const gameConfig = { name: 'My Game' }
const game = new Game(app, gameConfig, worldMap, resources)

// game.addSystem(new DebugSystem())
// game.addSystem(new OrthogonalGridSystem())
game.addSystem(new GridSystem(game))
game.addSystem(new WorldMapSystem(game))
// game.addSystem(new InputSystem())
// game.addSystem(new GamepadInputSystem())
game.addSystem(new WebUiSystem(game))
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
