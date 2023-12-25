export const chessWorldConfig: WorldConfig = {
  world: {
    name: 'chess',
    label: 'Chess',
    width: 8,
    height: 8,
    cells: [],
  },
  render: {
    rendererName: 'canvas2d',
    cellSize: 64,
    canvasWidth: 600,
    canvasHeight: 600,
    camera: {
      offset: {
        x: 0,
        y: 0,
      },
      zoom: 1,
    },
  },
}
