import { devGameLauncher } from './worlds/dev/devGameLauncher.ts'
import { awsGameLauncher } from './worlds/aws/awsGameLauncher.ts'
import { Game } from '../lib'
import { rouletteGameLauncher } from './worlds/roulette/rouletteGameLauncher.ts'
import { viennaGameLauncher } from './worlds/vienna/viennaGameLauncher.ts'

const gameLaunchers: Record<string, (app: HTMLDivElement) => Promise<Game>> = {
  dev: devGameLauncher,
  aws: awsGameLauncher,
  roulette: rouletteGameLauncher,
  vienna: viennaGameLauncher,
}

// read the 'world' query parameter
const urlParams = new URLSearchParams(window.location.search)
const world = urlParams.get('world') || ''

// get the app element
const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('No app element')

// create game launcher screen

const $launcher = document.createElement('div')
$launcher.style.position = 'absolute'
$launcher.style.top = '0'
$launcher.style.left = '0'
$launcher.style.zIndex = '999'
$launcher.style.backgroundColor = 'rgba(0,0,0,0.5)'
$launcher.style.color = 'white'
$launcher.style.padding = '10px'
$launcher.style.fontFamily = 'Arial'
$launcher.style.fontSize = '12px'

const launcherItems = Object.keys(gameLaunchers).map((launcher, index) => {
  return `<li><a href="/?world=${launcher}">${launcher}</a></li>`
})

$launcher.innerHTML =
  `<div>World: ${world}</div>
  <div>Press 'F10' to toggle debug mode</div>
  <div>Press 'F11' to toggle fullscreen mode</div>
  <ul>` +
  launcherItems.join('') +
  `</ul>`

// run the game
// launch the game based on the 'world' query parameter
try {
  if (!world) throw new Error('No world parameter')
  const launcher = gameLaunchers[world]
  if (!launcher) throw new Error(`World '${world}' not found`)
  const game: IGame = await launcher(app)
  await game.run()
} catch (e: any) {
  console.error(e)
  $launcher.innerHTML += `Error: ${e?.message}`
  app.appendChild($launcher)
}
