import { devGameLauncher } from './worlds/dev/devGameLauncher.ts'
import { awsGameLauncher } from './worlds/aws/awsGameLauncher.ts'

// read the 'world' query parameter
const urlParams = new URLSearchParams(window.location.search)
const world = urlParams.get('world') || 'dev'

// get the app element
const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('No app element')

// launch the game based on the 'world' query parameter
let game: IGame
switch (world) {
  case 'dev':
    game = await devGameLauncher(app)
    break
  case 'aws':
    game = await awsGameLauncher(app)
    break
  default:
    throw new Error(`Unknown world: ${world}`)
}

// run the game
await game.run()
