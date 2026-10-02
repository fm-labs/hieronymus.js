import type { Grid2DCell } from '../game.types'
export interface IMapSelection {
  getSelectedCells: () => Grid2DCell[]
  isCellSelected: (cell: Grid2DCell) => boolean
}
