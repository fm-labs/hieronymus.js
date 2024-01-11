import { TileComponent } from '../components/TileComponent.ts'
import { EntityManager } from '../entity/EntityManager.ts'
import { DimetricGridProjection } from './projection.ts'
import { getCellIndex } from '../utils/gridutil.ts'

export class WorldMap implements IWorldMap {
  readonly assets: any[]

  columns: number
  rows: number
  tileWidth: number
  tileHeight: number

  public layers: WorldMapLayer[] = [
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
    // {
    //   name: 'hero',
    //   type: 'OBJECTLAYER',
    //   data: [],
    // },
    // {
    //   name: 'overlay',
    //   type: 'OBJECTLAYER',
    //   data: [],
    // },
  ]
  public readonly objects: WorldMapLayerData[][] = []
  public readonly entities: EntityManager
  public readonly projection: IGrid2DProjection

  constructor(config: WorldMapConfig) {
    this.assets = []
    this.columns = config.columns
    this.rows = config.rows
    this.tileWidth = config.tileSize
    this.tileHeight = config.tileSize / 2

    this.entities = new EntityManager()
    this.projection = new DimetricGridProjection(this.tileWidth)
  }

  registerAsset(assetType: string, name: string, asset: any) {
    this.assets.push({ type: assetType, name, ...asset })
  }

  addLayer(layerId: number, layer: WorldMapLayer) {
    this.layers[layerId] = layer
  }

  addTileAtPosition(
    layerId: number,
    pos: Grid2DPosition | Screen2DPosition,
    properties: GameComponentProperties,
  ) {
    if ('col' in pos && 'row' in pos) {
      this.addTile(layerId, pos.col, pos.row, properties)
    } else if ('x' in pos && 'y' in pos) {
      const gridPos = this.projection.mapScreenToGrid(pos.x, pos.y)
      this.addTile(layerId, gridPos.col, gridPos.row, properties)
    }
  }

  addTile(layerId: number, col: number, row: number, properties: TileComponentProperties) {
    const tile = new TileComponent({
      width: this.tileWidth,
      height: this.tileHeight,
      ...properties,
    })
    const screenPos = this.projection.mapGridToScreen(col, row)
    tile.setPosition(screenPos.x, screenPos.y)

    const entityId = this.entities.add(tile)
    const cellIdx = getCellIndex(col, row, this.columns)

    console.log('addTile', layerId, col, row, cellIdx, entityId)
    this.setLayerData(layerId, cellIdx, entityId)
  }

  setTile(layerId: number, col: number, row: number, tile: IGameComponent) {
    const screenPos = this.projection.mapGridToScreen(col, row)
    tile.setPosition(screenPos.x, screenPos.y)

    const cellIdx = getCellIndex(col, row, this.columns)
    const entityId = this.entities.add(tile)

    console.log('setTile', layerId, col, row, cellIdx, entityId)
    this.setLayerData(layerId, cellIdx, entityId)
  }

  getTile(layerId: number, col: number, row: number): IGameComponent | undefined {
    const entityId = this.getLayerData(layerId, getCellIndex(col, row, this.columns))
    if (!entityId) return undefined
    return this.entities.get(entityId)?.component
  }

  setLayerData(layerIdx: number, cellIdx: number, data: WorldMapLayerData) {
    if (!this.layers[layerIdx]) throw new Error(`Layer ${layerIdx} does not exist`)
    this.layers[layerIdx].data[cellIdx] = data
  }

  getLayerData(layerIdx: number, cellIdx: number): WorldMapLayerData | undefined {
    return this.layers[layerIdx]?.data[cellIdx] || undefined
  }

  addObject(layerId: number, obj: IGameComponent): void {
    const entityId = this.entities.add(obj)
    //this.objects[layerId] = this.objects[layerId] || []
    //this.objects[layerId].push(entityId)
    this.layers[layerId].data.push(entityId)
  }

  addObjectAt(layerId: number, col: number, row: number, obj: IGameComponent): void {
    const screenPos = this.projection.mapGridToScreen(col, row)
    obj.setPosition(screenPos.x, screenPos.y)

    //const entityId = this.entities.add(obj)
    //this.objects[layerId] = this.objects[layerId] || []
    //this.objects[layerId].push(entityId)
    this.addObject(layerId, obj)
  }

  getObject(layerId: number, id: number): IGameComponent | undefined {
    //const entityId = this.objects[layerId][id] || undefined
    const entityId = this.layers[layerId].data[id] || undefined
    if (!entityId) return undefined
    return this.entities.get(entityId)?.component
  }

  updateObject(layerId: number, id: number, obj: IGameComponent): void {}

  serialize(): any {
    return {
      cols: this.columns,
      rows: this.rows,
      layers: this.layers,
    }
  }
}
