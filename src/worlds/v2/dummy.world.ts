const map = {
  cols: 10,
  rows: 10,
  tsize: 64,
}

const camera = {
  x: 0,
  y: 0,
  width: 400,
  height: 400,
  offset: {
    x: 0,
    y: 0,
  },
  zoom: 1,
}

const world = {
  name: 'test',
  label: 'Test',
  assets: {
    tilemaps: [
      {
        name: 'test',
        label: 'Test',
        url: 'assets/tilemaps/test.json',
      },
    ],
  },
  tileset: [
    {
      tilemap: 'test',
      x: 0,
      y: 0,
      width: 64,
      height: 64,
    },
    {
      tilemap: 'test',
      x: 64,
      y: 0,
      width: 64,
      height: 64,
    },
  ],
}

export default { map, camera }
