import { mapCellCordsToIndex } from './util.ts'

export const worldBuilder: WorldBuilder = ({
  width,
  height,
  cells,
  name,
  label,
}: WorldBuilderProps): World => {
  cells = cells || []

  if (cells.length === 0) {
    cells = new Array(width * height)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = mapCellCordsToIndex(x, y, width)
        cells[idx] = {
          type: 'default',
          x: x,
          y: y,
          alive: false,
          sprite: undefined,
          layers: undefined,
        }
      }
    }
  }

  if (cells.length !== width * height) {
    throw new Error(`Invalid cell count: ${cells.length} != ${width * height}`)
  }

  // normalize cells
  cells = cells.map((cell) => {
    let layers: WorldCellLayer[] | undefined = undefined
    if (!cell.layers && cell.sprite) {
      layers = [
        {
          idx: 0,
          sprite: cell.sprite,
        },
      ]
    }
    return {
      type: 'default',
      ...cell,
      sprite: undefined,
      layers: cell.layers || layers,
    }
  })

  return {
    name,
    label,
    width,
    height,
    cells,
    //getCell,
    //setCells
  }
}
