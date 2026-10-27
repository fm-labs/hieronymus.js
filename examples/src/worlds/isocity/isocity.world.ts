import type { ITileMap, TileMapConfig } from '@fmlabs/world'
import { TileComponent, TileMap } from '@fmlabs/world'
import { IsoCityBuildingComponent, type BuildingKind } from './IsoCityBuildingComponent.ts'
import { IsoCityRoadComponent } from './IsoCityRoadComponent.ts'
import { roadDirections, type RoadMap } from './isocity.traffic.ts'

export const ISOCITY_TILE_SIZE = 64

export const LAYER_GROUND = 0
export const LAYER_STRUCTURES = 1
export const LAYER_VEHICLES = 2

/**
 * The example city, one character per cell (rows top to bottom, columns left to right):
 * '#' road, '.' grass, ',' plaza, '~' water, 'T' tree,
 * 'H' house, 'S' shop, 'O' office tower, 'F' factory.
 *
 * Districts, from the top left: homes, shopping street, homes / park, downtown, shopping street /
 * homes, industry, industry. The avenue in the middle leaves the city at the top and the bottom.
 */
export const CITY_MAP = [
  '.T...T...T#..T...T...',
  '.###################.',
  'T#H.H.H#SS,SS#H.H.H#T',
  '.#T...T#SS,SS#T...T#.',
  'T#H.H.H#,,T,,#H.H.H#T',
  '.#T...T#SS,SS#T...T#.',
  'T#H.H.H#SS,SS#H.H.H#T',
  '.###################.',
  'T#T.T.T#OO,OO#SS,SS#T',
  '.#.~~~.#OO,OO#SS,SS#.',
  'T#T~~~T#,,T,,#,,T,,#T',
  '.#.~~~.#OO,OO#SS,SS#.',
  'T#T.T.T#OO,OO#SS,SS#T',
  '.###################.',
  'T#H.H.H#FF.FF#FF.FF#T',
  '.#T...T#FF.FF#FF.FF#.',
  'T#H.H.H#.....#.....#T',
  '.#T...T#FF.FF#FF.FF#.',
  'T#H.H.H#FF.FF#FF.FF#T',
  '.###################.',
  '.T...T...T#..T...T...',
]

export const cityRoadMap =
  (map: string[]): RoadMap =>
  (col, row) =>
    map[row]?.[col] === '#'

const BUILDINGS: Record<string, BuildingKind> = {
  H: 'house',
  S: 'shop',
  O: 'office',
  F: 'factory',
  T: 'tree',
}

const GROUND_COLORS: Record<string, string> = {
  grass: '#7cb342',
  plaza: '#d7cfc0',
  water: '#4fa3d9',
  concrete: '#a8a39a',
}

const groundOf = (char: string): keyof typeof GROUND_COLORS => {
  if (char === '~') return 'water'
  if (char === ',' || char === 'S' || char === 'O') return 'plaza'
  if (char === 'F') return 'concrete'
  return 'grass'
}

// the same cell always gets the same look, so the city doesn't change between reloads
const hash = (col: number, row: number, salt: number) =>
  ((col * 73856093) ^ (row * 19349663) ^ (salt * 83492791)) >>> 0
const pick = <T>(items: T[], col: number, row: number, salt: number): T =>
  items[hash(col, row, salt) % items.length]
const between = (min: number, max: number, step: number, col: number, row: number) =>
  min + (hash(col, row, 7) % (Math.floor((max - min) / step) + 1)) * step

const buildingProps = (kind: BuildingKind, col: number, row: number) => {
  switch (kind) {
    case 'house':
      return {
        color: pick(['#f5e6c8', '#e8d5b0', '#f0c9a0', '#dfe7ec', '#f6d7d7'], col, row, 1),
        accentColor: pick(['#b5523b', '#8e5a3c', '#5d6d7e', '#a04040'], col, row, 2),
        height: between(12, 20, 4, col, row),
      }
    case 'shop':
      return {
        color: pick(['#ffe0b2', '#c8e6c9', '#bbdefb', '#f8bbd0', '#fff9c4'], col, row, 1),
        accentColor: pick(['#e53935', '#1e88e5', '#43a047', '#fb8c00'], col, row, 2),
        height: between(16, 24, 4, col, row),
      }
    case 'office':
      return {
        color: pick(['#90a4ae', '#78909c', '#5c7a99', '#4f6d7a', '#8eacbb'], col, row, 1),
        height: between(48, 128, 16, col, row),
      }
    case 'factory':
      return {
        color: pick(['#a1887f', '#9e9e9e', '#bcaaa4'], col, row, 1),
        accentColor: pick(['#795548', '#6d4c41', '#8d6e63'], col, row, 2),
        height: between(18, 26, 4, col, row),
      }
    case 'tree':
      return {
        color: pick(['#43a047', '#388e3c', '#66bb6a', '#2e7d32'], col, row, 1),
        height: between(16, 28, 4, col, row),
      }
  }
}

const isoCityWorldBuilder = async (map: string[] = CITY_MAP): Promise<ITileMap> => {
  const rows = map.length
  const columns = map[0].length
  const isRoad = cityRoadMap(map)

  const worldConfig: TileMapConfig = {
    columns,
    rows,
    tileSize: ISOCITY_TILE_SIZE,
    projection: 'isometric',
  }
  const worldMap = new TileMap(worldConfig)

  worldMap.addLayer(LAYER_GROUND, { name: 'Ground', type: 'TILE', data: [] })
  // buildings and vehicles stand up from the ground, so they are depth-sorted together
  worldMap.addLayer(LAYER_STRUCTURES, {
    name: 'Structures',
    type: 'TILE',
    data: [],
    depthSort: true,
  })
  worldMap.addLayer(LAYER_VEHICLES, { name: 'Vehicles', type: 'OBJECT', data: [], depthSort: true })

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const char = map[row][col]
      if (isRoad(col, row)) {
        worldMap.addTile(
          LAYER_GROUND,
          col,
          row,
          new IsoCityRoadComponent({
            tileSize: worldMap.tileWidth,
            connections: roadDirections(isRoad, col, row),
          }),
        )
        continue
      }

      worldMap.addTile(
        LAYER_GROUND,
        col,
        row,
        new TileComponent({
          width: worldMap.tileWidth,
          height: worldMap.tileHeight,
          backgroundColor: GROUND_COLORS[groundOf(char)],
        }),
      )

      const kind = BUILDINGS[char]
      if (kind) {
        worldMap.addTile(
          LAYER_STRUCTURES,
          col,
          row,
          new IsoCityBuildingComponent({
            tileSize: worldMap.tileWidth,
            kind,
            ...buildingProps(kind, col, row),
          }),
        )
      }
    }
  }

  return worldMap
}

export default isoCityWorldBuilder
