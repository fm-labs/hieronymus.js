export function drawTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
) {
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + width / 2, y - height / 2)
  ctx.lineTo(x + width, y)
  ctx.lineTo(x + width / 2, y + height / 2)
  ctx.closePath()

  // Fill the tile with a color
  ctx.fillStyle = color
  ctx.fill()

  // Stroke the tile with a border
  ctx.strokeStyle = '#282828'
  ctx.stroke()
}

export const drawBackground = (
  ctx: CanvasRenderingContext2D,
  world: World,
  props: WorldRenderProps,
  bg: HTMLImageElement,
) => {
  ctx.drawImage(bg, 0, 0, props.canvasWidth, props.canvasHeight)

  // ctx.drawImage(
  //   bg, // The image source
  //   0, 0, // The x and y coordinates on the sprite sheet
  //   props.canvasWidth, props.canvasHeight, // The width and height to clip from the sprite sheet
  //   0, 0, // The x and y coordinates on the canvas
  //   props.canvasWidth, props.canvasHeight // The width and height to draw on the canvas
  // );

  // console.log("drawBackground", props.backgroundImage)
  // if (props.backgroundImage) {
  //   const image = new Image()
  //   image.src = props.backgroundImage
  //   image.onload = () => {
  //     console.log("image loaded")
  //     ctx.drawImage(image, 0, 0, props.canvasWidth, props.canvasHeight)
  //   }
  // }
}

export const drawGrid = (ctx: CanvasRenderingContext2D, world: World, props: WorldRenderProps) => {
  const cellSize = props.cellSize
  const width = world.width * cellSize
  const height = world.height * cellSize
  ctx.beginPath()
  for (let x = 0; x <= width; x += cellSize) {
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
  }
  for (let y = 0; y <= height; y += cellSize) {
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
  }
  ctx.strokeStyle = '#ddd'
  ctx.stroke()
}

export const drawCell = (
  ctx: CanvasRenderingContext2D,
  cell: WorldCell,
  props: WorldRenderProps,
  spriteSheet: HTMLImageElement,
) => {
  const cellSize = props.cellSize
  const x = cell.x * cellSize
  const y = cell.y * cellSize

  const savedAlpha = ctx.globalAlpha // Save original alpha
  ctx.globalAlpha = 0.5 // 50% transparency

  ctx.beginPath()
  ctx.rect(x, y, cellSize, cellSize)
  ctx.fillStyle = cell.alive ? '#000' : '#fff'
  ctx.fill()
  ctx.strokeStyle = '#ddd'
  ctx.stroke()

  // Draw the sprite on the canvas
  if (cell?.sprite) {
    const spriteX = cell.sprite.x
    const spriteY = cell.sprite.y
    const spriteWidth = cell.sprite.width
    const spriteHeight = cell.sprite.height
    ctx.drawImage(
      spriteSheet, // The image source
      spriteX,
      spriteY, // The x and y coordinates on the sprite sheet
      spriteWidth,
      spriteHeight, // The width and height to clip from the sprite sheet
      x,
      y, // The x and y coordinates on the canvas
      props.cellSize,
      props.cellSize, // The width and height to draw on the canvas
    )
  }

  ctx.globalAlpha = savedAlpha // Restore original alpha

  // const spriteX = 0;
  // const spriteY = 0;
  // const spriteHeight = 64;
  // const spriteWidth = 64;
  // ctx.drawImage(
  //   spriteSheet, // The image source
  //   spriteX, spriteY, // The x and y coordinates on the sprite sheet
  //   spriteWidth, spriteHeight, // The width and height to clip from the sprite sheet
  //   x, y, // The x and y coordinates on the canvas
  //   props.cellSize, props.cellSize // The width and height to draw on the canvas
  // );
}

// const drawCells = (ctx: CanvasRenderingContext2D, world: World, props: WorldRenderProps, spritesheet: HTMLImageElement) => {
//   world.cells.forEach(cell => drawCell(ctx, cell, props, spritesheet))
// }

export const drawWorld = (
  ctx: CanvasRenderingContext2D,
  world: World,
  props: WorldRenderProps,
  spritesheet: HTMLImageElement,
  bg: HTMLImageElement,
) => {
  const camera = props.camera!
  ctx.translate(camera.offset.x, camera.offset.y)
  //ctx.moveTo(camera.offset.x, camera.offset.y)
  //drawBackground(ctx, world, props, bg)
  drawGrid(ctx, world, props)
  world.cells.forEach((cell) => drawCell(ctx, cell, props, spritesheet))
  ctx.translate(-camera.offset.x, -camera.offset.y)
  //ctx.moveTo(0,0)

  // __ ISOMETRIC PROJECTION __
  // // Translate the canvas origin to the middle so that we can draw the isometric projection properly
  // ctx.translate(props.canvasWidth / 2, props.canvasHeight / 2);
  // // Apply the isometric projection by skewing and scaling the context
  // ctx.scale(1, 0.5); // Scale vertically to create the illusion of depth
  // ctx.rotate(45 * Math.PI / 180); // Rotate the context by 45 degrees
  // ctx.translate(-props.canvasWidth / 2, -props.canvasHeight / 2); // Translate the context back to the top left
}
