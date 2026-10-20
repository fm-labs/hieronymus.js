/**
 * The map of the 'isoairport' world: ground, buildings and props.
 * Pure functions without engine dependencies, so they can be unit tested.
 *
 * The runways and taxiways are not in the map: they run diagonally across the grid,
 * see `isoairport.airside.ts`.
 */
import type { RoadMap } from '../isocity/isocity.traffic.ts'

/**
 * Iso International, one character per cell (rows top to bottom).
 * The landside (roads, parking, hotel) is at the back, the two runways form a V towards the front,
 * the terminal with its two piers sits in the middle.
 *
 * Ground:     '.' grass, '#' road, '_' plaza, ',' parking lot, '=' apron, '~' water
 * Props:      't' tree, 'l' apron floodlight, 'f' fuel tank, 'r' radar, 'w' windsock,
 *             'j' parked jet, 'c' parked light aircraft
 * Buildings:  each uppercase letter fills a rectangle (see BUILDINGS)
 */
export const AIRPORT_MAP = [
  '.....#....t......t......................',
  '.....#.......t.................________.',
  '..#####################........_f_f_f__.',
  '..#t____t#____,,,,____#........________.',
  '..#_XXXX_#GGGG,,,,HHHH#........__f_f_f_.',
  '###_XXXX_#GGGG,,,,HHHH#........________.',
  '..#_XXXX_#GGGG,,,,HHHH#.................',
  '..#_XXXX_#GGGG,,,,HHHH#...............t.',
  '..#t____t#____,,,,____#........t........',
  '..#####################.........CCCC===.',
  't.#_RRRR_#TTTTT.t...t...........CCCC===.',
  '..#_RRRR_#TTTTT...t...t.........CCCC=j=.',
  '..#_RRRR_#TTTTT.........t.......CCCC===.',
  '.t#_RRRR_#TTTTTPPPPPPPPPPPP.......UUUU==',
  '..#,,,,,,#TTTTTPPPPPPPPPPPP.......UUUU==',
  '..#,,,,,,#...QQ=============......UUUU==',
  '..#,,,,,,#t..QQ=============......UUUU==',
  't.#,,,,,,#...QQ=============............',
  '..#_SSSS_#.t.QQ=============............',
  '..#_SSSS_#...QQ======l==l==l............',
  '..#_SSSS_#t..QQ=====....t...........t...',
  '..#_SSSS_#...QQ====l.~~~..FFF...........',
  '..########.t.QQ=====.~~~..FFF.........t.',
  '.............QQ=====.~~~................',
  '............tQQ====lt...KK...t.....t....',
  '.............QQ=====....KK..............',
  '.............QQ=====.DD....t..........t.',
  '...............====l.DD...t.............',
  '.....................DD.....r...........',
  '........................t............t..',
  '...........................WWWW.........',
  '.......t................................',
  '.........MMMM...................w.......',
  '.........MMMM...........................',
  '....t....MMMMNNNN.......................',
  '.........MMMMNNNN.......t...............',
  '.........====NNNN...t...................',
  '.t.......==j=NNNN............t..........',
  '......t..========.....t...t.............',
  '.............=c=c.......................',
]

export type BuildingKind =
  | 'terminal'
  | 'pierA'
  | 'pierB'
  | 'tower'
  | 'firestation'
  | 'concorde'
  | 'themebuilding'
  | 'garage'
  | 'hotel'
  | 'rental'
  | 'station'
  | 'hangar'
  | 'cargo'
  | 'cargohangar'
  | 'sign'

export type PropKind = 'tree' | 'floodlight' | 'fueltank' | 'radar' | 'windsock' | 'jet' | 'cessna'

export type Ground = 'grass' | 'road' | 'plaza' | 'parking' | 'apron' | 'water'

export type PlaceInfo = { name: string; fact: string }

export const BUILDINGS: Record<
  string,
  PlaceInfo & {
    kind: BuildingKind
    ground: Ground
    /** Long buildings are cut into slices one cell wide, so things in front of them sort correctly */
    slice?: 'cols' | 'rows'
  }
> = {
  T: {
    kind: 'terminal',
    ground: 'plaza',
    name: 'Main terminal',
    fact: 'Check-in, security and shops under a roof of white tent peaks.',
  },
  P: {
    kind: 'pierA',
    ground: 'apron',
    slice: 'cols',
    name: 'Concourse A',
    fact: 'Gates A1 to A4, with jet bridges that reach out to the planes.',
  },
  Q: {
    kind: 'pierB',
    ground: 'apron',
    slice: 'rows',
    name: 'Concourse B',
    fact: 'Gates B1 to B4, with jet bridges that reach out to the planes.',
  },
  K: {
    kind: 'tower',
    ground: 'plaza',
    name: 'Control tower',
    fact: 'Air traffic control sees both runways from the glass cab, 50 m above the field.',
  },
  F: {
    kind: 'firestation',
    ground: 'plaza',
    name: 'Fire station',
    fact: 'The crash tenders reach any point of the runways within three minutes.',
  },
  D: {
    kind: 'concorde',
    ground: 'plaza',
    name: 'Concorde on display',
    fact: 'The supersonic airliner crossed the Atlantic in under 3.5 hours, until 2003.',
  },
  X: {
    kind: 'themebuilding',
    ground: 'plaza',
    name: 'Theme Building',
    fact: 'A flying saucer on crossed parabolic arches, a space-age icon from 1961.',
  },
  G: {
    kind: 'garage',
    ground: 'plaza',
    name: 'Parking garage',
    fact: 'Five decks, 2400 spaces, and still always full before the holidays.',
  },
  H: {
    kind: 'hotel',
    ground: 'plaza',
    name: 'Skyline Hotel',
    fact: 'Soundproof windows and a rooftop bar with a view of both runways.',
  },
  R: {
    kind: 'rental',
    ground: 'plaza',
    name: 'Car rental center',
    fact: 'All rental companies under one roof, with the cars parked right outside.',
  },
  S: {
    kind: 'station',
    ground: 'plaza',
    name: 'Airport rail station',
    fact: 'The airport express reaches downtown in 16 minutes.',
  },
  M: {
    kind: 'hangar',
    ground: 'apron',
    name: 'Maintenance hangar 1',
    fact: 'Big enough for a wide-body jet. Engines are checked and changed here.',
  },
  N: {
    kind: 'hangar',
    ground: 'apron',
    name: 'Maintenance hangar 2',
    fact: 'The paint shop: a new livery takes about two weeks.',
  },
  C: {
    kind: 'cargo',
    ground: 'apron',
    name: 'Cargo terminal',
    fact: 'Containers of mail, flowers and electronics, sorted around the clock.',
  },
  U: {
    kind: 'cargohangar',
    ground: 'apron',
    name: 'Cargo hangar',
    fact: 'Freighters are loaded through their nose door.',
  },
  W: {
    kind: 'sign',
    ground: 'grass',
    name: "'ISO INTL' letters",
    fact: 'Giant letters that greet the passengers on every landing.',
  },
}

export const PROPS: Record<string, PlaceInfo & { kind: PropKind; ground: Ground }> = {
  t: {
    kind: 'tree',
    ground: 'grass',
    name: 'Tree',
    fact: 'Low trees only: nothing may grow into the approach paths.',
  },
  l: {
    kind: 'floodlight',
    ground: 'apron',
    name: 'Apron floodlight',
    fact: 'Lights the stands at night, without blinding the pilots.',
  },
  f: {
    kind: 'fueltank',
    ground: 'plaza',
    name: 'Fuel farm',
    fact: 'Jet fuel for three days, piped below the apron to the stands.',
  },
  r: {
    kind: 'radar',
    ground: 'grass',
    name: 'Surveillance radar',
    fact: 'Turns every four seconds and sees planes 100 km away.',
  },
  w: {
    kind: 'windsock',
    ground: 'grass',
    name: 'Windsock',
    fact: 'Fully stretched out, it means 15 knots of wind or more.',
  },
  j: {
    kind: 'jet',
    ground: 'apron',
    name: 'Parked jet',
    fact: 'Waiting for its next check or cargo load.',
  },
  c: {
    kind: 'cessna',
    ground: 'apron',
    name: 'Light aircraft',
    fact: 'The flying school trains its pilots between the airliners.',
  },
}

export type Building = PlaceInfo & {
  char: string
  kind: BuildingKind
  /** The back (top) corner cell of the footprint */
  col: number
  row: number
  /** The size of the footprint, in cells */
  cols: number
  rows: number
}

/** A building, or one slice of a long building, as it is placed on the map */
export type BuildingPiece = Building & {
  /** The footprint of the piece */
  pieceCol: number
  pieceRow: number
  pieceCols: number
  pieceRows: number
}

export type Prop = PlaceInfo & { char: string; kind: PropKind; col: number; row: number }

export type AirportMap = {
  columns: number
  rows: number
  cells: string[]
  buildings: Building[]
  pieces: BuildingPiece[]
  props: Prop[]
}

/** The bounding boxes of the building letters, their slices, and the props */
export function parseAirportMap(cells: string[] = AIRPORT_MAP): AirportMap {
  const boxes = new Map<string, { c0: number; r0: number; c1: number; r1: number }>()
  const props: Prop[] = []
  cells.forEach((line, row) => {
    ;[...line].forEach((char, col) => {
      if (BUILDINGS[char]) {
        const box = boxes.get(char)
        if (!box) boxes.set(char, { c0: col, r0: row, c1: col, r1: row })
        else {
          box.c0 = Math.min(box.c0, col)
          box.r0 = Math.min(box.r0, row)
          box.c1 = Math.max(box.c1, col)
          box.r1 = Math.max(box.r1, row)
        }
      } else if (PROPS[char]) {
        const { kind, name, fact } = PROPS[char]
        props.push({ char, kind, name, fact, col, row })
      }
    })
  })
  const buildings: Building[] = [...boxes.entries()].map(([char, box]) => {
    const { kind, name, fact } = BUILDINGS[char]
    return {
      char,
      kind,
      name,
      fact,
      col: box.c0,
      row: box.r0,
      cols: box.c1 - box.c0 + 1,
      rows: box.r1 - box.r0 + 1,
    }
  })
  const pieces: BuildingPiece[] = buildings.flatMap((b) => {
    const slice = BUILDINGS[b.char].slice
    const whole = { ...b, pieceCol: b.col, pieceRow: b.row, pieceCols: b.cols, pieceRows: b.rows }
    if (slice === 'cols')
      return [...Array(b.cols)].map((_, i) => ({ ...whole, pieceCol: b.col + i, pieceCols: 1 }))
    if (slice === 'rows')
      return [...Array(b.rows)].map((_, i) => ({ ...whole, pieceRow: b.row + i, pieceRows: 1 }))
    return [whole]
  })
  return { columns: cells[0]?.length ?? 0, rows: cells.length, cells, buildings, pieces, props }
}

export const airportRoadMap =
  (cells: string[]): RoadMap =>
  (col, row) =>
    cells[row]?.[col] === '#'

export function groundOf(cells: string[], col: number, row: number): Ground {
  const char = cells[row]?.[col]
  switch (char) {
    case '#':
      return 'road'
    case '_':
      return 'plaza'
    case ',':
      return 'parking'
    case '=':
      return 'apron'
    case '~':
      return 'water'
  }
  if (char && BUILDINGS[char]) return BUILDINGS[char].ground
  if (char && PROPS[char]) return PROPS[char].ground
  return 'grass'
}

/** The building or prop on a cell */
export function placeAt(map: AirportMap, col: number, row: number): Building | Prop | undefined {
  return (
    map.buildings.find(
      (b) => col >= b.col && col < b.col + b.cols && row >= b.row && row < b.row + b.rows,
    ) ?? map.props.find((p) => p.col === col && p.row === row)
  )
}
