import './style.css'
import { WorldGame } from './world_game.ts'

window.addEventListener('resize', () => {
  const width = window.innerWidth
  const height = window.innerHeight
  console.log('resize', width, height)
  game.eventbus.emit('resize', { width, height })
})
window.dispatchEvent(new Event('resize'))

const app = document.querySelector<HTMLDivElement>('#app')!
const game: IGame = await WorldGame(app)
await game.run()
