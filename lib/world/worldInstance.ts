import { getCellIndex } from '../utils/gridutil.ts'

/**
 * Legacy WorldInstance class
 * @deprecated
 */
export class WorldInstance {
  public name: string
  public label?: string
  public width: number
  public height: number
  public cells: WorldCell[]

  private lastTick: number = 0

  constructor(world: World) {
    this.name = world.name
    this.label = world.label
    this.width = world.width
    this.height = world.height
    this.cells = world.cells || []
  }

  public getCell(x: number, y: number): WorldCell | undefined {
    const cellIdx = getCellIndex(x, y, this.width)
    console.log('getCell', x, y, cellIdx, this.cells[cellIdx])
    return this.cells[cellIdx]
  }

  public setCells(cells: WorldCell[]) {
    this.cells = cells
  }

  public setCell(cell: WorldCell) {
    const cellIdx = getCellIndex(cell.x, cell.y, this.width)
    console.log('setCell', cell.x, cell.y, cellIdx, cell)
    this.cells[cellIdx] = cell
  }

  public setCellLayer(cell: WorldCell, layer: WorldCellLayer) {
    const cellIdx = getCellIndex(cell.x, cell.y, this.width)
    const cellLayers = this.cells[cellIdx].layers || []
    const layerIdx = cellLayers.findIndex((l) => l.idx === layer.idx)
    if (layerIdx >= 0) {
      cellLayers[layerIdx] = layer
    } else {
      cellLayers.push(layer)
    }
    this.cells[cellIdx].layers = cellLayers
  }

  public start() {
    console.log('START WORLD')
    this.lastTick = Date.now()
    this.tick()
  }

  public stop() {
    console.log('STOP WORLD')
    // TODO
  }

  public tick() {
    console.log('TICK WORLD')
    const now = Date.now()
    const delta = now - this.lastTick
    this.tickCells()
    this.lastTick = now
  }

  private tickCells() {
    this.cells.forEach((cell) => {
      //cell.tick(cell, this)
    })
  }
}
