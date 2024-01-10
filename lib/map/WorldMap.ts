import { TileEntity } from '../entity/TileEntity.ts'
import { EntityManager } from './EntityManager.ts'
import { DimetricGridProjection } from './projection.ts'
import { getCellIndex } from '../utils/gridutil.ts'

export class WorldMap implements IWorldMap {
  readonly LAYER_TILES = 0
  readonly LAYER_UNDERGROUND = 1
  readonly LAYER_GROUND = 2
  readonly LAYER_OBJECTS = 3

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
  private projection: DimetricGridProjection

  constructor(config: WorldMapConfig) {
    this.columns = config.columns
    this.rows = config.rows
    this.tileWidth = config.tileSize
    this.tileHeight = config.tileSize / 2

    this.entities = new EntityManager()
    this.projection = new DimetricGridProjection(this.tileWidth)
  }

  addTile(layerId: number, col: number, row: number, properties: GameEntityProperties) {
    const tile = new TileEntity({ width: this.tileWidth, height: this.tileHeight, ...properties })
    const screenPos = this.projection.mapGridToScreen(col, row)
    tile.setPosition(screenPos.x, screenPos.y)

    const entityId = this.entities.add(tile)
    const cellIdx = getCellIndex(col, row, this.columns)

    console.log('addTile', layerId, col, row, cellIdx, entityId)
    this.setLayerData(layerId, cellIdx, entityId)
  }

  setTile(layerId: number, col: number, row: number, tile: IGameEntity) {
    const cellIdx = getCellIndex(col, row, this.columns)
    const entityId = this.entities.add(tile)
    this.setLayerData(layerId, cellIdx, entityId)
  }

  getTile(layerId: number, col: number, row: number): IGameEntity | undefined {
    const entityId = this.getLayerData(layerId, getCellIndex(col, row, this.columns))
    if (!entityId) return undefined
    return this.entities.get(entityId)
  }

  setLayerData(layerIdx: number, cellIdx: number, data: WorldMapLayerData) {
    if (!this.layers[layerIdx]) throw new Error(`Layer ${layerIdx} does not exist`)
    this.layers[layerIdx].data[cellIdx] = data
  }

  getLayerData(layerIdx: number, cellIdx: number): WorldMapLayerData | undefined {
    return this.layers[layerIdx]?.data[cellIdx] || undefined
  }

  addObject(layerId: number, obj: IGameEntity): void {
    const entityId = this.entities.add(obj)
    this.objects[layerId] = this.objects[layerId] || []
    this.objects[layerId].push(entityId)
  }

  addObjectAt(layerId: number, col: number, row: number, obj: IGameEntity): void {
    const screenPos = this.projection.mapGridToScreen(col, row)
    obj.setPosition(screenPos.x, screenPos.y)

    const entityId = this.entities.add(obj)
    this.objects[layerId] = this.objects[layerId] || []
    this.objects[layerId].push(entityId)
  }

  getObject(layerId: number, id: number): IGameEntity | undefined {
    const entityId = this.objects[layerId][id] || undefined
    if (!entityId) return undefined
    return this.entities.get(entityId)
  }

  updateObject(layerId: number, id: number, obj: IGameEntity): void {}

  serialize(): any {
    return {
      cols: this.columns,
      rows: this.rows,
      layers: this.layers,
    }
  }
}
