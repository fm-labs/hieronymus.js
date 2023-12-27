/**
 *
 * @param col
 * @param row
 * @param gridWidth
 * @deprecated Use getCellIndex instead
 */
export const mapCellCordsToIndex = (col: number, row: number, gridWidth: number): number => {
  return row * gridWidth + col
}

/**
 *
 * @param world
 * @param col
 * @param row
 * @deprecated
 */
export const getWorldCell = (world: World, col: number, row: number): WorldCell | undefined => {
  const idx = mapCellCordsToIndex(col, row, world.width)
  console.log('GETCELL', col, row, idx)
  return world.cells ? world.cells[idx] : undefined
}

/**
 * Determine the cell index from the column and row.
 */
export function getCellIndex(col: number, row: number, gridWidth: number): number {
  return row * gridWidth + col
}

/**
 * Get the isometric cell coords
 * @param col
 * @param row
 * @param tsize
 * @deprecated Use getIsometricScreenPosition instead
 */
export function getIsometricCellCords(col: number, row: number, tsize: number) {
  const twidth = tsize
  const theight = tsize / 2

  return {
    x: col * (twidth / 2) + row * (twidth / 2),
    y: row * (theight / 2) - col * (theight / 2),
  }
}

export function getTileIndexFromIsometricGridPosition(
  x: number,
  y: number,
  tsize: number,
  gridwith: number,
): number {
  const { col, row } = getIsometricGridPosition(x, y, tsize)
  return getCellIndex(col, row, gridwith)
}

/** ISOMETRIC GRID */

/**
 * Get the isometric grid position
 * @param x
 * @param y
 * @param tileWidth
 * @deprecated Use IsometricGridProjection instead
 */
export function getIsometricGridPosition(x: number, y: number, tileWidth: number) {
  const tileHeight = tileWidth / 2
  const tileWidthHalf = tileWidth / 2
  const tileHeightHalf = tileHeight / 2
  const col = Math.floor((x / tileWidthHalf + y / tileHeightHalf) / 2)
  const row = Math.floor((y / tileHeightHalf - x / tileWidthHalf) / 2)
  return { col, row }
}

/**
 * Get the isometric screen position
 * @param col
 * @param row
 * @param tileWidth
 * @deprecated Use IsometricGridProjection instead
 */
export function getIsometricScreenPosition(col: number, row: number, tileWidth: number) {
  const tileHeight = tileWidth / 2
  //const x = col * (tileWidth / 2) - row * (tileWidth / 2)
  //const y = col * (tileHeight / 2) + row * (tileHeight / 2)
  //simplified:
  const x = (col - row) * (tileWidth / 2)
  const y = (col + row) * (tileHeight / 2)

  return { x, y }
}

/** ORTHOGONAL GRID */

/**
 * Get the orthogonal screen position
 * @param col
 * @param row
 * @param tileSize
 * @deprecated Use OrthogonalGridProjection instead
 */
export function getOrthogonalScreenPosition(col: number, row: number, tileSize: number) {
  const tileWidth = tileSize
  const tileHeight = tileSize
  const x = col * tileWidth
  const y = row * tileHeight
  return { x, y }
}

/**
 * Get the orthogonal grid position
 * @param x
 * @param y
 * @param tileSize
 * @deprecated Use OrthogonalGridProjection instead
 */
export function getOrthogonalGridPosition(x: number, y: number, tileSize: number) {
  const tileWidth = tileSize
  const tileHeight = tileSize
  const col = Math.floor(x / tileWidth)
  const row = Math.floor(y / tileHeight)
  return { col, row }
}
