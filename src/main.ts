import { Game } from '../lib/kernel/game.ts'
import { IsoGridSystem, IsoGridTile } from '../lib/systems/IsoGridSystem.ts'
import { WebUiSystem } from '../lib/systems/WebUiSystem.ts'
import { DebugSystem } from '../lib/systems/DebugSystem.ts'
import { InfoSystem } from '../lib/systems/InfoSystem.ts'
import { IsoObjectSystem } from '../lib/systems/IsoObjectSystem.ts'
import './style.css'
import { OrthogonalGridSystem } from '../lib/systems/OrthogonalGridSystem.ts'
import { getCellIndex } from '../lib/utils/gridutil.ts'
import { InputSystem } from '../lib/systems/InputSystem.ts'
import { loadSpritesheet, loadSpritesheetByName } from '../lib/kernel/loader.ts'
import { GamepadInputSystem } from '../lib/systems/GamepadInputSystem.ts'
import { HeroSystem } from '../lib/systems/HeroSystem.ts'

const app = document.querySelector<HTMLDivElement>('#app')!

// const map = new WorldMap(10, 10)
// map.addCell(0, 0, { type: 'grass' })
// map.addCell(1, 0, { type: 'grass' })
// map.addCell(2, 0, { type: 'grass' })
// map.addCell(3, 0, { type: 'grass' })
// map.addCell(4, 0, { type: 'grass' })
// map.addCell(5, 0, { type: 'grass' })
const tsize = 128
const game = new Game(app, 30, 30)

// Init spritesheets
const spritesheetLoaderSuccessHandler = (spritesheet: any) => {
  console.log(`Spritesheet loaded from ${spritesheet.url}`)
  return spritesheet
}
game.spritesheets.push(
  //await loadSpritesheet('map_pack/map_pack.png'),
  await loadSpritesheet('/aaa_iso_buildings/aaa_iso_buildings.png').then(
    spritesheetLoaderSuccessHandler,
  ),
  //await loadSpritesheetByName('isometric_tiles_base').then(spritesheetLoaderSuccessHandler),
  await loadSpritesheetByName('isometric_blocks').then(spritesheetLoaderSuccessHandler),
  //await loadSpritesheetByName('isometric_minigolf').then(spritesheetLoaderSuccessHandler),
  await loadSpritesheetByName('isometric_modular_buildings').then(spritesheetLoaderSuccessHandler),
  await loadSpritesheetByName('isometric_modular_roads').then(spritesheetLoaderSuccessHandler),
  await loadSpritesheetByName('isometric_nature').then(spritesheetLoaderSuccessHandler),
  await loadSpritesheetByName('isometric_space_interior').then(spritesheetLoaderSuccessHandler),
  await loadSpritesheetByName('isometric_tiles_base').then(spritesheetLoaderSuccessHandler),
  await loadSpritesheetByName('isometric_tiles_buildings').then(spritesheetLoaderSuccessHandler),
  await loadSpritesheetByName('isometric_tiles_city').then(spritesheetLoaderSuccessHandler),
  //await loadSpritesheetByName('isometric_tiles_vehicles').then(spritesheetLoaderSuccessHandler),
  //await loadSpritesheet('isometric_watercraft').then(spritesheetLoaderSuccessHandler),
  await loadSpritesheetByName('isometric_vector_roads_base').then(spritesheetLoaderSuccessHandler),
  await loadSpritesheetByName('isometric_vector_roads_water').then(spritesheetLoaderSuccessHandler),
)

// Init grid cells
const cells: Grid2DCell[] = []
for (let c = 0; c < game.cols; c++) {
  for (let r = 0; r < game.rows; r++) {
    //const x = c * (twidth / 2) + r * (twidth / 2)
    //const y = r * (theight / 2) - c * (theight / 2)
    const idx = getCellIndex(c, r, game.cols)
    const cell = { idx: idx, col: c, row: r, color: 'rgb(88,220,220)' }
    //cells.push({ col: c, row: r, color: 'rgb(88,220,220)' })
    console.log('cell', cell)
    cells[idx] = cell
  }
}
game.cells = cells

//game.addSystem(new DebugSystem())
//game.addSystem(new OrthogonalGridSystem())
game.addSystem(new IsoGridSystem(tsize))
game.addSystem(new IsoObjectSystem(tsize))
game.addSystem(new InputSystem())
game.addSystem(new GamepadInputSystem())
//game.addSystem(new WebUiSystem())
game.addSystem(new InfoSystem())
game.addSystem(new HeroSystem())

// @todo move to game or renderer class
window.addEventListener('resize', () => {
  const width = window.innerWidth
  const height = window.innerHeight
  console.log('resize', width, height)
  game.updateDimensions(width, height)
  game.draw()
})

await game.run()
