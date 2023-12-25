import { smileyCells } from './smiley.cells.ts'

export const smileyWorldConfig: WorldConfig = {
  world: {
    name: 'smiley',
    label: 'Smiley',
    width: 10,
    height: 10,
    cells: smileyCells,
  },
  render: {
    rendererName: 'canvas2d',
    cellSize: 32,
    canvasWidth: 400,
    canvasHeight: 400,
    // camera: {
    //   offset: {
    //     x: 0,
    //     y: 0,
    //   },
    //   zoom: 1
    // },
  },
}
