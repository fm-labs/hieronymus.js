import './style.css'
import { WorldGame } from './worldGame.ts'

const app = document.querySelector<HTMLDivElement>('#app')!
const game: IGame = await WorldGame(app)
window.addEventListener('resize', () => {
  const width = window.innerWidth
  const height = window.innerHeight
  console.log('resize', width, height)
  game.eventbus.emit('resize', { width, height })
})
window.dispatchEvent(new Event('resize'))
await game.run()
