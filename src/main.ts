import './style.css'
import { WorldGame } from './world_game.ts'
const app = document.querySelector<HTMLDivElement>('#app')!

// // Init world
// const resources = new GameResourcesManager()
// const worldMap = await devWorldBuilder(resources)
//
// // Init game
// const gameConfig = { name: 'My Game' }
// const game = new Game(app, gameConfig, worldMap, resources)
//
// // game.addSystem(new DebugSystem())
// // game.addSystem(new OrthogonalGridSystem())
// game.addSystem(new GridSystem(game))
// game.addSystem(new WorldMapSystem(game))
// //game.addSystem(new HeroSystem(game))
// game.addSystem(new InputSystem(game))
// //game.addSystem(new GamepadInputSystem())
// game.addSystem(new WebUiSystem(game))
// game.addSystem(new InfoSystem(game))

// window.addEventListener('resize', () => {
//   const width = window.innerWidth
//   const height = window.innerHeight
//   console.log('resize', width, height)
//   game.updateDimensions(width, height)
//   game.draw()
// })
// window.dispatchEvent(new Event('resize'))

const game: IGame = await WorldGame(app)
await game.run()
