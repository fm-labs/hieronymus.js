import { WorldRenderer2d } from '../lib/world/renderer2d.ts'
import { spritesheets } from './_sprites.ts'
import { elbaWorldConfig } from './worlds/elba/elba.world.ts'

// const map = {
//   cols: 8,
//   rows: 8,
//   tsize: 64,
//   layers: [
//     [
//       3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 1, 1, 1, 1, 3, 3, 1, 1, 1, 1, 2, 1, 3, 3, 1, 1, 1, 1, 1, 1,
//       3, 3, 1, 1, 2, 1, 1, 1, 3, 3, 1, 1, 1, 2, 1, 1, 3, 3, 1, 1, 1, 2, 1, 1, 3, 3, 3, 3, 1, 2, 3,
//       3, 3,
//     ],
//     [
//       4, 3, 3, 3, 3, 3, 3, 4, 4, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 5, 0, 0, 0,
//       4, 4, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 4, 4, 4, 4, 0, 5, 4, 4, 4, 0, 3, 3, 0, 0, 3,
//       3, 3,
//     ],
//   ],
//   getTile: function (layer, col, row) {
//     return this.layers[layer][row * map.cols + col]
//   },
// }

// const world: World = {
//   name: 'test',
//   label: 'Test',
//   width: 10,
//   height: 10,
//   cells: [],
// }
// const renderProps: WorldRenderProps = {
//   rendererName: 'canvas2d',
//   canvasHeight: 640,
//   canvasWidth: 640,
//   cellSize: 64,
// }

export function setupCanvas(container: HTMLDivElement) {
  const worldConfig = elbaWorldConfig
  const { world: world, render: renderProps } = worldConfig

  container.style.width = renderProps.canvasWidth + 'px'
  container.style.height = renderProps.canvasHeight + 'px'

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

  const images = spritesheets.reduce(
    (obj, spritesheet) => {
      const imgEl = new Image()
      imgEl.src = spritesheet.image
      imgEl.alt = spritesheet.name
      imgEl.style.display = 'none'
      imgEl.onload = () => {
        console.log('SPRITESHEET LOADED', spritesheet.name)
      }

      obj[spritesheet.name] = imgEl
      return obj
    },
    {} as Record<string, HTMLImageElement>,
  )

  const renderer = new WorldRenderer2d(canvas, world as World, renderProps, images)

  let lastFrameTime = 0
  let frameCount = 0
  let fps = 0

  const render = (currentTime: number) => {
    // Convert time to seconds
    //currentTime *= 0.001;

    // Calculate the difference in seconds
    const deltaTime = currentTime - lastFrameTime
    //lastFrameTime = currentTime;

    // Increment the frame count
    frameCount++

    // Update FPS every second
    if (deltaTime >= 1000) {
      fps = frameCount
      frameCount = 0
      lastFrameTime = currentTime
    }

    renderer.draw()

    // // draw FPS
    // ctx.fillStyle = 'green'
    // ctx.fillRect(0, 0, 150, 20)
    // ctx.fillStyle = 'white'
    // ctx.font = '14px sans-serif'
    // ctx.fillText(`${frameCount}/${deltaTime.toFixed(3)} ms/${fps} fps`, 4, 16)

    requestAnimationFrame(render)
  }
  requestAnimationFrame(render)
}
