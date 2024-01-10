import { DimetricGridProjection, OrthogonalGridProjection } from '../map/projection.ts'
import { degreeToRadian } from '../utils/mathutil.ts'
import { FILL_COLORS, STROKE_COLORS } from '../constants.ts'

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
  ctx.fillStyle = fillColor
  ctx.fill()

  // Stroke the tile with a border
  ctx.strokeStyle = strokeColor
  ctx.stroke()

  //ctx.fillStyle = 'rgba(255,0,0,0.92)'
  //ctx.fillText(`${x},${y}`, x, y)

  if (text) {
    ctx.fillStyle = 'rgba(114,112,112,0.92)'
    ctx.fillText(text, x - 10, y + height / 2)
  }
  ctx.restore()
}

export function drawIsometricCube(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  depth: number,
  text?: string,
) {
  const topFacePaths = [
    [x, y],
    [x + width / 2, y + height / 2],
    [x, y + height],
    [x - width / 2, y + height / 2],
  ]
  const leftFacePaths = [
    [x, y + height],
    [x, y + height + depth],
    [x - width / 2, y + height / 2 + depth],
    [x - width / 2, y + height / 2],
  ]
  const rightFacePaths = [
    [x, y + height],
    [x, y + height + depth],
    [x + width / 2, y + height / 2 + depth],
    [x + width / 2, y + height / 2],
  ]

  // Draw top face
  ctx.setLineDash([3, 3]) // [dashLength, gapLength]
  //ctx.translate(0, height / 2)

  const paths = [topFacePaths, leftFacePaths, rightFacePaths]
  paths.forEach((paths, idx) => {
    ctx.beginPath()
    ctx.moveTo(paths[0][0], paths[0][1])
    for (let i = 1; i < paths.length; i++) {
      ctx.lineTo(paths[i][0], paths[i][1])
    }
    ctx.closePath()

    ctx.fillStyle = FILL_COLORS[idx]
    ctx.fill()
    ctx.strokeStyle = STROKE_COLORS[idx]
    ctx.stroke()
  })

  // ctx.beginPath()
  // ctx.moveTo(x, y)
  // ctx.lineTo(x + width / 2, y + height / 2)
  // ctx.lineTo(x, y + height)
  // ctx.lineTo(x - width / 2, y + height / 2)
  // ctx.closePath()
  //
  // ctx.fillStyle = fillColor[0]
  // ctx.fill()
  // ctx.strokeStyle = strokeColor[0]
  // ctx.stroke()
  //
  // // Draw left face
  // ctx.beginPath()
  // ctx.moveTo(x, y + height)
  // ctx.lineTo(x, y + height + depth)
  // ctx.lineTo(x - width / 2, y + height / 2 + depth)
  // ctx.lineTo(x - width / 2, y + height / 2)
  // ctx.closePath()
  //
  // ctx.fillStyle = fillColor[1]
  // ctx.fill()
  // ctx.strokeStyle = 'green'
  // ctx.stroke()
  //
  // // Draw right face
  // ctx.beginPath()
  // ctx.moveTo(x, y + height)
  // ctx.lineTo(x, y + height + depth)
  // ctx.lineTo(x + width / 2, y + height / 2 + depth)
  // ctx.lineTo(x + width / 2, y + height / 2)
  // ctx.closePath()
  //
  // ctx.fillStyle = fillColor[2]
  // ctx.fill()
  // ctx.strokeStyle = 'blue'
  // ctx.stroke()

  // Draw text
  if (text) {
    const textWidth = ctx.measureText(text).width
    const textHeight = 20
    ctx.fillStyle = 'white'

    // ... on top face
    ctx.save()
    ctx.translate(x - textWidth / 2, y + height / 2)
    //const skewAngle0 = degreeToRadian(-30)
    //ctx.transform(1, 0, Math.tan(skewAngle0), 1, 0, 0)
    ctx.rotate(degreeToRadian(25))
    ctx.fillText(text, 0, 0)
    ctx.restore()

    // ... on left face
    ctx.save()
    ctx.translate(x - width / 2, y + height + depth / 2 - textHeight / 2)
    const skewAngle1 = degreeToRadian(-25)
    //ctx.transform(1, 0, Math.tan(skewAngle1), 1, 0, 0)
    ctx.rotate(degreeToRadian(25))
    ctx.fillText(text, 0, 0)
    ctx.setTransform(1, 0, 0, 1, 0, 0) // Reset the transformation matrix to the identity matrix
    ctx.restore()

    // ... on right face
    ctx.save()
    ctx.translate(x, y + height + depth / 2)
    //ctx.rotate(degreeToRadian(-25))
    const skewAngle = degreeToRadian(25)
    ctx.transform(1, 0, Math.tan(skewAngle), 1, 0, 0)
    ctx.fillText(text, 0, 0)
    ctx.setTransform(1, 0, 0, 1, 0, 0) // Reset the transformation matrix to the identity matrix
    ctx.restore()
  }
}

export function drawIsometricHexagon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  depth: number,
  //tileSize: number,
) {
  const scaleX = 1 // Scale factor for x-axis
  const scaleY = 0.5 // Scale factor for y-axis
  const angle = -Math.PI / 6 // Rotation angle (30 degrees in radians)

  //ctx.save()

  const topHexagonEdges = calculateIsometricHexagonEdges(0, 0, width, 1)
  //console.log(topHexagonEdges)

  // Draw bottom hexagon face
  //ctx.setTransform(scaleX, 0, 0, scaleY, x, y)
  //ctx.rotate(angle)

  ctx.setLineDash([3, 3]) // [dashLength, gapLength]

  ctx.translate(x, y)
  ctx.beginPath()
  ctx.moveTo(topHexagonEdges[0][0], topHexagonEdges[0][1])
  for (let i = 1; i < topHexagonEdges.length; i++) {
    ctx.lineTo(topHexagonEdges[i][0], topHexagonEdges[i][1])
  }
  ctx.closePath()

  ctx.fillStyle = FILL_COLORS[0]
  ctx.fill()
  ctx.strokeStyle = STROKE_COLORS[0]
  ctx.stroke()

  // Draw top hexagon face
  ctx.translate(0, -depth)
  ctx.beginPath()
  ctx.moveTo(topHexagonEdges[0][0], topHexagonEdges[0][1])
  for (let i = 1; i < topHexagonEdges.length; i++) {
    ctx.lineTo(topHexagonEdges[i][0], topHexagonEdges[i][1])
  }
  ctx.closePath()

  ctx.fillStyle = FILL_COLORS[0]
  ctx.fill()
  ctx.strokeStyle = FILL_COLORS[0]
  ctx.stroke()

  // Draw front faces
  for (const i of [0, 1, 5]) {
    ctx.beginPath()
    const j = i + 1 >= topHexagonEdges.length ? 0 : i + 1

    ctx.moveTo(topHexagonEdges[i][0], topHexagonEdges[i][1])
    ctx.lineTo(topHexagonEdges[i][0], topHexagonEdges[i][1] + depth)
    ctx.lineTo(topHexagonEdges[j][0], topHexagonEdges[j][1] + depth)
    ctx.lineTo(topHexagonEdges[j][0], topHexagonEdges[j][1])
    ctx.closePath()

    ctx.fillStyle = FILL_COLORS[i]
    ctx.fill()
    ctx.strokeStyle = STROKE_COLORS[i]
    ctx.stroke()
  }

  //ctx.restore()
}

function calculateHexagonEdges(x: number, y: number, length: number): [number, number][] {
  const edges: [number, number][] = []

  for (let i = 0; i < 6; i++) {
    const angle = 60 * i * (Math.PI / 180) // Convert to radians
    const edgeX = x + length * Math.cos(angle)
    const edgeY = y + length * Math.sin(angle)
    edges.push([edgeX, edgeY])
  }

  return edges
}

function calculateIsometricHexagonEdges(
  x: number,
  y: number,
  length: number,
  tileSize: number,
): [number, number][] {
  const edges: [number, number][] = calculateHexagonEdges(x, y, length)
  return edges.map((edge) => orthogonalToIsometric(edge[0], edge[1], tileSize))
}

function orthogonalToIsometric(orthoX: number, orthoY: number, tileSize: number): [number, number] {
  // const tileWidth = tileSize
  // const tileHeight = tileSize / 2
  // const isoX = (orthoX - orthoY) * (tileWidth / 2)
  // const isoY = (orthoX + orthoY) * (tileHeight / 2)
  // return [isoX, isoY]
  //console.log('orthoScreenPos', orthoX, orthoY)
  const orthoProjection = new OrthogonalGridProjection(tileSize)
  const isoProjection = new DimetricGridProjection(tileSize)

  const orthoGridPos = orthoProjection.mapScreenToGrid(orthoX, orthoY)
  //console.log('orthoGridPos', orthoGridPos)
  const isoScreenPos = isoProjection.mapGridToScreen(orthoGridPos.col, orthoGridPos.row)
  //console.log('isoScreenPos', isoScreenPos)
  return [isoScreenPos.x, isoScreenPos.y]
}

function isometricToOrthogonal(isoX: number, isoY: number, tileSize: number): [number, number] {
  // const tileWidth = tileSize
  // const tileHeight = tileSize / 2
  // const orthoX = (isoX / tileWidth + isoY / tileHeight) / 2
  // const orthoY = (isoY / tileHeight - isoX / tileWidth) / 2
  // return [orthoX, orthoY]
  const isoProjection = new DimetricGridProjection(tileSize)
  const orthoProjection = new OrthogonalGridProjection(tileSize)
  const gridPos = isoProjection.mapScreenToGrid(isoX, isoY)
  const screenPos = orthoProjection.mapGridToScreen(gridPos.col, gridPos.row)
  return [screenPos.x, screenPos.y]
}
