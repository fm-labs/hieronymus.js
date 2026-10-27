import type { ITileMap, TileMapConfig } from '@fmlabs/world'
import { TileMap } from '@fmlabs/world'
import { roadDirections } from '../isocity/isocity.traffic.ts'
import { nightAmount, type VegasScene } from '../isovegas/isovegas.map.ts'
import { IsoVegasSelectionComponent } from '../isovegas/IsoVegasSelectionComponent.ts'
import { GATES, vec } from './isoairport.airside.ts'
import { airportRoadMap, groundOf, parseAirportMap, type AirportMap } from './isoairport.map.ts'
import { IsoAirportBuildingComponent } from './IsoAirportBuildingComponent.ts'
import { IsoAirportGroundComponent } from './IsoAirportGroundComponent.ts'
import { IsoAirportPavementComponent } from './IsoAirportPavementComponent.ts'
import { IsoAirportPropComponent } from './IsoAirportPropComponent.ts'

export const ISOAIRPORT_TILE_SIZE = 64

export const LAYER_GROUND = 0
/** Runways and taxiways: flat, above the ground, below everything standing */
export const LAYER_PAVEMENT = 1
export const LAYER_STRUCTURES = 2
/** Planes on the ground and cars, depth-sorted with the buildings */
export const LAYER_VEHICLES = 3
/** Planes in the air, above all buildings */
export const LAYER_SKY = 4
export const LAYER_SELECTION = 5

/** Shared by all components, the system updates it every frame */
export type AirportScene = VegasScene & {
  /** Which gates have a plane docked, for the jet bridges */
  docked: boolean[]
}

export type AirportWorld = {
  tileMap: ITileMap
  map: AirportMap
  scene: AirportScene
  selection: IsoVegasSelectionComponent
}

const isoAirportWorldBuilder = async (
  map: AirportMap = parseAirportMap(),
  /** Time of day at the start, 0..24 */
  hours = 16,
): Promise<AirportWorld> => {
  const worldConfig: TileMapConfig = {
    columns: map.columns,
    rows: map.rows,
    tileSize: ISOAIRPORT_TILE_SIZE,
    projection: 'isometric',
  }
  const tileMap = new TileMap(worldConfig)
  const tileSize = tileMap.tileWidth
  const isRoad = airportRoadMap(map.cells)
  const scene: AirportScene = {
    time: 0,
    hours,
    night: nightAmount(hours),
    docked: GATES.map(() => false),
  }

  tileMap.addLayer(LAYER_GROUND, { name: 'Ground', type: 'TILE', data: [] })
  tileMap.addLayer(LAYER_PAVEMENT, { name: 'Pavement', type: 'OBJECT', data: [] })
  tileMap.addLayer(LAYER_STRUCTURES, {
    name: 'Structures',
    type: 'TILE',
    data: [],
    depthSort: true,
  })
  tileMap.addLayer(LAYER_VEHICLES, { name: 'Vehicles', type: 'OBJECT', data: [], depthSort: true })
  tileMap.addLayer(LAYER_SKY, { name: 'Sky', type: 'OBJECT', data: [] })
  tileMap.addLayer(LAYER_SELECTION, { name: 'Selection', type: 'OBJECT', data: [] })

  for (let row = 0; row < map.rows; row++) {
    for (let col = 0; col < map.columns; col++) {
      tileMap.addTile(
        LAYER_GROUND,
        col,
        row,
        new IsoAirportGroundComponent({
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

  const floodlights = map.props
    .filter((p) => p.kind === 'floodlight')
    .map((p) => vec(p.col + 0.5, p.row + 0.5))
  tileMap.addObjectAtGridPos(
    LAYER_PAVEMENT,
    0,
    0,
    new IsoAirportPavementComponent({ tileSize, scene, floodlights }),
  )

  // a building (or slice) is placed on the front cell of its footprint, so it is drawn after
  // everything behind it
  for (const building of map.pieces) {
    tileMap.addTile(
      LAYER_STRUCTURES,
      building.pieceCol + building.pieceCols - 1,
      building.pieceRow + building.pieceRows - 1,
      new IsoAirportBuildingComponent({ tileSize, building, scene }),
    )
  }
  for (const prop of map.props) {
    tileMap.addTile(
      LAYER_STRUCTURES,
      prop.col,
      prop.row,
      new IsoAirportPropComponent({
        tileSize,
        kind: prop.kind,
        col: prop.col,
        row: prop.row,
        scene,
      }),
    )
  }

  const selection = new IsoVegasSelectionComponent({ tileSize })
  tileMap.addObjectAtGridPos(LAYER_SELECTION, 0, 0, selection)

  return { tileMap, map, scene, selection }
}

export default isoAirportWorldBuilder
