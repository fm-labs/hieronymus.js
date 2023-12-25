import * as elbaWorld from './elba.world.json'
//import elbaBgImage from '../../assets/backgrounds/elba1.jpg'

export const elbaWorldConfig: WorldConfig = {
  world: {
    name: 'elba',
    label: 'Elba',
    width: 64,
    height: 48,
    cells: elbaWorld.cells,
  },
  render: {
    rendererName: 'canvas2d',
    //backgroundImage: elbaBgImage,
    cellSize: 16,
    canvasWidth: 1024,
    canvasHeight: 768,
    // camera: {
    //   offset: {
    //     x: 0,
    //     y: 0,
    //   },
    //   zoom: 1
    // },
  },
}
