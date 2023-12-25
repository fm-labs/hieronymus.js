import { loadHtmlImage, loadSpritesheetByName } from '../lib/kernel/loader.ts'
import { drawTile } from '../lib/kernel/draw2d.ts'

export async function setupCanvas3(container: HTMLDivElement) {
  //container.style.width = '640px'
  //container.style.height = '480px'

  const canvasWidth = window.innerWidth
  const canvasHeight = window.innerHeight

  let lastClickedTileInfo: any = null
  const infoDiv = document.createElement('dev')
  infoDiv.id = 'infoDiv'

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

  const uiCanvas = document.createElement('canvas')
  const uiCtx = uiCanvas.getContext('2d')!
  uiCanvas.width = canvasWidth
  uiCanvas.height = canvasHeight

  const uiDiv = document.createElement('div')
  uiDiv.id = 'uiDiv'
  uiDiv.style.position = 'absolute'
  uiDiv.style.top = '0px'
  uiDiv.style.left = '0px'
  uiDiv.style.width = '320px'
  uiDiv.style.height = '100vh'
  uiDiv.style.overflowY = 'scroll'
  //uiDiv.style.pointerEvents = 'none'
  //uiDiv.style.display = 'flex'
  //uiDiv.style.flexDirection = 'row'
  //uiDiv.style.backgroundColor = 'rgba(215,6,6,0.2)'
  //uiDiv.style.border = '1px solid rgba(215,6,6,0.5)'

  const systemDiv = document.createElement('div')
  systemDiv.id = 'systemDiv'
  systemDiv.style.position = 'absolute'
  systemDiv.style.top = '0px'
  systemDiv.style.right = '0px'
  systemDiv.style.width = '320px'
  systemDiv.style.height = '100vh'
  systemDiv.style.overflowX = 'ellipsis'
  systemDiv.style.overflowY = 'scroll'
  systemDiv.style.fontFamily = 'monospace'
  systemDiv.style.fontSize = '10px'
  systemDiv.style.color = 'rgba(211,211,211,0.93)'
  systemDiv.style.opacity = '0.8'

  const logDiv = document.createElement('div')
  logDiv.id = 'logDiv'
  systemDiv.appendChild(logDiv)

  const syslog = (...msg: any[]) => {
    console.log(...msg)
    const div = document.createElement('div')
    div.textContent = msg.join(' ')
    logDiv.appendChild(div)
  }
  const errlog = (...msg: string[]) => {
    console.error(...msg)
    const div = document.createElement('div')
    div.style.color = 'red'
    div.textContent = msg.join(' ')
    logDiv.appendChild(div)
  }

  const spritesheets: any[] = []
  const selectedSpriteImage = null

  const spritesheetLoaderSuccessHandler = (spritesheet: any) => {
    syslog(`Spritesheet loaded from ${spritesheet.url}`)
    return spritesheet
  }

  spritesheets.push(
    //await loadSpritesheet('map_pack/map_pack.png'),
    await loadSpritesheetByName('isometric_tiles_base').then(spritesheetLoaderSuccessHandler),
    await loadSpritesheetByName('isometric_tiles_base').then(spritesheetLoaderSuccessHandler),
    await loadSpritesheetByName('isometric_tiles_buildings').then(spritesheetLoaderSuccessHandler),
    await loadSpritesheetByName('isometric_tiles_city').then(spritesheetLoaderSuccessHandler),
    await loadSpritesheetByName('isometric_tiles_vehicles').then(spritesheetLoaderSuccessHandler),
    //await loadSpritesheet('isometric_watercraft').then(spritesheetLoaderSuccessHandler),
    await loadSpritesheetByName('isometric_vector_roads_base').then(
      spritesheetLoaderSuccessHandler,
    ),
    await loadSpritesheetByName('isometric_vector_roads_water').then(
      spritesheetLoaderSuccessHandler,
    ),
  )

  // const spritesheet1 = spritesheets[0]
  // console.log('spritesheet1', spritesheet1)
  // const img1 = await loadHtmlImage('/tiles/skyscraper02.png')

  // Define the points for the isometric tile
  const twidth = 128
  const theight = twidth / 2

  const spriteWidth = 32
  const spriteHeight = 32

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
      tiles.push({ x, y, color: 'rgb(88,220,220)' })
    }
  }

  function drawAllTiles() {
    for (const tile of tiles) {
      drawTile(gridCtx, tile.x, tile.y, twidth, theight, tile.color)
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
    uiCanvas.width = window.innerWidth
    uiCanvas.height = window.innerHeight
    draw()
  })

  mainCanvas.addEventListener('mousemove', (e) => {
    const rect = mainCanvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const index = getTileIndex(x, y)
    const tileInfo = index >= 0 ? getTilePath(tiles[index]) : null

    if (infoDiv) {
      infoDiv.textContent = `Mouse X: ${x.toFixed(2)}, Mouse Y: ${y.toFixed(2)}
    Hovered Tile Index: ${index}, Path: ${JSON.stringify(tileInfo)}
    Last Clicked Tile Info: ${JSON.stringify(lastClickedTileInfo)}`
    }
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
    if (index >= 0) {
      const randomIndex = Math.floor(Math.random() * colors.length)
      const tcolor = colors[randomIndex]
      console.log('tcolor', tcolor)
      tiles[index].color = tcolor // Change the color of the clicked tile
      lastClickedTileInfo = getTilePath(tiles[index])
    }
    draw() // Redraw all the tiles to reflect the color change
  })

  function draw() {
    mainCanvasCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height)

    // draw the grid
    gridCtx.reset()
    gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height)
    gridCtx.translate(gridCanvas.width / 2 - (rows / 2) * twidth, gridCanvas.height / 2)
    drawAllTiles()
    mainCanvasCtx.drawImage(gridCanvas, 0, 0)

    // draw the objects
    console.log('draw objects')

    // const sprites = [
    //   {
    //     source: 'isometric_tiles_buildings',
    //     x: 0,
    //     y: 0,
    //     width: 128,
    //     height: 128,
    //   },
    // ]

    const objects = [
      {
        col: 1,
        row: 1,
        spriteRef: {
          spriteSheetName: '/assets/2d/isometric_tiles_base/isometric_tiles_base.png',
          spriteIndex: 2,
        },
      },
      {
        col: 2,
        row: 1,
        spriteRef: {
          spriteSheetName: '/assets/2d/isometric_tiles_base/isometric_tiles_base.png',
          spriteIndex: 2,
        },
      },
      {
        col: 3,
        row: 1,
        spriteRef: {
          spriteSheetName: '/assets/2d/isometric_tiles_base/isometric_tiles_base.png',
          spriteIndex: 2,
        },
      },
      {
        col: 1,
        row: 3,
        spriteRef: {
          spriteSheetName: '/assets/2d/isometric_tiles_base/isometric_tiles_base.png',
          spriteIndex: 1,
        },
      },
      {
        col: 2,
        row: 3,
        spriteRef: {
          spriteSheetName: '/assets/2d/isometric_tiles_base/isometric_tiles_base.png',
          spriteIndex: 1,
        },
      },
      {
        col: 3,
        row: 3,
        spriteRef: {
          spriteSheetName: '/assets/2d/isometric_tiles_base/isometric_tiles_base.png',
          spriteIndex: 1,
        },
      },
      {
        col: 1,
        row: 2,
        spriteRef: {
          spriteSheetName: '/assets/2d/isometric_tiles_base/isometric_tiles_base.png',
          spriteIndex: 72,
        },
      },
      {
        col: 2,
        row: 2,
        spriteRef: {
          spriteSheetName: '/assets/2d/isometric_tiles_base/isometric_tiles_base.png',
          spriteIndex: 72,
        },
      },
      {
        col: 3,
        row: 2,
        spriteRef: {
          spriteSheetName: '/assets/2d/isometric_tiles_base/isometric_tiles_base.png',
          spriteIndex: 72,
        },
      },
    ]

    objCtx.reset()
    objCtx.clearRect(0, 0, objCanvas.width, objCanvas.height)
    objCtx.translate(gridCanvas.width / 2 - (rows / 2) * twidth, gridCanvas.height / 2)

    objects
      .sort((a, b) => {
        if (a.col === b.col) return a.row - b.row
        const aIdx = a.col * rows + a.row
        const bIdx = b.col * rows + b.row
        return bIdx - aIdx
      })
      .forEach((obj) => {
        const { col, row, spriteRef } = obj
        const { spriteSheetName, spriteIndex } = spriteRef
        const spritesheet = spritesheets.find((s) => s.url === spriteSheetName)
        const sprite = spritesheet?.sprites[spriteIndex]
        const spriteImage = spritesheet?.image
        if (!sprite) {
          errlog(`Sprite not found: ${spriteSheetName} ${spriteIndex}`)
          return
        }
        console.log('spritesheet', spritesheet)
        console.log('sprite', sprite, spriteSheetName)

        const spriteCanvas = document.createElement('canvas')
        spriteCanvas.width = sprite.width
        spriteCanvas.height = sprite.height
        const spriteCanvasCtx = spriteCanvas.getContext('2d')!
        spriteCanvasCtx.drawImage(
          spriteImage,
          sprite.x,
          sprite.y,
          sprite.width,
          sprite.height,
          0,
          0,
          sprite.width,
          sprite.height,
        )

        const tileIdx = col * rows + row
        const tpath = getTilePath(tiles[tileIdx])
        const tpoint0 = tpath[0]

        const ratio = sprite.width / sprite.height
        const imgW = Math.min(sprite.width, twidth)
        const imgH = imgW / ratio
        const offsetX = twidth / 2 - imgW / 2
        const offsetY = -imgH + theight / 2

        console.log('img1', imgW, imgH, offsetX, offsetY)

        objCtx.drawImage(
          spriteCanvas,
          0,
          0,
          sprite.width,
          sprite.height,
          tpoint0.x + offsetX,
          tpoint0.y + offsetY,
          imgW,
          imgH,
        )
        //objCtx.strokeStyle = 'rgba(115,255,0,0.84)'
        //objCtx.strokeRect(tpoint0.x + offsetX, tpoint0.y + offsetY, imgW, imgH)
      })

    // const img1 = (() => {
    //   const sprite1 = spritesheet1.sprites[0]
    //   const { x, y, width, height } = sprite1
    //
    //   const canvas = document.createElement('canvas')
    //   canvas.width = width
    //   canvas.height = height
    //   const ctx = canvas.getContext('2d')!
    //   ctx.drawImage(spritesheet1.image, x, y, width, height, 0, 0, width, height)
    //   return canvas
    // })()

    mainCanvasCtx.drawImage(objCanvas, 0, 0, objCanvas.width, objCanvas.height)

    // draw the ui
    uiCtx.clearRect(0, 0, uiCanvas.width, uiCanvas.height)
    uiCtx.font = '12px Arial'

    // let xOffset = 0
    // let yOffset = 0
    // let rowHeight = 0
    // spritesheet1.sprites.forEach((sprite: any) => {
    //   const { x, y, width, height, name } = sprite
    //
    //   if (xOffset + spriteWidth > 320) {
    //     xOffset = 0
    //     yOffset += rowHeight
    //     rowHeight = 0
    //   }
    //
    //   uiCtx.drawImage(
    //     spritesheet1.image,
    //     x,
    //     y,
    //     width,
    //     height,
    //     xOffset,
    //     yOffset,
    //     spriteWidth,
    //     spriteHeight,
    //   )
    //
    //   xOffset += spriteWidth
    //   rowHeight = Math.max(rowHeight, spriteHeight)
    // })

    uiDiv.innerHTML = ''

    spritesheets.forEach((spritesheet: any) => {
      const spritesContainer = document.createElement('div')
      spritesContainer.style.display = 'flex'
      spritesContainer.style.flexDirection = 'row'
      spritesContainer.style.flexWrap = 'wrap'
      spritesContainer.style.width = 320 + 'px'
      //spritesContainer.style.height = 100 + '%'
      spritesContainer.style.borderTop = '5px solid red'

      spritesheet.sprites.forEach((sprite: any) => {
        const { x, y, width, height } = sprite
        const spriteCanvas = document.createElement('canvas')
        spriteCanvas.width = spriteWidth
        spriteCanvas.height = spriteHeight
        spriteCanvas.style.position = 'relative'
        const spriteCanvasCtx = spriteCanvas.getContext('2d')!
        spriteCanvasCtx.drawImage(
          spritesheet.image,
          x,
          y,
          width,
          height,
          0,
          0,
          spriteWidth,
          spriteHeight,
        )

        const spriteDiv = document.createElement('div')
        spriteDiv.title = `${spritesheet.url} ${sprite.name} (${sprite.x}, ${sprite.y})`
        spriteDiv.style.width = `${spriteWidth}px`
        spriteDiv.style.height = `${spriteHeight}px`
        spriteDiv.appendChild(spriteCanvas)
        spriteDiv.onclick = (ev) => {
          syslog('sprite clicked', sprite.name, spritesheet.url)
        }

        spritesContainer.appendChild(spriteDiv)
      })
      uiDiv.appendChild(spritesContainer)
    })

    //mainCanvasCtx.drawImage(uiCanvas, 0, 0, uiCanvas.width, uiCanvas.height)
  }

  // function getSpriteIndex(tx: number, ty: number) {
  //   const spriteWidth = 32
  //   const spriteHeight = 32
  //   const maxSpritesPerRow = Math.floor(uiCanvas.width / spriteWidth)
  //   console.log('maxSpritesPerRow', maxSpritesPerRow)
  //
  //   for (let i = 0; i < spritesheet1.sprites.length; i++) {
  //     const x = (i % maxSpritesPerRow) * spriteWidth
  //     const y = Math.floor(i / maxSpritesPerRow) * spriteHeight
  //
  //     console.log('sprite', i, x, y)
  //
  //     uiCtx.beginPath()
  //     uiCtx.moveTo(x, y)
  //     uiCtx.lineTo(x + spriteWidth, y)
  //     uiCtx.lineTo(x + spriteWidth, y + spriteHeight)
  //     uiCtx.lineTo(x, y + spriteHeight)
  //     uiCtx.closePath()
  //     if (uiCtx.isPointInPath(tx, ty)) {
  //       return i
  //     }
  //   }
  //   return -1
  // }

  syslog('DRAW (initial)')
  draw()
  container.appendChild(mainCanvas)
  container.appendChild(infoDiv)
  container.appendChild(uiDiv)
  container.appendChild(systemDiv)
}
