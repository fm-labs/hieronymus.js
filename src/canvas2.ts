export function setupCanvas2(container: HTMLDivElement) {
  container.style.width = '640px'
  container.style.height = '480px'

  // init canvas
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('2d context not supported')
  }

  const dpr = window.devicePixelRatio
  const rect = container.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  ctx.scale(dpr, dpr)
  container.appendChild(canvas)

  // load assets
  //@TODO load images
  //@TODO load tilemaps

  // fps
  let lastFrameTime = 0
  let frameCount = 0
  let fps = 0
  let deltaTime = 0

  // update
  // triggered on each requestAnimationFrame
  const update = (currentTime: number) => {
    // Convert time to seconds
    //currentTime *= 0.001;

    // Calculate the difference in seconds
    deltaTime = currentTime - lastFrameTime
    //lastFrameTime = currentTime;

    // Increment the frame count
    frameCount++

    // Update FPS every second
    if (deltaTime >= 1000) {
      fps = frameCount
      frameCount = 0
      lastFrameTime = currentTime
    }

    draw()

    // loop
    requestAnimationFrame(update)
  }

  const draw = () => {
    // clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // draw light gray background
    ctx.fillStyle = '#333333'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // draw a white border around the canvas
    //ctx.strokeStyle = 'red'
    //ctx.strokeRect(0, 0, canvas.width, canvas.height)

    // render a 3x3 grid of tiles
    const cols = 3
    const rows = 3
    const tileWidth = 64
    const tileHeight = 64
    const tilemap = [
      [0, 1, 0],
      [1, 0, 1],
      [0, 1, 0],
    ]
    const tileset = [
      {
        name: 'tile1',
        image: '/assets/tilemaps/tile1.png',
        x: 0,
        y: 0,
        width: tileWidth,
        height: tileHeight,
      },
      {
        name: 'tile2',
        image: '/assets/tilemaps/tile2.png',
        x: 0,
        y: 0,
        width: tileWidth,
        height: tileHeight,
      },
    ]
    tilemap.forEach((row, y) => {
      row.forEach((tile, x) => {
        const tileData = tileset[tile]
        if (!tileData) {
          return
        }
        const imgEl = new Image()
        imgEl.src = tileData.image
        imgEl.alt = tileData.name
        imgEl.style.display = 'none'
        imgEl.onload = () => {
          console.log('SPRITESHEET LOADED', tileData.name)
          ctx.drawImage(imgEl, x * tileWidth, y * tileHeight)
        }
      })
    })

    // draw a rectangle for each tile
    ctx.fillStyle = 'white'
    ctx.strokeStyle = 'black'
    ctx.lineWidth = 1
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        //const tile = map.getTile(0, c, r)
        const tile = tilemap[r][c]
        if (tile !== 0) {
          ctx.fillStyle = 'white'
          ctx.fillRect(c * tileWidth, r * tileHeight, tileWidth, tileHeight)
        } else {
          ctx.strokeStyle = 'white'
          ctx.strokeRect(c * tileWidth, r * tileHeight, tileWidth, tileHeight)
        }
      }
    }

    // draw FPS
    ctx.fillStyle = 'green'
    ctx.fillRect(0, 0, 150, 20)
    ctx.fillStyle = 'white'
    ctx.font = '14px sans-serif'
    ctx.fillText(`${frameCount}/${deltaTime.toFixed(3)} ms/${fps} fps`, 4, 16)
  }

  // start the loop
  requestAnimationFrame(update)
}
