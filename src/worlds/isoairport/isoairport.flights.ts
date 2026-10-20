/**
 * The flights of the 'isoairport' world: arrivals, turnarounds at the gates and departures.
 * Pure functions without engine dependencies, so they can be unit tested.
 *
 * Every flight follows a list of legs (approach, landing, taxi in, pushback, taxi out, line up,
 * takeoff). All taxiways are one way, so planes never meet head on; on the ground they keep their
 * distance to the plane ahead. Runways are used by one plane at a time.
 */
import {
  approachAltitude,
  approachPath,
  climbAltitude,
  cross,
  distance,
  dot,
  GATES,
  landingPath,
  lineupPath,
  pointAt,
  pushbackPath,
  scale,
  sub,
  takeoffPath,
  taxiInPath,
  taxiOutPath,
  type Path,
  type Vec,
} from './isoairport.airside.ts'

export type PlaneType = 'narrow' | 'wide' | 'jumbo' | 'regional'

export type Airline = { code: string; name: string; color: string; tail: string }

export const AIRLINES: Airline[] = [
  { code: 'ISO', name: 'Iso Air', color: '#1565c0', tail: '#0d47a1' },
  { code: 'DMD', name: 'Diamond Airways', color: '#c62828', tail: '#8e1b1b' },
  { code: 'TIL', name: 'Tile Jet', color: '#ef6c00', tail: '#f57c00' },
  { code: 'PXP', name: 'Pixel Pacific', color: '#00897b', tail: '#00695c' },
  { code: 'GRD', name: 'Grid Express', color: '#6a1b9a', tail: '#4a148c' },
  { code: 'VOX', name: 'Voxel Atlantic', color: '#2e7d32', tail: '#1b5e20' },
]

export const CITIES = [
  'Vienna',
  'Tokyo',
  'New York',
  'Paris',
  'Sydney',
  'Reykjavik',
  'Cairo',
  'Lima',
  'Oslo',
  'Dubai',
  'Singapore',
  'Lisbon',
  'Nairobi',
  'Toronto',
  'Seoul',
  'Cape Town',
]

export type Phase =
  | 'approach'
  | 'landing'
  | 'taxiIn'
  | 'atGate'
  | 'pushback'
  | 'taxiOut'
  | 'holding'
  | 'lineup'
  | 'takeoff'

export type Leg = {
  phase: Phase
  path: Path
  /** Cruise speed, cells per second */
  speed: number
  /** Cells per second², used to speed up and to slow down */
  accel: number
  /** Comes to a stop at the end of the leg */
  stop: boolean
  /** Moves tail first (pushback) */
  reverse?: boolean
  /** Keeps a distance to the plane ahead */
  separation: boolean
  /** Altitude in pixels along the leg */
  altitude?: (d: number) => number
}

export type Flight = {
  id: number
  code: string
  airline: Airline
  type: PlaneType
  /** Where it comes from, and where it goes next */
  origin: string
  destination: string
  /** Index into GATES */
  gate: number
  phase: Phase
  legs: Leg[]
  /** Distance along the current leg (legs[0]) */
  dist: number
  speed: number
  /** Seconds left at the gate, or lined up on the runway */
  timer: number
  /** Seconds the plane has been held up by another plane */
  waited: number
  position: Vec
  /** Where the nose points */
  heading: Vec
  /** Pixels above the ground */
  altitude: number
}

export type AirportTraffic = {
  flights: Flight[]
  /** The flight id at each gate, or 0 */
  gates: number[]
  nextId: number
  /** Seconds until the next arrival may start its approach */
  arrivalTimer: number
  arrivals: number
  departures: number
  /** Flights that left the map in the last step */
  departed: Flight[]
}

export type TrafficOptions = {
  /** Planes at the gates at the start */
  parked?: number
  maxFlights?: number
}

/** Seconds at the gate */
const TURNAROUND: [number, number] = [40, 80]

/** On the ground, planes stay this far (in cells) behind the plane ahead */
export const SEPARATION = 1.75
const TAXI_SPEED = 1.3
const APPROACH_SPEED = 3.2
const TAKEOFF_SPEED = 4.8
/** Departures wait on the runway this long before they start */
const LINEUP_WAIT = 1.5

const pick = <T>(items: T[], random: () => number): T => items[Math.floor(random() * items.length)]

function planeType(random: () => number): PlaneType {
  const r = random()
  return r < 0.55 ? 'narrow' : r < 0.75 ? 'wide' : r < 0.9 ? 'regional' : 'jumbo'
}

const legs = {
  approach: (): Leg => ({
    phase: 'approach',
    path: approachPath(),
    speed: APPROACH_SPEED,
    accel: 1,
    stop: false,
    separation: false,
    altitude: approachAltitude,
  }),
  landing: (): Leg => ({
    phase: 'landing',
    path: landingPath(),
    speed: TAXI_SPEED,
    accel: 0.2,
    stop: false,
    separation: true,
  }),
  taxiIn: (gate: number): Leg => ({
    phase: 'taxiIn',
    path: taxiInPath(GATES[gate]),
    speed: TAXI_SPEED,
    accel: 0.6,
    stop: true,
    separation: true,
  }),
  pushback: (gate: number): Leg => ({
    phase: 'pushback',
    path: pushbackPath(GATES[gate]),
    speed: 0.45,
    accel: 0.4,
    stop: true,
    reverse: true,
    separation: false,
  }),
  taxiOut: (gate: number): Leg => ({
    phase: 'taxiOut',
    path: taxiOutPath(GATES[gate]),
    speed: TAXI_SPEED,
    accel: 0.6,
    stop: true,
    separation: true,
  }),
  lineup: (): Leg => ({
    phase: 'lineup',
    path: lineupPath(),
    speed: 0.9,
    accel: 0.5,
    stop: true,
    separation: false,
  }),
  takeoff: (): Leg => ({
    phase: 'takeoff',
    path: takeoffPath(),
    speed: TAKEOFF_SPEED,
    accel: 0.45,
    stop: false,
    separation: false,
    altitude: climbAltitude,
  }),
}

function newFlight(traffic: AirportTraffic, gate: number, random: () => number): Flight {
  const airline = pick(AIRLINES, random)
  const origin = pick(CITIES, random)
  let destination = pick(CITIES, random)
  if (destination === origin) destination = CITIES[(CITIES.indexOf(origin) + 5) % CITIES.length]
  const flight: Flight = {
    id: traffic.nextId++,
    code: `${airline.code} ${100 + Math.floor(random() * 900)}`,
    airline,
    type: planeType(random),
    origin,
    destination,
    gate,
    phase: 'approach',
    legs: [],
    dist: 0,
    speed: 0,
    timer: 0,
    waited: 0,
    position: GATES[gate].stand,
    heading: GATES[gate].heading,
    altitude: 0,
  }
  traffic.gates[gate] = flight.id
  return flight
}

/** Set the position, heading and altitude from the current leg */
function place(flight: Flight) {
  const leg = flight.legs[0]
  if (!leg) return
  const { position, direction } = pointAt(leg.path, flight.dist)
  flight.position = position
  flight.heading = leg.reverse ? scale(direction, -1) : direction
  flight.altitude = leg.altitude ? leg.altitude(flight.dist) : 0
}

function startLegs(flight: Flight, phase: Phase, next: Leg[]) {
  flight.phase = phase
  flight.legs = next
  flight.dist = 0
  place(flight)
}

const freeGates = (traffic: AirportTraffic) =>
  traffic.gates.flatMap((id, gate) => (id ? [] : [gate]))

export function createTraffic(random: () => number, options: TrafficOptions = {}): AirportTraffic {
  const traffic: AirportTraffic = {
    flights: [],
    gates: GATES.map(() => 0),
    nextId: 1,
    arrivalTimer: 2,
    arrivals: 0,
    departures: 0,
    departed: [],
  }
  const [min, max] = TURNAROUND
  const free = freeGates(traffic)
  for (let i = 0; i < (options.parked ?? 5) && free.length; i++) {
    const gate = free.splice(Math.floor(random() * free.length), 1)[0]
    const flight = newFlight(traffic, gate, random)
    flight.phase = 'atGate'
    // spread the departures, so they don't all push back at once
    flight.timer = 3 + i * 9 + random() * 6
    if (flight.timer > max) flight.timer = min + random() * (max - min)
    traffic.flights.push(flight)
  }
  return traffic
}

/** Start a new arrival on the approach to a free gate */
export function spawnArrival(traffic: AirportTraffic, random: () => number): Flight | undefined {
  const free = freeGates(traffic)
  if (!free.length) return undefined
  const flight = newFlight(traffic, pick(free, random), random)
  flight.speed = APPROACH_SPEED
  startLegs(flight, 'approach', [legs.approach(), legs.landing(), legs.taxiIn(flight.gate)])
  traffic.flights.push(flight)
  return flight
}

/** The arrivals runway is free for the next approach once the plane before has rolled out far enough */
export const arrivalRunwayFree = (traffic: AirportTraffic) =>
  traffic.flights.every((f) => f.phase !== 'approach' && !(f.phase === 'landing' && f.dist < 14))

/** The departures runway is free when the plane before is well up in the air */
export const departureRunwayFree = (traffic: AirportTraffic) =>
  traffic.flights.every((f) => f.phase !== 'lineup' && !(f.phase === 'takeoff' && f.altitude < 40))

const onGround = (f: Flight) => f.altitude <= 0 && f.phase !== 'approach'

/** No plane is moving close to where a pushback would go */
export function pushbackClear(traffic: AirportTraffic, flight: Flight): boolean {
  const gate = GATES[flight.gate]
  return traffic.flights.every(
    (o) =>
      o === flight ||
      !onGround(o) ||
      o.phase === 'atGate' ||
      (distance(o.position, gate.pushEnd) > 2.8 && distance(o.position, gate.junction) > 2.2),
  )
}

/** The planes too close ahead of a taxiing plane */
export function blockersOf(flight: Flight, flights: Flight[]): Flight[] {
  const leg = flight.legs[0]
  if (!leg?.separation || flight.phase === 'atGate' || flight.phase === 'holding') return []
  const motion = leg.reverse ? scale(flight.heading, -1) : flight.heading
  const isAhead = (p: Vec) => {
    const d = sub(p, flight.position)
    const ahead = dot(d, motion)
    return ahead > 0 && ahead < SEPARATION && Math.abs(cross(motion, d)) < 0.9
  }
  return flights.filter((o) => {
    if (o === flight || !onGround(o)) return false
    if (isAhead(o.position)) return true
    // a plane pushing back also claims the spot where it is going
    const pushing = o.phase === 'pushback' && o.legs[0]
    return !!pushing && isAhead(pointAt(pushing.path, pushing.path.total).position)
  })
}

/** Move a flight along its leg. Returns true when the leg is complete. */
function move(flight: Flight, deltaSeconds: number, blocked: boolean): boolean {
  const leg = flight.legs[0]
  const remaining = leg.path.total - flight.dist
  let target = blocked ? 0 : leg.speed
  // brake in time for the end of the leg
  if (leg.stop) target = Math.min(target, Math.sqrt(2 * 0.8 * remaining) + 0.05)
  if (blocked) flight.speed = 0
  else {
    const step = leg.accel * deltaSeconds
    flight.speed += Math.max(-step, Math.min(step, target - flight.speed))
  }
  flight.dist = Math.min(leg.path.total, flight.dist + flight.speed * deltaSeconds)
  place(flight)
  return flight.dist >= leg.path.total - 1e-6
}

/** What happens when a flight reaches the end of a leg */
function completeLeg(traffic: AirportTraffic, flight: Flight, random: () => number) {
  const [done, ...rest] = flight.legs
  if (rest.length) {
    flight.legs = rest
    flight.phase = rest[0].phase
    flight.dist = 0
    place(flight)
    return
  }
  switch (done.phase) {
    case 'taxiIn': {
      flight.phase = 'atGate'
      flight.speed = 0
      const [min, max] = TURNAROUND
      flight.timer = min + random() * (max - min)
      traffic.arrivals++
      return
    }
    case 'pushback':
      // the gate is free for the next arrival once the plane is out
      traffic.gates[flight.gate] = 0
      startLegs(flight, 'taxiOut', [legs.taxiOut(flight.gate)])
      return
    case 'taxiOut':
      flight.phase = 'holding'
      flight.speed = 0
      return
    case 'lineup':
      flight.timer = LINEUP_WAIT
      flight.speed = 0
      return
    case 'takeoff':
      traffic.departures++
      traffic.flights.splice(traffic.flights.indexOf(flight), 1)
      traffic.departed.push(flight)
      return
  }
}

/**
 * Advance the whole airport by a time step: new arrivals, turnarounds, and every plane that is
 * not held up by the plane ahead.
 */
export function stepAirport(
  traffic: AirportTraffic,
  deltaSeconds: number,
  random: () => number,
  options: TrafficOptions = {},
): void {
  traffic.departed = []
  traffic.arrivalTimer -= deltaSeconds
  if (
    traffic.arrivalTimer <= 0 &&
    traffic.flights.length < (options.maxFlights ?? 14) &&
    arrivalRunwayFree(traffic)
  ) {
    if (spawnArrival(traffic, random)) traffic.arrivalTimer = 3 + random() * 6
  }

  // waiting flights: at the gate, at the holding point, lined up
  for (const flight of traffic.flights) {
    if (flight.phase === 'atGate') {
      flight.timer -= deltaSeconds
      if (flight.timer <= 0 && pushbackClear(traffic, flight)) {
        startLegs(flight, 'pushback', [legs.pushback(flight.gate)])
        flight.speed = 0
      }
    } else if (flight.phase === 'holding' && departureRunwayFree(traffic)) {
      startLegs(flight, 'lineup', [legs.lineup()])
    }
  }

  const moving = traffic.flights.filter(
    (f) =>
      f.phase !== 'atGate' &&
      f.phase !== 'holding' &&
      !(f.phase === 'lineup' && f.dist >= f.legs[0].path.total - 1e-6),
  )
  // decide first, then move, so the result doesn't depend on the order of the flights
  const blockers = new Map(moving.map((f) => [f, blockersOf(f, traffic.flights)]))
  // two planes that block each other: the one with the lower id goes
  const isBlocked = (f: Flight) =>
    !blockers.get(f)!.every((o) => f.id < o.id && (blockers.get(o) ?? []).includes(f))

  for (const flight of moving) {
    const blocked = isBlocked(flight)
    flight.waited = blocked ? flight.waited + deltaSeconds : 0
    if (move(flight, deltaSeconds, blocked)) completeLeg(traffic, flight, random)
  }

  // lined up and ready
  for (const flight of [...traffic.flights]) {
    if (flight.phase !== 'lineup' || flight.dist < flight.legs[0].path.total - 1e-6) continue
    flight.timer -= deltaSeconds
    if (flight.timer <= 0) startLegs(flight, 'takeoff', [legs.takeoff()])
  }
}

/** A short status for the flight board */
export function flightStatus(flight: Flight): string {
  const gate = GATES[flight.gate].name
  switch (flight.phase) {
    case 'approach':
      return 'On approach'
    case 'landing':
      return 'Landed'
    case 'taxiIn':
      return `Taxiing to ${gate}`
    case 'atGate':
      return flight.timer < 15 ? `Final call ${gate}` : `Boarding ${gate}`
    case 'pushback':
      return 'Pushback'
    case 'taxiOut':
      return 'Taxiing'
    case 'holding':
      return 'Holding short'
    case 'lineup':
      return 'Lined up'
    case 'takeoff':
      return 'Departed'
  }
}

/** Arriving flights show where they come from, the others where they go */
export const isArriving = (flight: Flight) =>
  flight.phase === 'approach' || flight.phase === 'landing' || flight.phase === 'taxiIn'
