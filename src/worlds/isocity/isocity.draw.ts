/**
 * Drawing helpers for isometric boxes, measured in grid cells.
 * (x, y) is the screen position of the center of the box's footprint on the ground.
 */

/** Darken (amount < 0) or lighten (amount > 0) a '#rrggbb' color */
export function shadeColor(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const channel = (value: number) =>
    Math.round(amount < 0 ? value * (1 + amount) : value + (255 - value) * amount)
  const r = channel((n >> 16) & 255)
  const g = channel((n >> 8) & 255)
  const b = channel(n & 255)
  return `rgb(${r},${g},${b})`
}

export type IsoBox = {
  /** Footprint along the columns and rows, in cells */
  cols: number
  rows: number
  /** In pixels */
  height: number
  color: string
  /** Lifts the box off the ground, in pixels */
  elevation?: number
}

/** Screen offset of a grid offset (in cells) */
export const isoOffset = (tileSize: number, dCol: number, dRow: number): [number, number] => [
  (dCol - dRow) * (tileSize / 2),
  (dCol + dRow) * (tileSize / 4),
]

const polygon = (ctx: CanvasRenderingContext2D, points: Array<[number, number]>, fill: string) => {
  ctx.beginPath()
  ctx.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1])
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

/** The corners of a box's top face: back, right, front, left */
export function isoBoxTop(
  tileSize: number,
  x: number,
  y: number,
  box: IsoBox,
): Array<[number, number]> {
  const a = box.cols / 2
  const b = box.rows / 2
  const top = y - box.height - (box.elevation ?? 0)
  return [
    [-a, -b],
    [a, -b],
    [a, b],
    [-a, b],
  ].map(([dc, dr]) => {
    const [dx, dy] = isoOffset(tileSize, dc, dr)
    return [x + dx, top + dy]
  })
}

/** Draw the visible faces of a box: the top, the left (front-left) and the right (front-right) side */
export function drawIsoBox(
  ctx: CanvasRenderingContext2D,
  tileSize: number,
  x: number,
  y: number,
  box: IsoBox,
) {
  const [back, right, front, left] = isoBoxTop(tileSize, x, y, box)
  const down = (p: [number, number]): [number, number] => [p[0], p[1] + box.height]
  polygon(ctx, [left, front, down(front), down(left)], shadeColor(box.color, -0.15))
  polygon(ctx, [front, right, down(right), down(front)], shadeColor(box.color, -0.35))
  polygon(ctx, [back, right, front, left], box.color)
}

/** A flat shadow below a box, so it sits on the ground */
export function drawIsoShadow(
  ctx: CanvasRenderingContext2D,
  tileSize: number,
  x: number,
  y: number,
  cols: number,
  rows: number,
) {
  const [back, right, front, left] = isoBoxTop(tileSize, x + 4, y + 2, {
    cols,
    rows,
    height: 0,
    color: '',
  })
  polygon(ctx, [back, right, front, left], 'rgba(0,0,0,0.2)')
}
