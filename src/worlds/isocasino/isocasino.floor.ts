/**
 * The floor plan and the gaming rules of the 'isocasino' world.
 * Pure functions without engine dependencies, so they can be unit tested.
 */

/**
 * One character per cell (rows top to bottom, columns left to right).
 * Row 0 and column 0 are the back walls, the entrance is at the bottom right.
 *
 * Walls and floor:  '#' wall, '.' floor (guests walk here)
 * Gaming:           's' slot machine, 'S' progressive jackpot slot, 'b' blackjack, 'r' roulette,
 *                   'c' craps, 'k' baccarat, 'p' poker table, 'w' money wheel
 * Inventory:        'P' pit podium, 'C' cashier cage, 'B' bar counter, 'o' bar stool, 'f' sofa,
 *                   'T' lounge table, 'l' plant, 'A' ATM, 'i' desk, 'X' pillar
 */
export const FLOOR_PLAN = [
  '##############################',
  '#l.sssss.S.sssss.l#l...w....l#',
  '#.................#..........#',
  '#..sssss...sssss..#.b..b..b..#',
  '#..sssss.X.sssss..#..........#',
  '#...................r..PP..r.#',
  '#..sssss.S.sssss.............#',
  '#..sssss...sssss....c..k..b..#',
  '#.................#..........#',
  '#..sssss.X.sssss..#.b..b..r..#',
  '#..sssss...sssss..#..........#',
  '#.................#..........#',
  '#l...............l#l........l#',
  '####..#######..########..#####',
  '#........#.........#l.......l#',
  '#.SS..SS.#.p..p..p...f.f...oB#',
  '#........#...........T.T...oB#',
  '#l......l#.........#.f.f...oB#',
  '#.b....b.#.p..p..p.####...####',
  '#........#.........#CCC.....l#',
  '#.f.T.f..#.........#........A#',
  '#........#l..iii..l#.i.X.X...#',
  '#lSS..SSl#l.......l#l.......l#',
  '#######################...####',
]

export type ObjectCategory = 'slot' | 'table' | 'inventory' | 'wall'

export type ObjectKind =
  | 'wall'
  | 'slot'
  | 'progressive'
  | 'blackjack'
  | 'roulette'
  | 'craps'
  | 'baccarat'
  | 'poker'
  | 'wheel'
  | 'podium'
  | 'cashier'
  | 'bar'
  | 'stool'
  | 'sofa'
  | 'loungeTable'
  | 'plant'
  | 'atm'
  | 'desk'
  | 'pillar'

export type ObjectType = {
  kind: ObjectKind
  category: ObjectCategory
  label: string
  /** Prefix of the asset id, e.g. 'SL' for SL-001 */
  code?: string
  /** Bet per round of a gaming machine or table, in dollars */
  bet?: number
  /** The share of the bets the house keeps on average (0..1) */
  houseEdge?: number
}

export const OBJECT_TYPES: Record<string, ObjectType> = {
  '#': { kind: 'wall', category: 'wall', label: 'Wall' },
  s: { kind: 'slot', category: 'slot', label: 'Slot machine', code: 'SL', bet: 2, houseEdge: 0.08 },
  S: {
    kind: 'progressive',
    category: 'slot',
    label: 'Progressive jackpot slot',
    code: 'PJ',
    bet: 5,
    houseEdge: 0.1,
  },
  b: {
    kind: 'blackjack',
    category: 'table',
    label: 'Blackjack',
    code: 'BJ',
    bet: 25,
    houseEdge: 0.01,
  },
  r: {
    kind: 'roulette',
    category: 'table',
    label: 'Roulette',
    code: 'RO',
    bet: 20,
    houseEdge: 0.027,
  },
  c: { kind: 'craps', category: 'table', label: 'Craps', code: 'CR', bet: 15, houseEdge: 0.014 },
  k: {
    kind: 'baccarat',
    category: 'table',
    label: 'Baccarat',
    code: 'BA',
    bet: 50,
    houseEdge: 0.012,
  },
  p: {
    kind: 'poker',
    category: 'table',
    label: 'Poker table',
    code: 'PK',
    bet: 10,
    houseEdge: 0.05,
  },
  w: {
    kind: 'wheel',
    category: 'table',
    label: 'Money wheel',
    code: 'MW',
    bet: 5,
    houseEdge: 0.11,
  },
  P: { kind: 'podium', category: 'inventory', label: 'Pit podium', code: 'PD' },
  C: { kind: 'cashier', category: 'inventory', label: 'Cashier cage', code: 'CA' },
  B: { kind: 'bar', category: 'inventory', label: 'Bar counter', code: 'BR' },
  o: { kind: 'stool', category: 'inventory', label: 'Bar stool', code: 'ST' },
  f: { kind: 'sofa', category: 'inventory', label: 'Sofa', code: 'SO' },
  T: { kind: 'loungeTable', category: 'inventory', label: 'Lounge table', code: 'LT' },
  l: { kind: 'plant', category: 'inventory', label: 'Plant', code: 'PL' },
  A: { kind: 'atm', category: 'inventory', label: 'ATM', code: 'AT' },
  i: { kind: 'desk', category: 'inventory', label: 'Desk', code: 'DK' },
  X: { kind: 'pillar', category: 'inventory', label: 'Pillar', code: 'PI' },
}

export type FloorStyle = 'carpet' | 'felt' | 'marble' | 'wood'

export type Room = {
  name: string
  /** Inclusive cell ranges */
  cols: [number, number]
  rows: [number, number]
  floor: FloorStyle
  colors: [string, string]
}

/** The first room that contains a cell wins. Doorways belong to the room they are listed in. */
export const ROOMS: Room[] = [
  {
    name: 'Slots Hall',
    cols: [1, 18],
    rows: [1, 12],
    floor: 'carpet',
    colors: ['#7b1f2b', '#c9a227'],
  },
  {
    name: 'Table Games',
    cols: [19, 28],
    rows: [1, 12],
    floor: 'felt',
    colors: ['#1f5f4a', '#2a7a5f'],
  },
  {
    name: 'VIP Lounge',
    cols: [1, 8],
    rows: [13, 22],
    floor: 'carpet',
    colors: ['#4a2a6a', '#d4af37'],
  },
  {
    name: 'Poker Room',
    cols: [10, 18],
    rows: [13, 22],
    floor: 'carpet',
    colors: ['#1f3a5f', '#4f7cac'],
  },
  {
    name: 'Bar & Lounge',
    cols: [19, 28],
    rows: [13, 17],
    floor: 'wood',
    colors: ['#6d4c41', '#5d4037'],
  },
  {
    name: 'Lobby',
    cols: [20, 28],
    rows: [18, 23],
    floor: 'marble',
    colors: ['#ece6da', '#d8cfbf'],
  },
]

export type FloorObject = {
  /** Asset id, e.g. 'SL-001' */
  id: string
  col: number
  row: number
  char: string
  type: ObjectType
  room: string
}

export type MachineStats = {
  /** Rounds played */
  rounds: number
  /** Total bets */
  coinIn: number
  /** Total payouts */
  coinOut: number
}

export type FloorPlan = {
  columns: number
  rows: number
  cells: string[]
  /** All objects except walls */
  objects: FloorObject[]
}

export function roomAt(col: number, row: number, rooms: Room[] = ROOMS): Room | undefined {
  return rooms.find(
    (room) =>
      col >= room.cols[0] && col <= room.cols[1] && row >= room.rows[0] && row <= room.rows[1],
  )
}

export function parseFloorPlan(cells: string[] = FLOOR_PLAN, rooms: Room[] = ROOMS): FloorPlan {
  const counters: Record<string, number> = {}
  const objects: FloorObject[] = []
  cells.forEach((line, row) => {
    ;[...line].forEach((char, col) => {
      const type = OBJECT_TYPES[char]
      if (!type || type.kind === 'wall') return
      const code = type.code ?? 'OB'
      counters[code] = (counters[code] ?? 0) + 1
      objects.push({
        id: `${code}-${String(counters[code]).padStart(3, '0')}`,
        col,
        row,
        char,
        type,
        room: roomAt(col, row, rooms)?.name ?? 'Casino',
      })
    })
  })
  return { columns: cells[0]?.length ?? 0, rows: cells.length, cells, objects }
}

/** Guests walk on the floor cells. Cells outside the plan are not walkable. */
export const walkableMap =
  (cells: string[]) =>
  (col: number, row: number): boolean =>
    cells[row]?.[col] === '.'

export const isGaming = (object: FloorObject) =>
  object.type.category === 'slot' || object.type.category === 'table'

/**
 * Play one round on a machine or table: the guest bets, and wins back a random payout.
 * Payouts average out to (1 - houseEdge) of the bet. Mutates and returns the stats.
 */
export function playRound(
  stats: MachineStats,
  type: ObjectType,
  random: () => number,
): MachineStats {
  const bet = type.bet ?? 0
  const edge = type.houseEdge ?? 0
  stats.rounds += 1
  stats.coinIn += bet
  // most rounds lose, some win: a win pays 2x, with the win chance chosen so the average return is right
  const winChance = (1 - edge) / 2
  if (random() < winChance) stats.coinOut += bet * 2
  return stats
}

/** The share of the coin in the house kept, or 0 before the first round */
export const holdPercent = (stats: MachineStats) =>
  stats.coinIn === 0 ? 0 : ((stats.coinIn - stats.coinOut) / stats.coinIn) * 100
