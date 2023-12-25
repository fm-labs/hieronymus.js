export const mapCellCordsToIndex = (x: number, y: number, width: number): number => {
  return y * width + x
}

export const getWorldCell = (world: World, x: number, y: number): WorldCell | undefined => {
  const idx = mapCellCordsToIndex(x, y, world.width)
  console.log('GETCELL', x, y, idx)
  return world.cells ? world.cells[idx] : undefined
}
