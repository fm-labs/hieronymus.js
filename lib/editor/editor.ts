import { WORLD_EDITOR_CELL_TOGGLE_DEADALIVE, WorldEditorModeType } from './editorModes.ts'

export class WorldInstanceEditor {
  public world: WorldInstanceType
  public canvas: HTMLCanvasElement

  public editMode: WorldEditorModeType = WORLD_EDITOR_CELL_TOGGLE_DEADALIVE

  constructor(world: WorldInstanceType, canvas: HTMLCanvasElement) {
    this.world = world
    this.canvas = canvas
  }

  public init() {
    // @todo Attach event listeners
  }

  public unload() {
    // @todo Detach event listeners
  }

  // public getWorld() {
  //   return this.world
  // }
  //
  // public setWorld(world: WorldInstance) {
  //   this.world = world
  // }

  public setEditMode(editMode: WorldEditorModeType) {
    console.log('setEditMode', editMode)
    this.editMode = editMode
  }

  public getCell(x: number, y: number): WorldCell | undefined {
    return this.world.getCell(x, y)
  }

  public setCell(cell: WorldCell) {
    console.log('setCell', cell)
    this.world.setCell(cell)
  }

  public setCellLayer(cell: WorldCell, layer: WorldCellLayer) {
    this.world.setCellLayer(cell, layer)
  }
}
