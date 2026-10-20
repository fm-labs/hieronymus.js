import type { IGame } from '../lib/game.types'
import { Game } from '../lib'

type GameLauncher = (app: HTMLDivElement) => Promise<Game>

// Launchers are loaded lazily, so a world with missing local data (e.g. gitignored json files)
// only fails when it is selected, instead of breaking the whole app.
const gameLaunchers: Record<string, () => Promise<GameLauncher>> = {
  dev: async () => (await import('./worlds/dev/devGameLauncher.ts')).devGameLauncher,
  aws: async () => (await import('./worlds/aws/awsGameLauncher.ts')).awsGameLauncher,
  awsgraph: async () =>
    (await import('./worlds/awsgraph/awsgraphGameLauncher.ts')).awsgraphGameLauncher,
  roulette: async () =>
    (await import('./worlds/roulette/rouletteGameLauncher.ts')).rouletteGameLauncher,
  vienna: async () => (await import('./worlds/vienna/viennaGameLauncher.ts')).viennaGameLauncher,
  container: async () =>
    (await import('./worlds/container/containerGameLauncher.ts')).containerGameLauncher,
  casino: async () => (await import('./worlds/casino/casinoGameLauncher.ts')).casinoGameLauncher,
  chess: async () => (await import('./worlds/chess/chessGameLauncher.ts')).chessGameLauncher,
  snake: async () => (await import('./worlds/snake/snakeGameLauncher.ts')).snakeGameLauncher,
  isosnake: async () =>
    (await import('./worlds/isosnake/isosnakeGameLauncher.ts')).isosnakeGameLauncher,
  isoislands: async () =>
    (await import('./worlds/isoislands/isoislandsGameLauncher.ts')).isoislandsGameLauncher,
  isocity: async () =>
    (await import('./worlds/isocity/isocityGameLauncher.ts')).isocityGameLauncher,
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
  <ul>` +
  launcherItems.join('') +
  `</ul>`

// run the game
// launch the game based on the 'world' query parameter
try {
  if (!world) throw new Error('No world parameter')
  const loadLauncher = gameLaunchers[world]
  if (!loadLauncher) throw new Error(`World '${world}' not found`)
  const launcher = await loadLauncher()
  const game: IGame = await launcher(app)
  await game.run()
} catch (e: any) {
  console.error(e)
  $launcher.innerHTML += `Error: ${e?.message}`
  app.appendChild($launcher)
}
