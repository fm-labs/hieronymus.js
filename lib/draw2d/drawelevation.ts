export const drawElevation = (
  ctx: CanvasRenderingContext2D,
  elevation: number,
  x: number,
  y: number,
) => {
  //if (elevation <= 0) return

  const centerX = x
  const centerY = y

  const elevationY = centerY - elevation

  //ctx.globalAlpha = 0.5

  // write the x and y coordinates
  ctx.font = '12px Arial'
  ctx.fillStyle = 'lime'
  ctx.fillText(`(${centerX.toFixed(0)}, ${centerY.toFixed(0)})`, centerX + 10, centerY + 5)

  // draw a center dot
  ctx.fillStyle = 'lime'
  ctx.beginPath()
  ctx.arc(centerX, centerY, 2, 0, Math.PI * 2)
  ctx.fill()

  // draw an elevation dot
  ctx.fillStyle = 'orange'
  ctx.beginPath()
  ctx.arc(centerX, elevationY, 2, 0, Math.PI * 2)
  ctx.fill()

  // draw line from the center dot to the offset dot
  ctx.beginPath()
  ctx.moveTo(centerX, centerY)
  ctx.lineTo(centerX, elevationY)
  ctx.strokeStyle = 'rgba(47,255,0,0.5)'
  ctx.stroke()

  // draw an ellipse at the center
  const radiusX = Math.max(10, elevation / 2)
  ctx.setLineDash([3, 3])
  ctx.beginPath()
  ctx.ellipse(centerX, centerY, radiusX, radiusX / 2, 0, 0, Math.PI * 2)
  ctx.closePath()
  ctx.strokeStyle = 'rgba(47,255,0,0.5)'
  ctx.stroke()
  ctx.fillStyle = 'rgba(47,255,0,0.1)'
  ctx.fill()

  //ctx.globalAlpha = 1
}
