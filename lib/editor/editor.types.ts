interface IMapSelection {
  getSelectedCells: () => Grid2DCell[]
  isCellSelected: (cell: Grid2DCell) => boolean
}
