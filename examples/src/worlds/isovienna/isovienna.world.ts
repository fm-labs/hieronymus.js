import type { ITileMap, TileMapConfig } from '@fmlabs/hieronymus'
import { TileMap } from '@fmlabs/hieronymus'
import { DIRECTION_VECTORS, DIRECTIONS, roadDirections } from '../isocity/isocity.traffic.ts'
import { IsoVegasSelectionComponent } from '../isovegas/IsoVegasSelectionComponent.ts'
import { IsoViennaGroundComponent } from './IsoViennaGroundComponent.ts'
import { IsoViennaLandmarkComponent } from './IsoViennaLandmarkComponent.ts'
import { IsoViennaPropComponent } from './IsoViennaPropComponent.ts'
import { IsoViennaSnowComponent } from './IsoViennaSnowComponent.ts'
import {
  groundOf,
  nightAmount,
  parseViennaMap,
  viennaRoadMap,
  viennaTramMap,
  type ViennaMap,
  type ViennaScene,
} from './isovienna.map.ts'

export const ISOVIENNA_TILE_SIZE = 64

export const LAYER_GROUND = 0
export const LAYER_STRUCTURES = 1
export const LAYER_VEHICLES = 2
export const LAYER_OVERLAY = 3

export type ViennaWorld = {
  tileMap: ITileMap
  map: ViennaMap
  /** Shared by all components, the system updates it every frame */
  scene: ViennaScene
  selection: IsoVegasSelectionComponent
}

export type ViennaWorldOptions = {
  /** Time of day at the start, 0..24. Late afternoon by default. */
  hours?: number
  winter?: boolean
}

const isoViennaWorldBuilder = async (
  map: ViennaMap = parseViennaMap(),
  options: ViennaWorldOptions = {},
): Promise<ViennaWorld> => {
  const worldConfig: TileMapConfig = {
    columns: map.columns,
    rows: map.rows,
    tileSize: ISOVIENNA_TILE_SIZE,
    projection: 'isometric',
  }
  const tileMap = new TileMap(worldConfig)
  const tileSize = tileMap.tileWidth
  const isRoad = viennaRoadMap(map.cells)
  const isTrack = viennaTramMap(map.cells)
  const hours = options.hours ?? 17
  const scene: ViennaScene = { time: 0, hours, night: nightAmount(hours), winter: !!options.winter }
  const isWater = (col: number, row: number) => ['~', '%'].includes(map.cells[row]?.[col] ?? '~')

  tileMap.addLayer(LAYER_GROUND, { name: 'Ground', type: 'TILE', data: [] })
  // landmarks, props and vehicles stand up from the ground, so they are depth-sorted together
  tileMap.addLayer(LAYER_STRUCTURES, {
    name: 'Structures',
    type: 'TILE',
    data: [],
    depthSort: true,
  })
  tileMap.addLayer(LAYER_VEHICLES, { name: 'Vehicles', type: 'OBJECT', data: [], depthSort: true })
  // drawn last, on top of everything: the selection and the snow
  tileMap.addLayer(LAYER_OVERLAY, { name: 'Overlay', type: 'OBJECT', data: [] })

  for (let row = 0; row < map.rows; row++) {
    for (let col = 0; col < map.columns; col++) {
      tileMap.addTile(
        LAYER_GROUND,
        col,
        row,
        new IsoViennaGroundComponent({
          tileSize,
          ground: groundOf(map.cells, col, row),
          col,
          row,
          connections: isRoad(col, row) ? roadDirections(isRoad, col, row) : [],
          tracks: isTrack(col, row) ? roadDirections(isTrack, col, row) : [],
          banks: isWater(col, row)
            ? DIRECTIONS.filter((d) => {
                const v = DIRECTION_VECTORS[d]
                const char = map.cells[row + v.row]?.[col + v.col]
                return char !== undefined && !isWater(col + v.col, row + v.row)
              })
            : [],
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
      new IsoViennaLandmarkComponent({
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
      new IsoViennaPropComponent({
        tileSize,
        kind: prop.kind,
        col: prop.col,
        row: prop.row,
        scene,
      }),
    )
  }

  const selection = new IsoVegasSelectionComponent({ tileSize })
  tileMap.addObjectAtGridPos(LAYER_OVERLAY, 0, 0, selection)

  // the snow covers the whole map, with room for the towers
  const projection = tileMap.projection
  const left = projection.mapGridToScreen(0, map.rows).x
  const right = projection.mapGridToScreen(map.columns, 0).x
  const top = projection.mapGridToScreen(0, 0).y - 260
  const bottom = projection.mapGridToScreen(map.columns, map.rows).y
  const snow = new IsoViennaSnowComponent({
    left,
    top,
    width: right - left,
    height: bottom - top,
    flakes: 700,
    scene,
  })
  tileMap.addObjectAtGridPos(LAYER_OVERLAY, 0, 0, snow)

  return { tileMap, map, scene, selection }
}

export default isoViennaWorldBuilder
