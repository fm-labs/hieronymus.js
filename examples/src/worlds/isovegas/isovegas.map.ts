/**
 * The map, the landmarks and the clock of the 'isovegas' world.
 * Pure functions without engine dependencies, so they can be unit tested.
 */
import type { RoadMap } from '../isocity/isocity.traffic.ts'

/**
 * The Las Vegas Strip, one character per cell (rows top to bottom = north to south).
 * The Strip runs down the middle: two roads with a median of palms, crossed by six streets.
 *
 * Ground:     '#' road, '.' desert, ':' median
 * Props:      'p' palm, 'y' cactus, 'c' wedding chapel, 'm' motel, 'w' 'Welcome to Las Vegas' sign
 * Landmarks:  each uppercase letter fills a rectangle (see LANDMARKS)
 */
export const VEGAS_MAP = [
  '.y..c..y..#p#..y..m..y.',
  'p#####################p',
  'y#UUUUUUUU#p#SSSSWWWW#.',
  '.#UUUUUUUU#:#SSSSWWWW#c',
  'p#UUUUUUUU#p#SSSSWWWW#.',
  '.#UUUUUUUU#:#SSSSWWWW#y',
  'm#UUUUUUUU#p#SSSSWWWW#.',
  '.#UUUUUUUU#:#SSSSWWWW#p',
  'p#####################.',
  '.#MMMMMMMM#p#VVVVOOOO#.',
  'y#MMMMMMMM#:#VVVVOOOO#y',
  '.#MMMMMMMM#p#VVVVOOOO#.',
  'c#MMMMMMMM#:#VVVVOOOO#m',
  '.#MMMMMMMM#p#VVVVOOOO#.',
  'p#MMMMMMMM#:#VVVVOOOO#y',
  '.#####################p',
  'y#CCCCCCCC#p#FFFFHHHH#.',
  '.#CCCCCCCC#:#FFFFHHHH#c',
  'p#CCCCCCCC#p#FFFFHHHH#.',
  '.#CCCCCCCC#:#FFFFHHHH#y',
  'm#CCCCCCCC#p#FFFFHHHH#.',
  '.#CCCCCCCC#:#FFFFHHHH#p',
  'p#####################.',
  '.#BBBBBBBB#p#PPPPYYYY#.',
  'y#BBBBBBBB#:#PPPPYYYY#m',
  '.#BBBBBBBB#p#PPPPYYYY#.',
  'c#BBBBBBBB#:#PPPPYYYY#y',
  '.#BBBBBBBB#p#PPPPYYYY#.',
  'p#BBBBBBBB#:#PPPPYYYY#p',
  '.#####################.',
  'y#NNNNNNNN#p#GGGGGGGG#c',
  '.#NNNNNNNN#:#GGGGGGGG#.',
  'p#NNNNNNNN#p#GGGGGGGG#y',
  '.#XXXXXXXX#:#GGGGGGGG#.',
  'm#XXXXXXXX#p#GGGGGGGG#p',
  '.#XXXXXXXX#:#GGGGGGGG#.',
  'p#####################y',
  '.yLLLLLLLL#p#DDDDDDDD..',
  '..LLLLLLLL#w#DDDDDDDD.y',
  'p.LLLLLLLL#p#DDDDDDDD.p',
]

export type LandmarkKind =
  | 'circus'
  | 'strat'
  | 'wynn'
  | 'mirage'
  | 'venetian'
  | 'sphere'
  | 'caesars'
  | 'flamingo'
  | 'highroller'
  | 'bellagio'
  | 'paris'
  | 'hollywood'
  | 'nyny'
  | 'excalibur'
  | 'mgm'
  | 'luxor'
  | 'mandalay'

export type PropKind = 'palm' | 'cactus' | 'chapel' | 'motel' | 'welcome'

export type PlaceInfo = { name: string; fact: string }

export const LANDMARKS: Record<string, PlaceInfo & { kind: LandmarkKind }> = {
  U: {
    kind: 'circus',
    name: 'Circus Circus',
    fact: 'A striped big top next to the hotel towers, with free circus acts every day.',
  },
  S: {
    kind: 'strat',
    name: 'The STRAT',
    fact: 'At 350 m the tallest observation tower in the USA, with thrill rides on top.',
  },
  W: {
    kind: 'wynn',
    name: 'Wynn',
    fact: 'A curved bronze glass tower next to its own golf course.',
  },
  M: {
    kind: 'mirage',
    name: 'The Mirage',
    fact: 'A tropical lagoon with a volcano that erupted every evening.',
  },
  V: {
    kind: 'venetian',
    name: 'The Venetian',
    fact: "Canals with gondolas and a copy of the bell tower of St Mark's Square.",
  },
  O: {
    kind: 'sphere',
    name: 'Sphere',
    fact: 'A 112 m globe covered in LEDs that shows giant eyes, planets and emojis.',
  },
  C: {
    kind: 'caesars',
    name: 'Caesars Palace',
    fact: 'Roman temples, pools and cypress trees, open since 1966.',
  },
  F: {
    kind: 'flamingo',
    name: 'Flamingo',
    fact: 'The pink neon classic from 1946, with live flamingos in its garden.',
  },
  H: {
    kind: 'highroller',
    name: 'High Roller',
    fact: 'A 167 m observation wheel: one turn takes 30 minutes.',
  },
  B: {
    kind: 'bellagio',
    name: 'Bellagio',
    fact: 'An 8-acre lake with fountains that dance to music.',
  },
  P: {
    kind: 'paris',
    name: 'Paris Las Vegas',
    fact: 'A half-scale Eiffel Tower and a hot air balloon sign.',
  },
  Y: {
    kind: 'hollywood',
    name: 'Planet Hollywood',
    fact: 'A glass tower wrapped in giant LED screens.',
  },
  N: {
    kind: 'nyny',
    name: 'New York-New York',
    fact: 'The Manhattan skyline, the Statue of Liberty and a roller coaster.',
  },
  X: {
    kind: 'excalibur',
    name: 'Excalibur',
    fact: 'A fairy-tale castle with red, blue and gold turrets.',
  },
  G: {
    kind: 'mgm',
    name: 'MGM Grand',
    fact: 'Emerald green towers guarded by a 14 m bronze lion.',
  },
  L: {
    kind: 'luxor',
    name: 'Luxor',
    fact: 'A black glass pyramid with a sphinx, and a beam of light into the night sky.',
  },
  D: {
    kind: 'mandalay',
    name: 'Mandalay Bay',
    fact: 'Golden towers above a sandy beach with a wave pool.',
  },
}

export const PROPS: Record<string, PlaceInfo & { kind: PropKind }> = {
  p: { kind: 'palm', name: 'Palm tree', fact: 'Palms line the median of the Strip.' },
  y: { kind: 'cactus', name: 'Saguaro', fact: 'The Mojave desert starts right behind the hotels.' },
  c: {
    kind: 'chapel',
    name: 'Wedding chapel',
    fact: 'Little white chapels marry couples in 15 minutes, day and night.',
  },
  m: { kind: 'motel', name: 'Motel', fact: 'Old neon motels from the 1950s along the side roads.' },
  w: {
    kind: 'welcome',
    name: "'Welcome to Fabulous Las Vegas' sign",
    fact: 'The famous sign from 1959 stands on the median at the south end of the Strip.',
  },
}

export type Ground = 'road' | 'desert' | 'median' | 'plaza'

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

export type VegasMap = {
  columns: number
  rows: number
  cells: string[]
  landmarks: Landmark[]
  props: Prop[]
}

/** The bounding boxes of the landmark letters, and the props */
export function parseVegasMap(cells: string[] = VEGAS_MAP): VegasMap {
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

export const vegasRoadMap =
  (cells: string[]): RoadMap =>
  (col, row) =>
    cells[row]?.[col] === '#'

export function groundOf(cells: string[], col: number, row: number): Ground {
  const char = cells[row]?.[col]
  if (char === '#') return 'road'
  if (char && LANDMARKS[char]) return 'plaza'
  // the median lies between the two roads of the Strip
  if (cells[row]?.[col - 1] === '#' && cells[row]?.[col + 1] === '#') return 'median'
  return 'desert'
}

/** The landmark or prop on a cell */
export function placeAt(map: VegasMap, col: number, row: number): Landmark | Prop | undefined {
  return (
    map.landmarks.find(
      (l) => col >= l.col && col < l.col + l.cols && row >= l.row && row < l.row + l.rows,
    ) ?? map.props.find((p) => p.col === col && p.row === row)
  )
}

/** Real seconds per day in the world */
export const DAY_SECONDS = 240

/** Shared by all components of the world, and updated by the system every frame */
export type VegasScene = {
  /** Seconds since the start, for animations */
  time: number
  /** Time of day, 0..24 */
  hours: number
  /** 0 by day, 1 at night */
  night: number
}

/**
 * How dark it is at a time of day (hours 0..24): 0 during the day, 1 at night,
 * with a smooth dusk from 18:00 to 20:00 and dawn from 5:00 to 7:00.
 */
export function nightAmount(hours: number): number {
  const h = ((hours % 24) + 24) % 24
  if (h >= 7 && h <= 18) return 0
  if (h >= 20 || h <= 5) return 1
  const t = h > 12 ? (h - 18) / 2 : 1 - (h - 5) / 2
  return (1 - Math.cos(Math.PI * t)) / 2
}

export function formatClock(hours: number): string {
  const minutes = Math.floor((((hours % 24) + 24) % 24) * 60)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}
