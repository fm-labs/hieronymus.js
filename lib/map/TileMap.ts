import { TileComponent, TileComponentProps } from '../components/TileComponent.ts'
import { ComponentManager } from '../kernel/ComponentManager.ts'
import { getCellIndex } from '../utils/gridutil.ts'
import { DimetricGridProjection } from './DimetricGridProjection.ts'
import { OrthogonalGridProjection } from './OrthogonalGridProjection.ts'

export class TileMap implements ITileMap {
  // readonly assets: any[]

  readonly config: TileMapConfig

  readonly columns: number
  readonly rows: number
  readonly tileWidth: number
  readonly tileHeight: number

  public layers: TileMapLayer[] = []
  public readonly components: ComponentManager
  public readonly projection: IGrid2DProjection

  constructor(config: TileMapConfig, layers: TileMapLayer[] = [], components?: any) {
    this.config = config
    this.columns = config.columns
    this.rows = config.rows
    this.tileWidth = config.tileSize
    this.tileHeight = config.tileSize / 2

    this.layers = layers

    this.components = new ComponentManager()
    if (components) {
      this.components.restore(components)
    }

    let projection: IGrid2DProjection
    if (config.projection === 'dimetric') {
      projection = new DimetricGridProjection(this.tileWidth, config.columns, config.rows)
    } else {
      projection = new OrthogonalGridProjection(this.tileWidth, config.columns, config.rows)
    }
    this.projection = projection
  }

  // registerAsset(assetType: string, name: string, asset: any) {
  //   this.assets.push({ type: assetType, name, ...asset })
  // }

  addLayer(layerId: number, layer: TileMapLayer, data: TileMapLayerData[] = []) {
    this.layers[layerId] = layer

    // Initialize the layer data array with empty values
    const totalCells = this.columns * this.rows

    if (layer.type === 'TILELAYER') {
      layer.data = new Array(totalCells).fill(0)
    } else {
      layer.data = []
    }
  }

  // addTileAtPosition(
  //   layerId: number,
  //   pos: Grid2DPosition | Screen2DPosition,
  //   properties: TileComponentProps,
  // ) {
  //   if ('col' in pos && 'row' in pos) {
  //     this.addTile(layerId, pos.col, pos.row, properties)
  //   } else if ('x' in pos && 'y' in pos) {
  //     const gridPos = this.projection.mapScreenToGrid(pos.x, pos.y)
  //     this.addTile(layerId, gridPos.col, gridPos.row, properties)
  //   }
  // }

  /**
   * Creates a tile at the specified layer, column, and row with the given properties.
   * @param layerId - The ID of the layer to add the tile to.
   * @param col - The column index of the tile.
   * @param row - The row index of the tile.
   * @param properties - Partial properties for the tile.
   * @returns The component ID of the created tile.
   * @deprecated Use assignTile instead
   */
  createTile(layerId: number, col: number, row: number, properties: Partial<TileComponentProps>) {
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

    const componentId = this.components.add(tile)
    console.log('createTile', layerId, col, row, componentId)
    this.setTileLayerData(layerId, col, row, componentId)
    return componentId
  }

  /**
   * @param layerId
   * @param col
   * @param row
   * @param tile
   * @deprecated Use assignTile instead
   */
  addTile(layerId: number, col: number, row: number, tile: IGameComponent) {
    if (!this.layers[layerId]) throw new Error(`Layer ${layerId} does not exist`)
    if (this.layers[layerId].type !== 'TILELAYER') {
      throw new Error(`Layer ${layerId} is not a TILELAYER`)
    }

    const screenPos = this.projection.mapGridToScreen(col, row)
    tile.setPosition(screenPos.x, screenPos.y)

    // @todo check if tile is already assigned to this position

    const componentId = this.components.add(tile)
    console.log('addTile', layerId, col, row, componentId)
    this.setTileLayerData(layerId, col, row, componentId)
    return componentId
  }

  assignTile(layerId: number, col: number, row: number, componentId: number) {
    console.log('assignTile', layerId, col, row, componentId)

    if (!this.layers[layerId]) throw new Error(`Layer ${layerId} does not exist`)
    if (this.layers[layerId].type !== 'TILELAYER') {
      throw new Error(`Layer ${layerId} is not a TILELAYER`)
    }

    const screenPos = this.projection.mapGridToScreen(col, row)
    const tile = this.components.get(componentId)
    if (!tile) throw new Error(`Entity ${componentId} does not exist`)

    tile.setPosition(screenPos.x, screenPos.y)
    this.setTileLayerData(layerId, col, row, componentId)
  }

  resetTile(layerId: number, col: number, row: number) {
    console.log('resetTile', layerId, col, row)
    if (!this.layers[layerId]) throw new Error(`Layer ${layerId} does not exist`)
    const cellIdx = getCellIndex(col, row, this.columns)
    this.layers[layerId].data[cellIdx] = 0 // Reset to empty
  }

  getTile(layerId: number, col: number, row: number): IGameComponent | undefined {
    const componentId = this.getTileLayerData(layerId, col, row)
    if (!componentId) return undefined
    return this.components.get(componentId)
  }

  private setTileLayerData(layerIdx: number, col: number, row: number, data: TileMapLayerData) {
    if (!this.layers[layerIdx]) throw new Error(`Layer ${layerIdx} does not exist`)
    const cellIdx = getCellIndex(col, row, this.columns)
    this.layers[layerIdx].data[cellIdx] = data
  }

  private getTileLayerData(
    layerIdx: number,
    col: number,
    row: number,
  ): TileMapLayerData | undefined {
    const cellIdx = getCellIndex(col, row, this.columns)
    return this.layers[layerIdx]?.data[cellIdx] || undefined
  }

  // addObject(layerId: number, obj: IGameComponent): number {
  //   const componentId = this.components.add(obj)
  //   this.layers[layerId].data.push(componentId)
  //   return componentId
  // }

  addObjectAtGridPos(layerId: number, col: number, row: number, obj: IGameComponent): number {
    if (!this.layers[layerId]) throw new Error(`Layer ${layerId} does not exist`)
    if (this.layers[layerId].type !== 'OBJECTLAYER') {
      throw new Error(`Layer ${layerId} is not an OBJECTLAYER`)
    }

    const screenPos = this.projection.mapGridToScreen(col, row)
    obj.setPosition(screenPos.x, screenPos.y)
    const componentId = this.components.add(obj)
    this.layers[layerId].data.push(componentId)
    return componentId
  }

  removeObject(layerId: number, componentId: number): void {
    if (!this.layers[layerId]) throw new Error(`Layer ${layerId} does not exist`)
    if (this.layers[layerId].type !== 'OBJECTLAYER') {
      throw new Error(`Layer ${layerId} is not an OBJECTLAYER`)
    }

    const index = this.layers[layerId].data.indexOf(componentId)
    if (index === -1) {
      throw new Error(`Component ID ${componentId} not found in layer ${layerId}`)
    }
    //console.log('removeObject', layerId, componentId, index, this.layers[layerId].data)
    this.layers[layerId].data.splice(index, 1)
    this.components.remove(componentId)
  }

  findObjectsAtGridPos(layerId: number, col: number, row: number): number[] {
    if (!this.layers[layerId]) throw new Error(`Layer ${layerId} does not exist`)
    if (this.layers[layerId].type !== 'OBJECTLAYER') {
      throw new Error(`Layer ${layerId} is not an OBJECTLAYER`)
    }

    const screenPos = this.projection.mapGridToScreen(col, row)
    const { x, y } = screenPos
    const x1 = x - this.tileWidth / 2
    const y1 = y - this.tileHeight / 2

    // Find all objects in the layer that overlap with the given grid position
    return this.layers[layerId].data.reduce(
      (result: number[], componentId: number, idx: number) => {
        const component = this.components.get(componentId)
        if (!component || !component.properties) return result

        const objX = component.properties.x!
        const objY = component.properties.y!
        // if (component && component.properties) {
        //   const objX = component.properties.x!
        //   const objY = component.properties.y!
        //   console.log('findObjectsAtGridPos', layerId, layerId, col, x, y, objX, objY)
        //   if (
        //     objX >= x1 &&
        //     objX <= x1 + this.tileWidth &&
        //     objY >= y1 &&
        //     objY <= y1 + this.tileHeight
        //   ) {
        //     result.push(componentId)
        //   }
        // }
        if (objX == x && objY == y) {
          result.push(componentId)
        }
        return result
      },
      [],
    )
  }

  // getObject(layerId: number, idx: number): IGameComponent | undefined {
  //   //const componentId = this.objects[layerId][id] || undefined
  //   // const componentId = this.layers[layerId].data[idx] || undefined
  //   // if (!componentId) return undefined
  //   // return this.components.get(componentId)
  //   console.warn('Method getObject is not implemented yet')
  //   return undefined
  // }
  //
  // updateObject(layerId: number, idx: number, component: IGameComponent): void {
  //   // const componentId = this.layers[layerId].data[idx] || undefined
  //   // if (!componentId) throw new Error(`Entity ${idx} does not exist`)
  //   // const entity = this.components.get(componentId)
  //   // if (!entity) throw new Error(`Entity ${idx} does not exist`)
  //   // this.components.set(componentId, component)
  //   console.warn('Method updateObject is not implemented yet')
  // }

  dump(): TileMapDump {
    return {
      config: this.config,
      resources: null,
      layers: this.layers,
      components: this.components.dump(),
    }
  }
}
