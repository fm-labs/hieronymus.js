import type { ITileMap, TileMapConfig } from '../../../lib/game.types'
import { TileMap } from '../../../lib'
import { IsoSoccerGoalComponent } from './IsoSoccerGoalComponent.ts'
import { IsoSoccerGroundComponent } from './IsoSoccerGroundComponent.ts'
import { IsoSoccerMarkingsComponent } from './IsoSoccerMarkingsComponent.ts'
import { IsoSoccerStructureComponent, type StructureKind } from './IsoSoccerStructureComponent.ts'
import type { SoccerScene } from './isosoccer.draw.ts'
import { GOAL_Y0, GOAL_Y1, PITCH_LENGTH, PITCH_WIDTH } from './isosoccer.match.ts'
import { cellKind, MAP_COLUMNS, MAP_ROWS, MARGIN, standTier } from './isosoccer.stadium.ts'

export const ISOSOCCER_TILE_SIZE = 64

export const LAYER_GROUND = 0
/** OBJECT, not sorted: the pitch lines, on the grass and below everything else */
export const LAYER_MARKINGS = 1
export const LAYER_STRUCTURES = 2
export const LAYER_MOVERS = 3

export type SoccerWorld = {
  tileMap: ITileMap
  scene: SoccerScene
}

/** Which way the pitch is from a cell outside it */
const facingOf = (col: number, row: number) => {
  const x = col - MARGIN
  const y = row - MARGIN
  const dx = x < 0 ? -x : x - PITCH_LENGTH + 1
  const dy = y < 0 ? -y : y - PITCH_WIDTH + 1
  if (dy >= dx) return { facing: 'row' as const, towards: (y < 0 ? 1 : -1) as 1 | -1 }
  return { facing: 'col' as const, towards: (x < 0 ? 1 : -1) as 1 | -1 }
}

const isoSoccerWorldBuilder = async (): Promise<SoccerWorld> => {
  const config: TileMapConfig = {
    columns: MAP_COLUMNS,
    rows: MAP_ROWS,
    tileSize: ISOSOCCER_TILE_SIZE,
    projection: 'isometric',
  }
  const tileMap = new TileMap(config)
  const scene: SoccerScene = { time: 0, cheer: 0 }
  const tileSize = tileMap.tileWidth

  tileMap.addLayer(LAYER_GROUND, { name: 'Ground', type: 'TILE', data: [] })
  tileMap.addLayer(LAYER_MARKINGS, { name: 'Markings', type: 'OBJECT', data: [] })
  // goals, stands and players stand up from the ground, so they are depth-sorted together
  tileMap.addLayer(LAYER_STRUCTURES, {
    name: 'Structures',
    type: 'TILE',
    data: [],
    depthSort: true,
  })
  tileMap.addLayer(LAYER_MOVERS, { name: 'Players', type: 'OBJECT', data: [], depthSort: true })

  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLUMNS; col++) {
      const kind = cellKind(col, row)
      tileMap.addTile(
        LAYER_GROUND,
        col,
        row,
        new IsoSoccerGroundComponent({ tileSize, kind, col, row, x: col - MARGIN }),
      )

      if (kind === 'goal') {
        tileMap.addTile(
          LAYER_STRUCTURES,
          col,
          row,
          new IsoSoccerGoalComponent({
            tileSize,
            end: col < MARGIN ? 0 : 1,
            segment: row - MARGIN - GOAL_Y0,
            segments: GOAL_Y1 - GOAL_Y0,
          }),
        )
        continue
      }

      let structure: StructureKind | null = null
      if (kind === 'boards' || kind === 'dugout' || kind === 'floodlight') structure = kind
      // where the two stands meet
      if (kind === 'stand') structure = col < 2 && row < 2 ? 'corner' : 'stand'
      if (!structure) continue
      tileMap.addTile(
        LAYER_STRUCTURES,
        col,
        row,
        new IsoSoccerStructureComponent({
          tileSize,
          kind: structure,
          col,
          row,
          ...facingOf(col, row),
          tier: standTier(col, row),
          scene,
        }),
      )
    }
  }

  tileMap.addObjectAtGridPos(
    LAYER_MARKINGS,
    0,
    0,
    new IsoSoccerMarkingsComponent({ tileSize, originCol: MARGIN, originRow: MARGIN }),
  )

  return { tileMap, scene }
}

export default isoSoccerWorldBuilder
