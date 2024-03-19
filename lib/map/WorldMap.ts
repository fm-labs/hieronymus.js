import { TileComponent, TileComponentProps } from '../components/TileComponent.ts'
import { EntityManager } from '../entity/EntityManager.ts'
import { getCellIndex } from '../utils/gridutil.ts'
import { DimetricGridProjection } from './DimetricGridProjection.ts'
import { OrthogonalGridProjection } from './OrthogonalGridProjection.ts'

export class WorldMap implements IWorldMap {
  readonly assets: any[]

  columns: number
  rows: number
  tileWidth: number
  tileHeight: number

  public readonly layers: WorldMapLayer[] = []
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
    //this.projection = new OrthogonalGridProjection(this.tileWidth, config.columns, config.rows)
    this.projection = new DimetricGridProjection(this.tileWidth, config.columns, config.rows)
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
    properties: TileComponentProps,
  ) {
    if ('col' in pos && 'row' in pos) {
      this.addTile(layerId, pos.col, pos.row, properties)
    } else if ('x' in pos && 'y' in pos) {
      const gridPos = this.projection.mapScreenToGrid(pos.x, pos.y)
      this.addTile(layerId, gridPos.col, gridPos.row, properties)
    }
  }

  addTile(layerId: number, col: number, row: number, properties: Partial<TileComponentProps>) {
    const defaultProperties: TileComponentProps = {
      width: this.tileWidth,
      height: this.tileHeight,
    }
    const tile = new TileComponent({
      ...defaultProperties,
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

  getObject(layerId: number, idx: number): IGameComponent | undefined {
    //const entityId = this.objects[layerId][id] || undefined
    const entityId = this.layers[layerId].data[idx] || undefined
    if (!entityId) return undefined
    return this.entities.get(entityId)?.component
  }

  updateObject(layerId: number, idx: number, obj: IGameComponent): void {
    const entityId = this.layers[layerId].data[idx] || undefined
    if (!entityId) throw new Error(`Entity ${idx} does not exist`)
    const entity = this.entities.get(entityId)
    if (!entity) throw new Error(`Entity ${idx} does not exist`)
    entity.component = obj
    this.entities.set(entityId, entity)
  }

  serialize(): any {
    return {
      cols: this.columns,
      rows: this.rows,
      layers: this.layers,
    }
  }
}
