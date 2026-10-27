import type { ITileMap, TileMapConfig } from '@fmlabs/world'
import { TileMap } from '@fmlabs/world'
import { IsoCasinoFloorComponent } from './IsoCasinoFloorComponent.ts'
import { IsoCasinoObjectComponent } from './IsoCasinoObjectComponent.ts'
import { IsoCasinoSelectionComponent } from './IsoCasinoSelectionComponent.ts'
import {
  OBJECT_TYPES,
  parseFloorPlan,
  roomAt,
  type FloorPlan,
  type FloorObject,
} from './isocasino.floor.ts'

export const ISOCASINO_TILE_SIZE = 64

export const LAYER_FLOOR = 0
export const LAYER_STRUCTURES = 1
export const LAYER_GUESTS = 2
export const LAYER_SELECTION = 3

/** Back walls are full height, all other walls are cut away, so they don't hide the rooms */
const BACK_WALL_HEIGHT = 44
const CUTAWAY_WALL_HEIGHT = 12

const SLOT_COLORS = ['#37474f', '#4a148c', '#0d47a1', '#b71c1c', '#1b5e20']
const VIP_SLOT_COLORS = ['#3e2723', '#212121']

export type CasinoWorld = {
  tileMap: ITileMap
  plan: FloorPlan
  /** The component of every object, by object id */
  components: Map<string, IsoCasinoObjectComponent>
  selection: IsoCasinoSelectionComponent
}

const objectColor = (object: FloorObject): string | undefined => {
  const variant = (object.col * 7 + object.row * 3) >>> 0
  if (object.type.category === 'slot') {
    const colors = object.room === 'VIP Lounge' ? VIP_SLOT_COLORS : SLOT_COLORS
    return colors[variant % colors.length]
  }
  if (object.type.kind === 'sofa') return object.room === 'VIP Lounge' ? '#6a1b9a' : '#8d6e63'
  return undefined
}

const isoCasinoWorldBuilder = async (plan: FloorPlan = parseFloorPlan()): Promise<CasinoWorld> => {
  const worldConfig: TileMapConfig = {
    columns: plan.columns,
    rows: plan.rows,
    tileSize: ISOCASINO_TILE_SIZE,
    projection: 'isometric',
  }
  const tileMap = new TileMap(worldConfig)
  const tileSize = tileMap.tileWidth

  tileMap.addLayer(LAYER_FLOOR, { name: 'Floor', type: 'TILE', data: [] })
  // walls, machines, furniture and guests stand up from the floor, so they are depth-sorted together
  tileMap.addLayer(LAYER_STRUCTURES, {
    name: 'Structures',
    type: 'TILE',
    data: [],
    depthSort: true,
  })
  tileMap.addLayer(LAYER_GUESTS, { name: 'Guests', type: 'OBJECT', data: [], depthSort: true })
  // drawn last, on top of everything
  tileMap.addLayer(LAYER_SELECTION, { name: 'Selection', type: 'OBJECT', data: [] })

  for (let row = 0; row < plan.rows; row++) {
    for (let col = 0; col < plan.columns; col++) {
      const type = OBJECT_TYPES[plan.cells[row][col]]
      if (type?.kind === 'wall') {
        const back = row === 0 || col === 0
        tileMap.addTile(
          LAYER_STRUCTURES,
          col,
          row,
          new IsoCasinoObjectComponent({
            tileSize,
            kind: 'wall',
            height: back ? BACK_WALL_HEIGHT : CUTAWAY_WALL_HEIGHT,
          }),
        )
        continue
      }
      const room = roomAt(col, row)
      tileMap.addTile(
        LAYER_FLOOR,
        col,
        row,
        new IsoCasinoFloorComponent({
          tileSize,
          col,
          row,
          style: room?.floor ?? 'carpet',
          colors: room?.colors ?? ['#7b1f2b', '#c9a227'],
        }),
      )
    }
  }

  const components = new Map<string, IsoCasinoObjectComponent>()
  for (const object of plan.objects) {
    const component = new IsoCasinoObjectComponent({
      tileSize,
      kind: object.type.kind,
      color: objectColor(object),
    })
    tileMap.addTile(LAYER_STRUCTURES, object.col, object.row, component)
    components.set(object.id, component)
  }

  const selection = new IsoCasinoSelectionComponent({ tileSize })
  tileMap.addObjectAtGridPos(LAYER_SELECTION, 0, 0, selection)

  return { tileMap, plan, components, selection }
}

export default isoCasinoWorldBuilder
