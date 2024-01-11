import { fetchSpritesheet, fetchKenneySpritesheet } from '../lib/kernel/loader.ts'

import { drawIsoTile } from '../lib/draw2d/drawiso.ts'

export async function setupCanvas3(container: HTMLDivElement) {
  const canvasWidth = window.innerWidth
  const canvasHeight = window.innerHeight

  let lastClickedTileInfo: any = null

  const mainCanvas = document.createElement('canvas')
  mainCanvas.width = canvasWidth
  mainCanvas.height = canvasHeight
  const mainCanvasCtx = mainCanvas.getContext('2d')!

  const gridCanvas = document.createElement('canvas')
  const gridCtx = gridCanvas.getContext('2d')!
  gridCanvas.width = canvasWidth
  gridCanvas.height = canvasHeight

  const objCanvas = document.createElement('canvas')
  const objCtx = objCanvas.getContext('2d')!
  objCanvas.width = canvasWidth
  objCanvas.height = canvasHeight

  const spritesheets: any[] = []
  const selectedSpriteImage: any = null

  const spritesheetLoaderSuccessHandler = (spritesheet: any) => {
    //syslog(`Spritesheet loaded from ${spritesheet.url}`)
    return spritesheet
  }

  spritesheets.push(
    //await loadSpritesheet('map_pack/map_pack.png'),
    await fetchSpritesheet('/aaa_iso_buildings/aaa_iso_buildings.png').then(
      spritesheetLoaderSuccessHandler,
    ),
    //await loadSpritesheetByName('isometric_tiles_base').then(spritesheetLoaderSuccessHandler),
    await fetchKenneySpritesheet('isometric_blocks').then(spritesheetLoaderSuccessHandler),
    //await loadSpritesheetByName('isometric_minigolf').then(spritesheetLoaderSuccessHandler),
    await fetchKenneySpritesheet('isometric_modular_buildings').then(
      spritesheetLoaderSuccessHandler,
    ),
    await fetchKenneySpritesheet('isometric_modular_roads').then(spritesheetLoaderSuccessHandler),
    await fetchKenneySpritesheet('isometric_nature').then(spritesheetLoaderSuccessHandler),
    await fetchKenneySpritesheet('isometric_space_interior').then(spritesheetLoaderSuccessHandler),
    await fetchKenneySpritesheet('isometric_tiles_base').then(spritesheetLoaderSuccessHandler),
    await fetchKenneySpritesheet('isometric_tiles_buildings').then(spritesheetLoaderSuccessHandler),
    await fetchKenneySpritesheet('isometric_tiles_city').then(spritesheetLoaderSuccessHandler),
    //await loadSpritesheetByName('isometric_tiles_vehicles').then(spritesheetLoaderSuccessHandler),
    //await loadSpritesheet('isometric_watercraft').then(spritesheetLoaderSuccessHandler),
    await fetchKenneySpritesheet('isometric_vector_roads_base').then(
      spritesheetLoaderSuccessHandler,
    ),
    await fetchKenneySpritesheet('isometric_vector_roads_water').then(
      spritesheetLoaderSuccessHandler,
    ),
  )

  // const spritesheet1 = spritesheets[0]
  // console.log('spritesheet1', spritesheet1)
  // const img1 = await loadHtmlImage('/tiles/skyscraper02.png')

  // Define the points for the isometric tile
  const twidth = 128
  const theight = twidth / 2

  const tiles: any[] = []
  // for (let i = 0; i < gridCanvas.width / twidth; i++) {
  //   for (let j = 0; j < (gridCanvas.height * 2) / theight; j++) {
  //     const x = i * twidth + (j % 2) * (twidth / 2)
  //     const y = j * (theight / 2)
  //     tiles.push({ x, y, color: 'rgb(88,220,220)' })
  //   }
  // }
  const cols = 10
  const rows = 10
  //const h = Math.sqrt(((twidth / 2) ^ 2) + ((theight / 2) ^ 2)) // tile side length
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const x = c * (twidth / 2) + r * (twidth / 2)
      const y = r * (theight / 2) - c * (theight / 2)
      tiles.push({ x, y, col: c, row: r, color: 'rgb(88,220,220)' })
    }
  }

  function drawAllTiles() {
    for (const tile of tiles) {
      drawIsoTile(gridCtx, tile.x, tile.y, twidth, theight, tile.color)
    }
  }

  function getTileIndex(x: number, y: number) {
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i]
      if (!tile) continue
      gridCtx.beginPath()
      gridCtx.moveTo(tile.x, tile.y)
      gridCtx.lineTo(tile.x + twidth / 2, tile.y - theight / 2)
      gridCtx.lineTo(tile.x + twidth, tile.y)
      gridCtx.lineTo(tile.x + twidth / 2, tile.y + theight / 2)
      gridCtx.closePath()
      if (gridCtx.isPointInPath(x, y)) {
        return i
      }
    }
    return -1
  }

  function getTilePath(tile: any) {
    return [
      { x: tile.x, y: tile.y }, //
      { x: tile.x + twidth / 2, y: tile.y - theight / 2 }, // top
      { x: tile.x + twidth, y: tile.y }, // right
      { x: tile.x + twidth / 2, y: tile.y + theight / 2 },
    ]
  }

  window.addEventListener('resize', () => {
    mainCanvas.width = window.innerWidth
    mainCanvas.height = window.innerHeight
    gridCanvas.width = window.innerWidth
    gridCanvas.height = window.innerHeight
    objCanvas.width = window.innerWidth
    objCanvas.height = window.innerHeight
    draw()
  })

  mainCanvas.addEventListener('click', (e) => {
    const rect = mainCanvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // const spriteIndex = getSpriteIndex(x, y)
    // console.log('spriteIndex', x, y, spriteIndex)
    // //syslog('spriteIndex', x, y, spriteIndex)
    // if (spriteIndex >= 0) {
    //   console.log('sprite clicked', spritesheet1.sprites[spriteIndex])
    //   return
    // }

    // random colors
    const colors = [
      '#ff0000',
      '#00ff00',
      '#0000ff',
      '#ffff00',
      '#00ffff',
      '#ff00ff',
      '#ffffff',
      '#000000',
    ]

    const index = getTileIndex(x, y)
    console.log('clicked tile', index, selectedSpriteImage)
    if (index >= 0) {
      const randomColorIndex = Math.floor(Math.random() * colors.length)
      tiles[index].color = colors[randomColorIndex] // Change the color of the clicked tile
      lastClickedTileInfo = getTilePath(tiles[index])

      // if (selectedSpriteImage) {
      //   const objIdx = getCellIndex(tiles[index].col, tiles[index].row)
      //   const obj = {
      //     col: tiles[index].col,
      //     row: tiles[index].row,
      //     spriteRef: selectedSpriteImage,
      //   }
      //   objects[objIdx] = obj
      //   console.log('Object', objIdx, obj)
      // }
    }
    draw() // Redraw all the tiles to reflect the color change
  })

  function draw() {
    mainCanvasCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height)

    // draw the grid
    // gridCtx.reset()
    // gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height)
    // gridCtx.translate(gridCanvas.width / 2 - (rows / 2) * twidth, gridCanvas.height / 2)
    // drawAllTiles()
    // mainCanvasCtx.drawImage(gridCanvas, 0, 0)

    //mainCanvasCtx.drawImage(objCanvas, 0, 0, objCanvas.width, objCanvas.height)
    //mainCanvasCtx.drawImage(uiCanvas, 0, 0, uiCanvas.width, uiCanvas.height)
  }

  container.appendChild(mainCanvas)
  //container.appendChild(systemDiv)

  //syslog('DRAW (initial)')
  draw()
}
