export const defaultWorldConfig = {
  world: {
    name: 'default',
    label: 'Default',
    width: 10,
    height: 10,
    cells: [],
  },
  render: {
    rendererName: 'canvas2d',
    cellSize: 32,
    canvasWidth: 480,
    canvasHeight: 320,
    camera: {
      offset: {
        x: 0,
        y: 0,
      },
    },
  },
}
