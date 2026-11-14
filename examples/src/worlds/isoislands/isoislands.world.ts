import type { ITileMap, TileMapConfig } from '@fmlabs/hieronimo'
import { IsoCubeComponent, TileComponent, TileMap } from '@fmlabs/hieronimo'
import { parseIslandMap, SAND, WATER, type IslandMap } from './isoislands.generator.ts'

export const ISOISLANDS_TILE_SIZE = 64

export const LAYER_GROUND = 0
export const LAYER_BUILDINGS = 1

/**
 * A hand-drawn map, one character per cell (rows top to bottom, columns left to right):
 * '~' water, '.' sand, 'g' grass, 'B' grass with a building on it.
 */
export const CLASSIC_ISLANDS_MAP = parseIslandMap([
  '~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~...~~~~~~~~~~~~~~~~~~',
  '~~..ggg.~~~~~~~~~~~..~~~',
  '~~.ggggg.~~~~~~~~~.gg.~~',
  '~~.ggBgg.~~~~~~~~.gBgg.~',
  '~~..ggg..~~~~~~~~.ggg..~',
  '~~~~...~~~~~~~~~~~.g.~~~',
  '~~~~~~~~~~~~~~~~~~~..~~~',
  '~~~~~~~~~~~...~~~~~~~~~~',
  '~~~~~~~~~..ggg..~~~~~~~~',
  '~~~~~~~~.ggggggg.~~~~~~~',
  '~~~~~~~~.gggBggg.~~~~~~~',
  '~~~~~~~~.ggggggg.~~~~~~~',
  '~~~~~~~~~..ggg..~~~~~~~~',
  '~~~~~~~~~~~...~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~..~~~~~~~~~~~~~~~~~~',
  '~~~.gg.~~~~~~~~~~~...~~~',
  '~~.gBgg.~~~~~~~~~.ggg.~~',
  '~~.ggg.~~~~~~~~~~.gBg.~~',
  '~~~...~~~~~~~~~~~~.g.~~~',
  '~~~~~~~~~~~~~~~~~~~.~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~',
])

const COLORS = {
  deepWater: ['rgb(30,90,160)', 'rgb(34,98,170)'],
  shallowWater: ['rgb(56,140,200)', 'rgb(64,150,208)'],
  sand: ['rgb(230,210,150)', 'rgb(222,202,140)'],
  grass: ['rgb(96,170,72)', 'rgb(88,160,66)'],
}

// alternate between two shades in an irregular pattern, so the surfaces don't look flat
const shade = (col: number, row: number) => ((col * 7 + row * 13 + col * row) % 5 < 2 ? 1 : 0)

const tileColor = (map: IslandMap, col: number, row: number): string => {
  const char = map.cells[row][col]
  const variant = shade(col, row)
  if (char === SAND) return COLORS.sand[variant]
  if (char !== WATER) return COLORS.grass[variant]

  // water next to land is shallow
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const neighbor = map.cells[row + dr]?.[col + dc]
      if (neighbor !== undefined && neighbor !== WATER) return COLORS.shallowWater[variant]
    }
  }
  return COLORS.deepWater[variant]
}

const isoIslandsWorldBuilder = async (map: IslandMap): Promise<ITileMap> => {
  const worldConfig: TileMapConfig = {
    columns: map.columns,
    rows: map.rows,
    tileSize: ISOISLANDS_TILE_SIZE,
    projection: 'isometric',
  }
  const worldMap = new TileMap(worldConfig)

  worldMap.addLayer(LAYER_GROUND, { name: 'Ground', type: 'TILE', data: [] })
  // buildings stand up from the ground, so they are drawn back to front
  worldMap.addLayer(LAYER_BUILDINGS, { name: 'Buildings', type: 'TILE', data: [], depthSort: true })

  for (let row = 0; row < map.rows; row++) {
    for (let col = 0; col < map.columns; col++) {
      worldMap.addTile(
        LAYER_GROUND,
        col,
        row,
        new TileComponent({
          width: worldMap.tileWidth,
          height: worldMap.tileHeight,
          backgroundColor: tileColor(map, col, row),
        }),
      )
    }
  }

  for (const building of map.buildings) {
    worldMap.addTile(
      LAYER_BUILDINGS,
      building.col,
      building.row,
      new IsoCubeComponent({
        tileSize: worldMap.tileWidth,
        width: worldMap.tileWidth / 2,
        depth: building.height,
      }),
    )
  }

  return worldMap
}

export default isoIslandsWorldBuilder
