/**
 * The airside of the 'isoairport' world: runways, taxiways, gates and the routes of the planes.
 * Pure geometry without engine dependencies, so it can be unit tested.
 *
 * Everything here uses continuous grid coordinates ({ col, row }, the center of cell (c, r) is
 * (c + 0.5, r + 0.5)). The runways run diagonally across the grid, in the directions (1, 3) and (3, 1):
 * on screen that is exactly 45 degrees, and they form a V that opens towards the back of the map.
 */

export type Vec = { col: number; row: number }

export const vec = (col: number, row: number): Vec => ({ col, row })
export const add = (a: Vec, b: Vec): Vec => vec(a.col + b.col, a.row + b.row)
export const sub = (a: Vec, b: Vec): Vec => vec(a.col - b.col, a.row - b.row)
export const scale = (a: Vec, k: number): Vec => vec(a.col * k, a.row * k)
export const dot = (a: Vec, b: Vec) => a.col * b.col + a.row * b.row
export const cross = (a: Vec, b: Vec) => a.col * b.row - a.row * b.col
export const length = (a: Vec) => Math.hypot(a.col, a.row)
export const distance = (a: Vec, b: Vec) => length(sub(a, b))
export const normalize = (a: Vec): Vec => scale(a, 1 / (length(a) || 1))
/** The right-hand side of a direction (rows grow downwards) */
export const rightOf = (a: Vec): Vec => vec(-a.row, a.col)

export type Runway = {
  /** The designator of the direction in use */
  name: string
  /** The threshold where the planes start their landing or takeoff */
  from: Vec
  /** The far end */
  to: Vec
  /** In cells */
  width: number
  /** Painted at the 'from' and at the 'to' end */
  designators: [string, string]
}

/** Landing runway: the planes come in from the back and land towards the front */
export const RUNWAY_ARRIVALS: Runway = {
  name: '22',
  from: vec(28, 8),
  to: vec(37, 35),
  width: 1.1,
  designators: ['22', '04'],
}

/** Takeoff runway: the planes start at the front and climb out towards the back */
export const RUNWAY_DEPARTURES: Runway = {
  name: '31',
  from: vec(35, 37),
  to: vec(8, 28),
  width: 1.1,
  designators: ['31', '13'],
}

export const RUNWAYS = [RUNWAY_ARRIVALS, RUNWAY_DEPARTURES]

export const runwayDirection = (r: Runway) => normalize(sub(r.to, r.from))
export const runwayLength = (r: Runway) => distance(r.to, r.from)

/** A point `s` cells down the runway, `offset` cells to its right (the side of the terminal) */
export function onRunway(r: Runway, s: number, offset = 0): Vec {
  const d = runwayDirection(r)
  return add(add(r.from, scale(d, s)), scale(rightOf(d), offset))
}

/** The parallel taxiways are this far from the runway center lines */
export const TAXIWAY_OFFSET = 1.8
/** Taxiway width, in cells */
export const TAXIWAY_WIDTH = 0.7
/** The apron taxilane runs along this row (in front of concourse A) and this column (concourse B) */
export const LANE = 18

export type Gate = {
  name: string
  pier: 'A' | 'B'
  /** Where the plane parks, its center */
  stand: Vec
  /** The direction of the nose when parked */
  heading: Vec
  /** Where the lead-in line leaves the taxilane */
  junction: Vec
  /** Where a pushback ends, nose pointing down the taxilane */
  pushEnd: Vec
}

const GATE_POSITIONS = [19.5, 21.5, 23.5, 25.5]
/** The distance of a parked plane's center from the pier wall */
const STAND = 16.2

/** Concourse A runs along the columns (gates face -row), concourse B along the rows (gates face -col) */
export const GATES: Gate[] = [
  ...GATE_POSITIONS.map((g, i) => ({
    name: `A${i + 1}`,
    pier: 'A' as const,
    stand: vec(g, STAND),
    heading: vec(0, -1),
    junction: vec(g, LANE),
    // the taxilane flows towards -col here, so the push goes towards +col
    pushEnd: vec(g + 1.1, LANE),
  })),
  ...GATE_POSITIONS.map((g, i) => ({
    name: `B${i + 1}`,
    pier: 'B' as const,
    stand: vec(STAND, g),
    heading: vec(-1, 0),
    junction: vec(LANE, g),
    // the taxilane flows towards +row here
    pushEnd: vec(LANE, g - 1.1),
  })),
]

/** The `s` on the parallel taxiway of a runway where it reaches a row (or a column) */
function solveTaxiway(r: Runway, axis: 'col' | 'row', value: number): number {
  const a = onRunway(r, 0, TAXIWAY_OFFSET)
  const d = runwayDirection(r)
  return (value - a[axis]) / d[axis]
}

/** Points of a half circle that turns a plane around between a runway and its parallel taxiway */
function uTurn(r: Runway, s: number, fromRunway: boolean, steps = 10): Vec[] {
  const d = runwayDirection(r)
  const right = rightOf(d)
  const radius = TAXIWAY_OFFSET / 2
  const center = onRunway(r, s, radius)
  return [...Array(steps + 1)].map((_, i) => {
    const angle = (i / steps) * Math.PI
    // from the runway: forwards and over to the right; to the runway: backwards and over to the left
    const side = fromRunway ? -Math.cos(angle) : Math.cos(angle)
    const ahead = fromRunway ? Math.sin(angle) : -Math.sin(angle)
    return add(center, add(scale(right, side * radius), scale(d, ahead * radius)))
  })
}

/** Rollout ends here, and the planes turn around onto taxiway B */
export const EXIT_S = 25.5
/** Where the departing planes turn onto the runway, and where they line up */
export const LINEUP_S = 2.2
export const TAKEOFF_S = 2.6
/** Departures wait here, before the runway */
export const HOLD_S = 3.8

/** Taxiway B joins the taxilane in front of concourse A */
export const JUNCTION_B = onRunway(
  RUNWAY_ARRIVALS,
  solveTaxiway(RUNWAY_ARRIVALS, 'row', LANE),
  TAXIWAY_OFFSET,
)
/** The taxilane in front of concourse B joins taxiway A */
export const JUNCTION_A = onRunway(
  RUNWAY_DEPARTURES,
  solveTaxiway(RUNWAY_DEPARTURES, 'col', LANE),
  TAXIWAY_OFFSET,
)
export const LANE_CORNER = vec(LANE, LANE)
export const HOLD_POINT = onRunway(RUNWAY_DEPARTURES, HOLD_S, TAXIWAY_OFFSET)

/** Taxiway B: from the end of the landing runway back to the apron */
export const TAXIWAY_B = [
  ...uTurn(RUNWAY_ARRIVALS, EXIT_S, true),
  onRunway(RUNWAY_ARRIVALS, EXIT_S - 1, TAXIWAY_OFFSET),
  JUNCTION_B,
]
/** The apron taxilane, an L in front of both concourses. One way, like everything on the airside. */
export const TAXILANE = [JUNCTION_B, LANE_CORNER, JUNCTION_A]
/** Taxiway A: from the apron to the start of the takeoff runway */
export const TAXIWAY_A = [
  JUNCTION_A,
  HOLD_POINT,
  ...uTurn(RUNWAY_DEPARTURES, LINEUP_S, false),
  onRunway(RUNWAY_DEPARTURES, TAKEOFF_S),
]

export const TAXIWAYS: Array<{ name: string; points: Vec[] }> = [
  { name: 'B', points: TAXIWAY_B },
  { name: 'Apron', points: TAXILANE },
  { name: 'A', points: TAXIWAY_A },
]

/** A polyline with its cumulative lengths */
export type Path = { points: Vec[]; lengths: number[]; total: number }

export function createPath(points: Vec[]): Path {
  const lengths = [0]
  for (let i = 1; i < points.length; i++)
    lengths.push(lengths[i - 1] + distance(points[i], points[i - 1]))
  return { points, lengths, total: lengths[lengths.length - 1] }
}

/** The position and the direction of travel at a distance along a path */
export function pointAt(path: Path, d: number): { position: Vec; direction: Vec } {
  const { points, lengths } = path
  if (points.length === 1) return { position: points[0], direction: vec(1, 0) }
  const t = Math.max(0, Math.min(d, path.total))
  let i = 1
  while (i < lengths.length - 1 && lengths[i] < t) i++
  const segment = lengths[i] - lengths[i - 1]
  const k = segment > 0 ? (t - lengths[i - 1]) / segment : 0
  const a = points[i - 1]
  const b = points[i]
  return { position: add(a, scale(sub(b, a), k)), direction: normalize(sub(b, a)) }
}

/**
 * Rounds the corners of a polyline with a curve of about `radius` cells, so planes turn smoothly.
 * Points closer together than that (already a curve) are hardly changed.
 */
export function roundCorners(points: Vec[], radius = 0.7, steps = 6): Vec[] {
  // drop duplicates, they have no direction
  const clean = points.filter((p, i) => i === 0 || distance(p, points[i - 1]) > 1e-6)
  if (clean.length < 3) return clean
  const result: Vec[] = [clean[0]]
  for (let i = 1; i < clean.length - 1; i++) {
    const prev = clean[i - 1]
    const corner = clean[i]
    const next = clean[i + 1]
    const inLength = distance(corner, prev)
    const outLength = distance(next, corner)
    const d = Math.min(radius, inLength / 2, outLength / 2)
    const start = add(corner, scale(normalize(sub(prev, corner)), d))
    const end = add(corner, scale(normalize(sub(next, corner)), d))
    for (let s = 0; s <= steps; s++) {
      // a quadratic Bezier curve with the corner as control point
      const t = s / steps
      const a = add(start, scale(sub(corner, start), t))
      const b = add(corner, scale(sub(end, corner), t))
      result.push(add(a, scale(sub(b, a), t)))
    }
  }
  result.push(clean[clean.length - 1])
  return result
}

const route = (points: Vec[]) => createPath(roundCorners(points))

/** The planes come down this glide path, from far behind the threshold */
export const APPROACH_DISTANCE = 30
export const TOUCHDOWN_S = 2.5
/** Pixels of altitude per cell of distance to the touchdown point */
export const GLIDE_SLOPE = 6

export const approachPath = () =>
  createPath([
    onRunway(RUNWAY_ARRIVALS, TOUCHDOWN_S - APPROACH_DISTANCE),
    onRunway(RUNWAY_ARRIVALS, TOUCHDOWN_S),
  ])

export const landingPath = () =>
  createPath([onRunway(RUNWAY_ARRIVALS, TOUCHDOWN_S), onRunway(RUNWAY_ARRIVALS, EXIT_S)])

/** From the end of the rollout to the stand of a gate */
export function taxiInPath(gate: Gate): Path {
  const lane = gate.pier === 'A' ? [gate.junction] : [LANE_CORNER, gate.junction]
  return route([...TAXIWAY_B, ...lane, gate.stand])
}

/** Tail first out of the stand, until the nose points down the taxilane */
export function pushbackPath(gate: Gate): Path {
  const back = sub(gate.stand, scale(gate.heading, 1.1))
  const upstream = normalize(sub(gate.pushEnd, gate.junction))
  return createPath(
    roundCorners([gate.stand, back, add(gate.junction, scale(upstream, 0.35)), gate.pushEnd], 0.5),
  )
}

/** From the end of the pushback to the holding point of the takeoff runway */
export function taxiOutPath(gate: Gate): Path {
  const lane = gate.pier === 'A' ? [gate.junction, LANE_CORNER] : [gate.junction]
  return route([gate.pushEnd, ...lane, JUNCTION_A, HOLD_POINT])
}

/** From the holding point onto the runway */
export const lineupPath = () => route(TAXIWAY_A.slice(1))

export const TAKEOFF_LENGTH = 62
/** Distance into the takeoff roll where the nose comes up */
export const ROTATE_AT = 9

export const takeoffPath = () =>
  createPath([
    onRunway(RUNWAY_DEPARTURES, TAKEOFF_S),
    onRunway(RUNWAY_DEPARTURES, TAKEOFF_S + TAKEOFF_LENGTH),
  ])

/** Altitude in pixels on the takeoff path */
export const climbAltitude = (d: number) => (d < ROTATE_AT ? 0 : 3.2 * (d - ROTATE_AT) ** 1.3)

/** Altitude in pixels on the approach path */
export const approachAltitude = (d: number) => Math.max(0, (APPROACH_DISTANCE - d) * GLIDE_SLOPE)

/** The distance of a point to a segment */
export function distanceToSegment(p: Vec, a: Vec, b: Vec): number {
  const ab = sub(b, a)
  const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / (dot(ab, ab) || 1)))
  return distance(p, add(a, scale(ab, t)))
}

/** The distance of a point to a polyline */
export const distanceToPolyline = (p: Vec, points: Vec[]) =>
  points.slice(1).reduce((min, b, i) => Math.min(min, distanceToSegment(p, points[i], b)), Infinity)
