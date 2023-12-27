import { Game } from '../lib/kernel/game.ts'
import { IsoGridSystem, IsoGridTile } from './systems/IsoGridSystem.ts'
import { WebUiSystem } from './systems/WebUiSystem.ts'
import { DebugSystem } from './systems/DebugSystem.ts'
import { InfoSystem } from './systems/InfoSystem.ts'
import { IsoObjectSystem } from './systems/IsoObjectSystem.ts'
import './style.css'
import { OrthogonalGridSystem } from './systems/OrthogonalGridSystem.ts'

const app = document.querySelector<HTMLDivElement>('#app')!

// const map = new WorldMap(10, 10)
// map.addCell(0, 0, { type: 'grass' })
// map.addCell(1, 0, { type: 'grass' })
// map.addCell(2, 0, { type: 'grass' })
// map.addCell(3, 0, { type: 'grass' })
// map.addCell(4, 0, { type: 'grass' })
// map.addCell(5, 0, { type: 'grass' })

const game = new Game(app, 10, 10, 128)
const cells: Grid2DCell[] = []
for (let c = 0; c < game.cols; c++) {
  for (let r = 0; r < game.rows; r++) {
    //const x = c * (twidth / 2) + r * (twidth / 2)
    //const y = r * (theight / 2) - c * (theight / 2)
    cells.push({ col: c, row: r, color: 'rgb(88,220,220)' })
  }
}
game.cells = cells

game.addSystem(new IsoGridSystem())
//game.addSystem(new OrthogonalGridSystem())
//game.addSystem(new IsoObjectSystem())
game.addSystem(new InfoSystem())
game.addSystem(new WebUiSystem())
//game.addSystem(new DebugSystem())

window.addEventListener('resize', () => {
  const width = window.innerWidth
  const height = window.innerHeight
  console.log('resize', width, height)
  game.updateDimensions(width, height)
  game.draw()
})

await game.run()
