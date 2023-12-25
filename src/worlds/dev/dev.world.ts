import devWorldConfigData from './dev.world.json'

export const devWorldConfig = {
  world: {
    name: 'dev',
    label: 'Developer',
    width: 10,
    height: 10,
    cells: devWorldConfigData.cells,
  },
  render: {
    rendererName: 'canvas2d',
    cellSize: 64,
    canvasWidth: 800,
    canvasHeight: 800,
    // camera: {
    //   offset: {
    //     x: 0,
    //     y: 0,
    //   },
    // },
  },
}
