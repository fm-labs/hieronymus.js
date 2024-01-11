export class CellSelection implements IMapSelection {
  private _cells: Grid2DCell[] = []

  setSelection(cells: Grid2DCell[]) {
    console.log('CellSelection.setSelection', cells)
    this._cells = cells
  }

  getSelectedCells(): Grid2DCell[] {
    return this._cells
  }

  isCellSelected(cell: Grid2DCell): boolean {
    return this._cells.some((c) => c.col === cell.col && c.row === cell.row)
  }
}
