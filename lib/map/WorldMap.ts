interface IWorldMap {
  setUnderground(cellIdx: number, data: WorldMapLayerData): void

  setGround(cellIdx: number, data: WorldMapLayerData): void

  setTile(cellIdx: number, data: WorldMapLayerData): void

  setObject(cellIdx: number, data: WorldMapLayerData): void

  setLayerData(layerIdx: number, cellIdx: number, data: WorldMapLayerData): void

  getLayerData(layerIdx: number, cellIdx: number): WorldMapLayerData | undefined

  serialize(): any
}

export class WorldMap implements IWorldMap {
  readonly LAYER_BACKGROUND = 0
  readonly LAYER_TILES = 1
  readonly LAYER_UNDERGROUND = 2
  readonly LAYER_GROUND = 3
  readonly LAYER_OBJECTS = 4
  readonly LAYER_OVERLAY = 5

  columns: number
  rows: number

  public layers: WorldMapLayer[] = [
    {
      name: 'background',
      type: 'BACKGROUND',
      data: [],
    },
    {
      name: 'tiles',
      type: 'TILELAYER',
      data: [],
    },
    {
      name: 'underground',
      type: 'TILELAYER',
      data: [],
    },
    {
      name: 'ground',
      type: 'TILELAYER',
      data: [],
    },
    {
      name: 'objects',
      type: 'OBJECTLAYER',
      data: [],
    },
    {
      name: 'hero',
      type: 'OBJECTLAYER',
      data: [],
    },
    {
      name: 'overlay',
      type: 'OBJECTLAYER',
      data: [],
    },
  ]

  constructor(cols: number, rows: number) {
    this.columns = cols
    this.rows = rows
  }

  setUnderground(cellIdx: number, data: WorldMapLayerData) {
    this.setLayerData(this.LAYER_UNDERGROUND, cellIdx, data)
  }

  setGround(cellIdx: number, data: WorldMapLayerData) {
    this.setLayerData(this.LAYER_GROUND, cellIdx, data)
  }

  setTile(cellIdx: number, data: WorldMapLayerData) {
    this.setLayerData(this.LAYER_TILES, cellIdx, data)
  }

  setObject(cellIdx: number, data: WorldMapLayerData) {
    this.setLayerData(this.LAYER_OBJECTS, cellIdx, data)
  }

  setLayerData(layerIdx: number, cellIdx: number, data: WorldMapLayerData) {
    if (!this.layers[layerIdx]) throw new Error(`Layer ${layerIdx} does not exist`)
    this.layers[layerIdx].data[cellIdx] = data
  }

  getLayerData(layerIdx: number, cellIdx: number): WorldMapLayerData | undefined {
    return this.layers[layerIdx]?.data[cellIdx] || undefined
  }

  serialize(): any {
    return {
      cols: this.columns,
      rows: this.rows,
      layers: this.layers,
    }
  }
}
