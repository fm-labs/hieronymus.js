import type { ITileMap, TileMapConfig } from '../../../lib/game.types'
import { TileMap } from '../../../lib'
import { roadDirections } from '../isocity/isocity.traffic.ts'
import { IsoVegasGroundComponent } from './IsoVegasGroundComponent.ts'
import { IsoVegasLandmarkComponent } from './IsoVegasLandmarkComponent.ts'
import { IsoVegasPropComponent } from './IsoVegasPropComponent.ts'
import { IsoVegasSelectionComponent } from './IsoVegasSelectionComponent.ts'
import {
  groundOf,
  nightAmount,
  parseVegasMap,
  vegasRoadMap,
  type VegasMap,
  type VegasScene,
} from './isovegas.map.ts'

export const ISOVEGAS_TILE_SIZE = 64

export const LAYER_GROUND = 0
export const LAYER_STRUCTURES = 1
export const LAYER_VEHICLES = 2
export const LAYER_SELECTION = 3

export type VegasWorld = {
  tileMap: ITileMap
  map: VegasMap
  /** Shared by all components, the system updates it every frame */
  scene: VegasScene
  selection: IsoVegasSelectionComponent
}

const isoVegasWorldBuilder = async (
  map: VegasMap = parseVegasMap(),
  /** Time of day at the start, 0..24. Sunset by default. */
  hours = 18.5,
): Promise<VegasWorld> => {
  const worldConfig: TileMapConfig = {
    columns: map.columns,
    rows: map.rows,
    tileSize: ISOVEGAS_TILE_SIZE,
    projection: 'isometric',
  }
  const tileMap = new TileMap(worldConfig)
  const tileSize = tileMap.tileWidth
  const isRoad = vegasRoadMap(map.cells)
  const scene: VegasScene = { time: 0, hours, night: nightAmount(hours) }

  tileMap.addLayer(LAYER_GROUND, { name: 'Ground', type: 'TILE', data: [] })
  // landmarks, props and vehicles stand up from the ground, so they are depth-sorted together
  tileMap.addLayer(LAYER_STRUCTURES, {
    name: 'Structures',
    type: 'TILE',
    data: [],
    depthSort: true,
  })
  tileMap.addLayer(LAYER_VEHICLES, { name: 'Vehicles', type: 'OBJECT', data: [], depthSort: true })
  // drawn last, on top of everything
  tileMap.addLayer(LAYER_SELECTION, { name: 'Selection', type: 'OBJECT', data: [] })

  for (let row = 0; row < map.rows; row++) {
    for (let col = 0; col < map.columns; col++) {
      tileMap.addTile(
        LAYER_GROUND,
        col,
        row,
        new IsoVegasGroundComponent({
          tileSize,
          ground: groundOf(map.cells, col, row),
          col,
          row,
          connections: isRoad(col, row) ? roadDirections(isRoad, col, row) : [],
          scene,
        }),
      )
    }
  }

  // a landmark is placed on the front cell of its footprint, so it is drawn after everything behind it
  for (const landmark of map.landmarks) {
    tileMap.addTile(
      LAYER_STRUCTURES,
      landmark.col + landmark.cols - 1,
      landmark.row + landmark.rows - 1,
      new IsoVegasLandmarkComponent({
        tileSize,
        kind: landmark.kind,
        cols: landmark.cols,
        rows: landmark.rows,
        scene,
      }),
    )
  }
  for (const prop of map.props) {
    tileMap.addTile(
      LAYER_STRUCTURES,
      prop.col,
      prop.row,
      new IsoVegasPropComponent({ tileSize, kind: prop.kind, col: prop.col, row: prop.row, scene }),
    )
  }

  const selection = new IsoVegasSelectionComponent({ tileSize })
  tileMap.addObjectAtGridPos(LAYER_SELECTION, 0, 0, selection)

  return { tileMap, map, scene, selection }
}

export default isoVegasWorldBuilder
