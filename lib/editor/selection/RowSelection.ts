import type { Grid2DCell } from '../../game.types'
import type { IMapSelection } from '../editor.types'
export class RowSelection implements IMapSelection {
  private readonly _gameRows: number
  private _rowIds: number[] = []

  constructor(numberOfRows: number) {
    this._gameRows = numberOfRows
  }

  setSelectedRows(rowIds: number[]) {
    console.log('RowSelection.setSelectedRows', rowIds)
    this._rowIds = rowIds
  }

  addSelectedRow(rowId: number) {
    this._rowIds.push(rowId)
  }

  removeSelectedRow(rowId: number) {
    this._rowIds = this._rowIds.filter((id) => id !== rowId)
  }

  getSelectedCells(): Grid2DCell[] {
    const cells: Grid2DCell[] = []
    this._rowIds.forEach((rowId) => {
      for (let col = 0; col < this._gameRows; col++) {
        cells.push({ col, row: rowId })
      }
    })
    return cells
  }

  isCellSelected(cell: Grid2DCell): boolean {
    return this._rowIds.includes(cell.row)
  }
}
