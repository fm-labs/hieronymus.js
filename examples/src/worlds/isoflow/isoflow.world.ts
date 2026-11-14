import type { ITileMap, TileMapConfig } from '@fmlabs/hieronymus'
import { TileMap } from '@fmlabs/hieronymus'
import { IsoFlowEdgesComponent } from './IsoFlowEdgesComponent.ts'
import { IsoFlowFloorComponent } from './IsoFlowFloorComponent.ts'
import { IsoFlowNodeComponent } from './IsoFlowNodeComponent.ts'
import { buildFlowModel } from './isoflow.layout.ts'
import { CARD_Z, FlowProjection, type FlowScene } from './isoflow.draw.ts'
import type { FlowModel, FlowSpec } from './isoflow.types.ts'

export const ISOFLOW_TILE_SIZE = 64

export const LAYER_FLOOR = 0
export const LAYER_EDGES = 1
export const LAYER_NODES = 2

export type FlowWorld = {
  tileMap: ITileMap
  model: FlowModel
  /** Shared by all components, the system updates it every frame */
  scene: FlowScene
}

/** Lays out a workflow and builds its world: the floor, the edges, and a card per node; iso or top-down */
const isoFlowWorldBuilder = (
  spec: FlowSpec,
  projection: FlowProjection = FlowProjection.iso,
): FlowWorld => {
  const model = buildFlowModel(spec)
  const config: TileMapConfig = {
    columns: model.columns,
    rows: model.rows,
    tileSize: ISOFLOW_TILE_SIZE,
    projection: projection.kind === 'iso' ? 'isometric' : 'orthogonal',
  }
  const tileMap = new TileMap(config)
  const scene: FlowScene = {
    time: 0,
    view: { x0: -1e9, y0: -1e9, x1: 1e9, y1: 1e9 },
    shadows: model.nodes.length <= 120,
    projection,
  }

  tileMap.addLayer(LAYER_FLOOR, { name: 'Floor', type: 'TILE', data: [] })
  // the edges run under the cards
  tileMap.addLayer(LAYER_EDGES, { name: 'Edges', type: 'OBJECT', data: [] })
  tileMap.addLayer(LAYER_NODES, { name: 'Nodes', type: 'OBJECT', data: [], depthSort: true })

  // the floor and the edges are one component each, they draw everything in view
  tileMap.addTile(LAYER_FLOOR, 0, 0, new IsoFlowFloorComponent({ model, scene }))
  tileMap.addObjectAtGridPos(LAYER_EDGES, 0, 0, new IsoFlowEdgesComponent({ model, scene }))

  for (const node of model.nodes) {
    const card = new IsoFlowNodeComponent({ node, scene })
    tileMap.addObjectAtGridPos(LAYER_NODES, Math.floor(node.col), Math.floor(node.row), card)
    // depth sorting by the center of the card (adding it moved it to the cell)
    const [x, y] = projection.at(node.col + node.w / 2, node.row + node.h / 2, CARD_Z)
    card.setPosition(x, y)
  }

  return { tileMap, model, scene }
}

export default isoFlowWorldBuilder
