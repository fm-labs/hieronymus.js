/**
 * Island map generation for the 'isoislands' world.
 * Pure functions without engine dependencies, so they can be unit tested.
 */

export const WATER = '~'
export const SAND = '.'
export const GRASS = 'g'
export const BUILDING = 'B'

export const MIN_GRID_SIZE = 12
export const MAX_GRID_SIZE = 128

/** Cells along the map edge that always stay water */
const EDGE_MARGIN = 2
/** The outline of an island deviates at most this much from its radius (as a factor) */
const MAX_WOBBLE = 0.25
const MIN_ISLAND_RADIUS = 2
const MAX_ISLAND_RADIUS = 8
const PLACEMENT_ATTEMPTS = 100

export type Island = { col: number; row: number; radius: number }
export type Building = { col: number; row: number; height: number }

export type IslandMap = {
  columns: number
  rows: number
  seed: number
  /** One string per row, one character per cell: WATER, SAND, GRASS or BUILDING (on grass) */
  cells: string[]
  islands: Island[]
  buildings: Building[]
}

export type IslandMapOptions = {
  columns?: number
  rows?: number
  /** The same seed always creates the same map. A random seed is used when omitted. */
  seed?: number
  /** How many islands to try to place. Defaults to one per ~100 cells. Fewer fit on crowded maps. */
  islandCount?: number
}

/** A seeded pseudo random number generator (mulberry32), returns numbers in [0, 1) */
export function createRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 4294967296)
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const randomInt = (random: () => number, min: number, max: number) =>
  min + Math.floor(random() * (max - min + 1))

/** The furthest an island's land can reach from its center */
const reach = (radius: number) => Math.ceil(radius * (1 + MAX_WOBBLE) + 0.5)

export function generateIslandMap(options: IslandMapOptions = {}): IslandMap {
  const columns = clamp(Math.floor(options.columns ?? 24), MIN_GRID_SIZE, MAX_GRID_SIZE)
  const rows = clamp(Math.floor(options.rows ?? 24), MIN_GRID_SIZE, MAX_GRID_SIZE)
  const seed = (options.seed ?? randomSeed()) >>> 0
  const islandCount = Math.max(1, Math.floor(options.islandCount ?? (columns * rows) / 100))
  const random = createRandom(seed)

  const grid: string[][] = Array.from({ length: rows }, () => Array(columns).fill(WATER))
  const islands: Island[] = []
  const buildings: Building[] = []
  const maxRadius = clamp(
    Math.floor(Math.min(columns, rows) / 6),
    MIN_ISLAND_RADIUS,
    MAX_ISLAND_RADIUS,
  )

  for (let i = 0; i < islandCount; i++) {
    const island = placeIsland(random, columns, rows, maxRadius, islands)
    if (!island) continue
    islands.push(island)
    drawIsland(random, grid, island)

    // the center is always grass, so every island gets its building there
    grid[island.row][island.col] = BUILDING
    buildings.push({ col: island.col, row: island.row, height: randomInt(random, 2, 6) * 8 })
  }

  return { columns, rows, seed, cells: grid.map((row) => row.join('')), islands, buildings }
}

/** Find a spot for a new island, away from the map edge and from the other islands */
function placeIsland(
  random: () => number,
  columns: number,
  rows: number,
  maxRadius: number,
  islands: Island[],
): Island | undefined {
  for (let attempt = 0; attempt < PLACEMENT_ATTEMPTS; attempt++) {
    // islands get smaller with every failed attempt, so crowded maps still fill up
    const upper = Math.max(
      MIN_ISLAND_RADIUS,
      maxRadius - Math.floor(((maxRadius - MIN_ISLAND_RADIUS + 1) * attempt) / PLACEMENT_ATTEMPTS),
    )
    const radius = randomInt(random, Math.max(MIN_ISLAND_RADIUS, Math.ceil(upper / 2)), upper)
    const min = EDGE_MARGIN + reach(radius)
    const maxCol = columns - 1 - min
    const maxRow = rows - 1 - min
    if (maxCol < min || maxRow < min) continue

    const col = randomInt(random, min, maxCol)
    const row = randomInt(random, min, maxRow)
    // keep at least one water cell between the islands
    const fits = islands.every(
      (other) =>
        Math.hypot(other.col - col, other.row - row) > reach(radius) + reach(other.radius) + 1,
    )
    if (fits) return { col, row, radius }
  }
  return undefined
}

/** A blob with a wobbly outline: grass inside, a ring of sand along the coast */
function drawIsland(random: () => number, grid: string[][], island: Island) {
  // a few sine waves around the island make up the outline, their amplitudes sum up to MAX_WOBBLE
  const waves = [
    { frequency: 2, amplitude: 0.12, phase: random() * Math.PI * 2 },
    { frequency: 3, amplitude: 0.08, phase: random() * Math.PI * 2 },
    { frequency: 5, amplitude: 0.05, phase: random() * Math.PI * 2 },
  ]
  const outline = (angle: number) =>
    island.radius *
    (1 + waves.reduce((sum, w) => sum + w.amplitude * Math.sin(w.frequency * angle + w.phase), 0))

  const r = reach(island.radius)
  for (let dr = -r; dr <= r; dr++) {
    for (let dc = -r; dc <= r; dc++) {
      const distance = Math.hypot(dc, dr)
      const edge = outline(Math.atan2(dr, dc))
      // half a cell of slack rounds off the outline, so it has no single-cell spikes
      if (distance > edge + 0.5) continue
      grid[island.row + dr][island.col + dc] = distance <= edge - 1 ? GRASS : SAND
    }
  }
}

/** Build an IslandMap from a hand-drawn character map */
export function parseIslandMap(cells: string[], buildingHeight = 32): IslandMap {
  const buildings: Building[] = []
  cells.forEach((line, row) => {
    ;[...line].forEach((char, col) => {
      if (char === BUILDING) buildings.push({ col, row, height: buildingHeight })
    })
  })
  return {
    columns: cells[0]?.length ?? 0,
    rows: cells.length,
    seed: 0,
    cells,
    islands: [],
    buildings,
  }
}
