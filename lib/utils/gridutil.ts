/**
 * Determine the one-dimensional cell index from the column and row.
 */
export function getCellIndex(col: number, row: number, columns: number): number {
  return row * columns + col
}

/**
 * Get the grid position from the one-dimensional cell index.
 *
 * @param index - The cell index.
 * @param columns - The number of columns in the grid.
 * @returns An object containing the column and row of the grid position.
 */
export function getGridPosFromIndex(index: number, columns: number): { col: number; row: number } {
  const col = index % columns
  const row = Math.floor(index / columns)
  return { col, row }
}

/** ISOMETRIC GRID */

/**
 * Get the isometric grid position
 * @param x
 * @param y
 * @param tileWidth
 */
export function isometricScreenToGrid(x: number, y: number, tileWidth: number) {
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
 */
export function isometricGridToScreen(col: number, row: number, tileWidth: number) {
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
 */
export function orthogonalGridToScreen(col: number, row: number, tileSize: number) {
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
 */
export function orthogonalScreenToGrid(x: number, y: number, tileSize: number) {
  const tileWidth = tileSize
  const tileHeight = tileSize
  const col = Math.floor(x / tileWidth)
  const row = Math.floor(y / tileHeight)
  return { col, row }
}

/**
 * Find neighboring cells in a 2D grid within a given distance.
 * @param col - Column index of the cell (x-axis)
 * @param row - Row index of the cell (y-axis)
 * @param totalCols - Total number of columns in the grid
 * @param totalRows - Total number of rows in the grid
 * @param distance - Distance from the center cell to search for neighbors
 * @returns An array of [col, row] pairs representing neighboring cells
 */
export function findCellNeighbors(
  col: number,
  row: number,
  totalCols: number,
  totalRows: number,
  distance: number = 1,
): [number, number][] {
  const neighbors: [number, number][] = []

  for (let dy = -distance; dy <= distance; dy++) {
    for (let dx = -distance; dx <= distance; dx++) {
      if (dx === 0 && dy === 0) continue // Skip the center cell itself

      const nCol = col + dx
      const nRow = row + dy

      if (nCol >= 0 && nCol < totalCols && nRow >= 0 && nRow < totalRows) {
        neighbors.push([nCol, nRow])
      }
    }
  }

  return neighbors
}
