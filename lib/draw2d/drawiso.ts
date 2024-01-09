export function drawIsoTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fillColor: string,
  strokeColor: string,
  text?: string,
) {
  ctx.save()

  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + width / 2, y + height / 2)
  ctx.lineTo(x, y + height)
  ctx.lineTo(x - width / 2, y + height / 2)
  ctx.closePath()

  // Fill the tile with a color
  //ctx.fillStyle = fillColor
  //ctx.fill()

  // Stroke the tile with a border
  ctx.strokeStyle = strokeColor
  ctx.stroke()

  ctx.fillStyle = 'rgba(255,0,0,0.92)'
  ctx.fillText(`${x},${y}`, x, y)

  if (text) {
    ctx.fillStyle = 'white'
    ctx.fillText(text, x - 10, y + height / 2)
  }
  ctx.restore()
}
