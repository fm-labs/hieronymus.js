/**
 * The map, the landmarks and the traffic rules of the 'isovienna' world.
 * Pure functions without engine dependencies, so they can be unit tested.
 */
import { blockersOf, stepVehicle, type RoadMap, type Vehicle } from '../isocity/isocity.traffic.ts'

export { DAY_SECONDS, formatClock, nightAmount } from '../isovegas/isovegas.map.ts'

/**
 * Vienna, one character per cell (rows top to bottom = north to south).
 * The Ringstraße circles the old town with Stephansdom in the middle. The Danube Canal flows along
 * the north with the Prater behind it. Schönbrunn, the Belvedere and the vineyards lie to the south.
 *
 * Ground:     '#' road, '=' the Ring (a road with tram tracks), '%' bridge, '~' water,
 *             '.' lawn, ',' cobblestone pavement
 * Props:      't' tree, 'h' town house, 'c' coffee house, 'k' sausage stand, 'u' U-Bahn station,
 *             'r' Heuriger (wine tavern), 'v' vines
 * Landmarks:  each uppercase letter fills a rectangle (see LANDMARKS)
 */
export const VIENNA_MAP = [
  '.t........t.t.t..GGGGGGG..t.t..t',
  '.....DDD.........GGGGGGG..r.....',
  't.t..DDD.t.t.t.t.GGGGGGG.t.t..t.',
  'h.h.hDDD.h.h.h.h.GGGGGGG.h.h.h.h',
  '################################',
  '~~~%~~~~~~~~%~~~~~~~~~~~~~~~~%~~',
  '~~~%~~~~~~~~%~~~~~~~~~~~~~~~~%~~',
  '..h#####================######..',
  '.t.#VVVV=hhchhh#hhuhhhh=hhuhh#t.',
  'h..#VVVV=h,,h,k#h,c,h,h=.....#.h',
  '.t.#VVVV=hhhhhh#SSSSSS,=h.h.h#t.',
  'h.h#VVVV=BBB,,,#SSSSSS,=.c.h.#.h',
  '.t.#####=BBB,h,#SSSSSS,=######t.',
  'h..#RRRR=BBB,,c#SSSSSSh=TTTTT#.h',
  '.t.#RRRR=##############=TTTTT#t.',
  'h.h#RRRR=HHHHHH#hchhhhh=TTTTT#.h',
  '.t.#RRRR=HHHHHH#h,h,h,h=TTTTT#t.',
  'h..#####=HHHHHH#hh,h,hh=TTTTT#.h',
  '.t.#PPPP=HHHHHH#OOOO,,,=######t.',
  'h.h#PPPP=HHHHHH#OOOO,,h=MMM..#.h',
  '.t.#PPPP=,,,,,,#OOOOkhh=MMMkh#t.',
  'h..#####================######.h',
  '.t.#KKKKKK...ZZ#CCCC.EEEEEEEE#t.',
  'h.h#KKKKKK.h.ZZ#CCCC.EEEEEEEE#.h',
  '.t.#KKKKKK..u..#CCCC.EEEEEEEE#t.',
  'h..#KKKKKKNNNNN#CCCCtEEEEEEEE#.h',
  '.t.#KKKKKKNNNNN#...ctEEEEEEEE#t.',
  '..h###########################..',
  't.t.QQQQQQQQQQQ#WWW.......r...t.',
  '....QQQQQQQQQQQ#WWW.vvvvvvvvv.t.',
  't.t.QQQQQQQQQQQ#WWW...........t.',
  '....QQQQQQQQQQQ#..h.vvvvvvvvv.t.',
  't.t.QQQQQQQQQQQ#t.t...........t.',
  '....QQQQQQQQQQQ#....vvvvvvvvv.t.',
]

export type LandmarkKind =
  | 'stephansdom'
  | 'hofburg'
  | 'staatsoper'
  | 'burgtheater'
  | 'rathaus'
  | 'parlament'
  | 'votivkirche'
  | 'museums'
  | 'karlskirche'
  | 'secession'
  | 'naschmarkt'
  | 'belvedere'
  | 'schoenbrunn'
  | 'stadtpark'
  | 'musikverein'
  | 'prater'
  | 'donauturm'
  | 'hundertwasser'

export type PropKind = 'tree' | 'house' | 'cafe' | 'wurstel' | 'ubahn' | 'heuriger' | 'vines'

export type PlaceInfo = { name: string; fact: string }

export const LANDMARKS: Record<string, PlaceInfo & { kind: LandmarkKind }> = {
  S: {
    kind: 'stephansdom',
    name: 'Stephansdom',
    fact: 'The Gothic cathedral in the heart of Vienna. Its south tower is 136 m tall, its roof is covered with 230,000 glazed tiles.',
  },
  H: {
    kind: 'hofburg',
    name: 'Hofburg',
    fact: 'The winter palace of the Habsburgs for 600 years, today the seat of the Austrian president.',
  },
  O: {
    kind: 'staatsoper',
    name: 'Staatsoper',
    fact: 'The State Opera on the Ring, opened in 1869. Once a year its stage becomes the dance floor of the Opera Ball.',
  },
  B: {
    kind: 'burgtheater',
    name: 'Burgtheater',
    fact: 'One of the most important German-language theatres, with staircases painted by Gustav Klimt.',
  },
  R: {
    kind: 'rathaus',
    name: 'Rathaus',
    fact: 'The neo-Gothic city hall. The iron "Rathausmann" knight on its 98 m tower guards the city.',
  },
  P: {
    kind: 'parlament',
    name: 'Parlament',
    fact: 'A Greek temple for democracy, with the goddess Pallas Athene in front.',
  },
  V: {
    kind: 'votivkirche',
    name: 'Votivkirche',
    fact: 'Twin 99 m spires, built as a thank-you after Emperor Franz Joseph survived an assassination attempt in 1853.',
  },
  K: {
    kind: 'museums',
    name: 'Maria-Theresien-Platz',
    fact: 'Twin museums of art and natural history face each other, with Empress Maria Theresa between them.',
  },
  C: {
    kind: 'karlskirche',
    name: 'Karlskirche',
    fact: 'A baroque church with a 72 m dome and two columns modeled on Trajan’s column in Rome.',
  },
  Z: {
    kind: 'secession',
    name: 'Secession',
    fact: 'The Art Nouveau exhibition hall with a dome of 3,000 gilded laurel leaves, the "golden cabbage".',
  },
  N: {
    kind: 'naschmarkt',
    name: 'Naschmarkt',
    fact: 'Vienna’s most popular market for over 100 years: fruit, spices, cheese and little restaurants.',
  },
  E: {
    kind: 'belvedere',
    name: 'Belvedere',
    fact: 'A baroque palace with a garden and pond, home of Klimt’s painting "The Kiss".',
  },
  Q: {
    kind: 'schoenbrunn',
    name: 'Schönbrunn',
    fact: 'The 1,441-room summer palace of the Habsburgs, with the Gloriette on the hill above its gardens.',
  },
  T: {
    kind: 'stadtpark',
    name: 'Stadtpark',
    fact: 'The city park with the golden statue of Johann Strauss, the waltz king, and the Kursalon.',
  },
  M: {
    kind: 'musikverein',
    name: 'Musikverein',
    fact: 'Home of the Vienna Philharmonic. The New Year’s Concert is broadcast from its Golden Hall.',
  },
  G: {
    kind: 'prater',
    name: 'Prater & Riesenrad',
    fact: 'The giant Ferris wheel from 1897 turns slowly above the oldest amusement park in the world.',
  },
  D: {
    kind: 'donauturm',
    name: 'Donauturm',
    fact: 'The 252 m Danube Tower, with a revolving restaurant at the top.',
  },
  W: {
    kind: 'hundertwasser',
    name: 'Hundertwasserhaus',
    fact: 'Colorful apartments without straight lines, with trees growing out of the windows.',
  },
}

export const PROPS: Record<string, PlaceInfo & { kind: PropKind }> = {
  t: {
    kind: 'tree',
    name: 'Chestnut tree',
    fact: 'Chestnut trees line the parks and the Prater Hauptallee.',
  },
  h: {
    kind: 'house',
    name: 'Altbau',
    fact: 'Old town houses from the 19th century, with high ceilings and decorated facades.',
  },
  c: {
    kind: 'cafe',
    name: 'Kaffeehaus',
    fact: 'Viennese coffee houses are UNESCO heritage: order a Melange and stay all afternoon.',
  },
  k: {
    kind: 'wurstel',
    name: 'Würstelstand',
    fact: 'The sausage stand: a Käsekrainer with mustard, even late at night after the opera.',
  },
  u: {
    kind: 'ubahn',
    name: 'U-Bahn station',
    fact: 'The underground with five lines, marked by the white U on a blue sign.',
  },
  r: {
    kind: 'heuriger',
    name: 'Heuriger',
    fact: 'A wine tavern serving this year’s wine. A bunch of pine branches over the door means it is open.',
  },
  v: {
    kind: 'vines',
    name: 'Vineyard',
    fact: 'Vienna is the only capital with real vineyards inside the city: Grüner Veltliner and Gemischter Satz.',
  },
}

export type Ground = 'road' | 'ring' | 'bridge' | 'water' | 'lawn' | 'pavement' | 'plaza'

export type Landmark = PlaceInfo & {
  char: string
  kind: LandmarkKind
  /** The back (top) corner cell of the footprint */
  col: number
  row: number
  /** The size of the footprint, in cells */
  cols: number
  rows: number
}

export type Prop = PlaceInfo & { char: string; kind: PropKind; col: number; row: number }

export type ViennaMap = {
  columns: number
  rows: number
  cells: string[]
  landmarks: Landmark[]
  props: Prop[]
}

/** The bounding boxes of the landmark letters, and the props */
export function parseViennaMap(cells: string[] = VIENNA_MAP): ViennaMap {
  const boxes = new Map<string, { c0: number; r0: number; c1: number; r1: number }>()
  const props: Prop[] = []
  cells.forEach((line, row) => {
    ;[...line].forEach((char, col) => {
      if (LANDMARKS[char]) {
        const box = boxes.get(char)
        if (!box) boxes.set(char, { c0: col, r0: row, c1: col, r1: row })
        else {
          box.c0 = Math.min(box.c0, col)
          box.r0 = Math.min(box.r0, row)
          box.c1 = Math.max(box.c1, col)
          box.r1 = Math.max(box.r1, row)
        }
      } else if (PROPS[char]) {
        props.push({ char, ...PROPS[char], col, row })
      }
    })
  })
  const landmarks = [...boxes.entries()].map(([char, box]) => ({
    char,
    ...LANDMARKS[char],
    col: box.c0,
    row: box.r0,
    cols: box.c1 - box.c0 + 1,
    rows: box.r1 - box.r0 + 1,
  }))
  return { columns: cells[0]?.length ?? 0, rows: cells.length, cells, landmarks, props }
}

/** Where cars, buses and fiakers drive: streets, the Ring and the bridges */
export const viennaRoadMap =
  (cells: string[]): RoadMap =>
  (col, row) => {
    const char = cells[row]?.[col]
    return char === '#' || char === '=' || char === '%'
  }

/** Where the trams drive: round and round the Ring */
export const viennaTramMap =
  (cells: string[]): RoadMap =>
  (col, row) =>
    cells[row]?.[col] === '='

export function groundOf(cells: string[], col: number, row: number): Ground {
  const char = cells[row]?.[col]
  switch (char) {
    case '#':
      return 'road'
    case '=':
      return 'ring'
    case '%':
      return 'bridge'
    case '~':
      return 'water'
    case ',':
      return 'pavement'
  }
  if (char && LANDMARKS[char]) return 'plaza'
  // town houses, cafés and stands stand on the pavement, trees and vines on the lawn
  if (char && PROPS[char] && !['t', 'v', 'r'].includes(char)) return 'pavement'
  return 'lawn'
}

/** The landmark or prop on a cell */
export function placeAt(map: ViennaMap, col: number, row: number): Landmark | Prop | undefined {
  return (
    map.landmarks.find(
      (l) => col >= l.col && col < l.col + l.cols && row >= l.row && row < l.row + l.rows,
    ) ?? map.props.find((p) => p.col === col && p.row === row)
  )
}

/**
 * Move all vehicles that are not blocked, like `stepTraffic` of isocity, but every vehicle
 * follows its own road map: the trams stay on the Ring, the cars go everywhere.
 * All vehicles see each other, so cars wait behind trams and the other way round.
 */
export function stepViennaTraffic(
  vehicles: Vehicle[],
  roadOf: (vehicle: Vehicle) => RoadMap,
  deltaSeconds: number,
  random: () => number,
): void {
  const blockers = new Map(vehicles.map((vehicle) => [vehicle, blockersOf(vehicle, vehicles)]))
  // two vehicles crossing at a junction can block each other: then the one with the lower id goes
  const moving = vehicles.filter((vehicle) =>
    blockers
      .get(vehicle)!
      .every((other) => vehicle.id < other.id && blockers.get(other)!.includes(vehicle)),
  )
  moving.forEach((vehicle) => stepVehicle(vehicle, roadOf(vehicle), deltaSeconds, random))
}

/** Shared by all components of the world, and updated by the system every frame */
export type ViennaScene = {
  /** Seconds since the start, for animations */
  time: number
  /** Time of day, 0..24 */
  hours: number
  /** 0 by day, 1 at night */
  night: number
  /** Snow on the roofs and falling flakes */
  winter: boolean
}
