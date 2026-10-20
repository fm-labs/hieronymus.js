import type { ITileMap, TileMapConfig } from '../../../lib/game.types'
import { TileMap } from '../../../lib'
import { IsoVegasSelectionComponent } from '../isovegas/IsoVegasSelectionComponent.ts'
import { IsoAwsGroundComponent } from './IsoAwsGroundComponent.ts'
import { IsoAwsLinksComponent } from './IsoAwsLinksComponent.ts'
import { IsoAwsResourceComponent } from './IsoAwsResourceComponent.ts'
import type { AwsScene } from './isoaws.draw.ts'
import { buildNetworkModel, type InventoryItem, type NetworkModel } from './isoaws.inventory.ts'
import { layoutCity, type CityLayout } from './isoaws.layout.ts'

export const ISOAWS_TILE_SIZE = 64

export const LAYER_GROUND = 0
export const LAYER_STRUCTURES = 1
export const LAYER_PACKETS = 2
export const LAYER_OVERLAY = 3

export type AwsWorld = {
  tileMap: ITileMap
  model: NetworkModel
  layout: CityLayout
  /** Shared by all components, the system updates it every frame */
  scene: AwsScene
  selection: IsoVegasSelectionComponent
}

const isoAwsWorldBuilder = async (items: InventoryItem[], night = 1): Promise<AwsWorld> => {
  const model = buildNetworkModel(items)
  const layout = layoutCity(model)

  const worldConfig: TileMapConfig = {
    columns: layout.columns,
    rows: layout.rows,
    tileSize: ISOAWS_TILE_SIZE,
    projection: 'isometric',
  }
  const tileMap = new TileMap(worldConfig)
  const tileSize = tileMap.tileWidth
  const scene: AwsScene = {
    time: 0,
    night,
    view: { x0: -1e9, y0: -1e9, x1: 1e9, y1: 1e9 },
    related: new Set(),
  }

  tileMap.addLayer(LAYER_GROUND, { name: 'Ground', type: 'TILE', data: [] })
  // buildings and packets stand up from the ground, so they are depth-sorted together
  tileMap.addLayer(LAYER_STRUCTURES, {
    name: 'Structures',
    type: 'TILE',
    data: [],
    depthSort: true,
  })
  tileMap.addLayer(LAYER_PACKETS, { name: 'Packets', type: 'OBJECT', data: [], depthSort: true })
  // links and the selection are drawn last, above everything
  tileMap.addLayer(LAYER_OVERLAY, { name: 'Overlay', type: 'OBJECT', data: [] })

  // the ground is one component on cell (0, 0) that draws the whole city floor
  tileMap.addTile(LAYER_GROUND, 0, 0, new IsoAwsGroundComponent({ tileSize, layout, scene }))

  // every resource is a building on its own cell, so the depth sorting just works
  for (const { resource, col, row } of layout.placements) {
    tileMap.addTile(
      LAYER_STRUCTURES,
      col,
      row,
      new IsoAwsResourceComponent({ tileSize, resource, col, row, scene }),
    )
  }

  tileMap.addObjectAtGridPos(
    LAYER_OVERLAY,
    0,
    0,
    new IsoAwsLinksComponent({ tileSize, layout, scene }),
  )
  const selection = new IsoVegasSelectionComponent({ tileSize })
  tileMap.addObjectAtGridPos(LAYER_OVERLAY, 0, 0, selection)

  return { tileMap, model, layout, scene, selection }
}

export default isoAwsWorldBuilder
