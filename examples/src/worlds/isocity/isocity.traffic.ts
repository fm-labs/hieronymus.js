/**
 * Traffic rules for the 'isocity' world.
 * Pure functions without engine dependencies, so they can be unit tested.
 *
 * Vehicles drive from cell center to cell center along the roads, on the right-hand lane.
 * Positions are continuous grid coordinates: the center of cell (col, row) is (col + 0.5, row + 0.5).
 */

export type Direction = 'N' | 'E' | 'S' | 'W'

export type GridPoint = { col: number; row: number }

export type Vehicle = {
  id: number
  kind: 'car' | 'bus'
  color: string
  /** The cell the vehicle comes from */
  col: number
  row: number
  /** Heading towards the neighbor cell in this direction */
  direction: Direction
  /** The direction before the last turn, used to change lanes smoothly */
  previousDirection: Direction
  /** 0 at the center of the current cell, 1 at the center of the next one */
  progress: number
  /** Cells per second */
  speed: number
}

/** Tells whether a cell is road. Cells outside the map must return false. */
export type RoadMap = (col: number, row: number) => boolean

export const DIRECTIONS: Direction[] = ['N', 'E', 'S', 'W']

export const DIRECTION_VECTORS: Record<Direction, GridPoint> = {
  N: { col: 0, row: -1 },
  E: { col: 1, row: 0 },
  S: { col: 0, row: 1 },
  W: { col: -1, row: 0 },
}

export const OPPOSITE: Record<Direction, Direction> = { N: 'S', E: 'W', S: 'N', W: 'E' }

/** How far the lane is from the middle of the road, in cells */
export const LANE_OFFSET = 0.18
/** Vehicles keep at least this distance (in cells) to the vehicle ahead in the same lane */
export const SAFE_DISTANCE = 0.75

export function roadDirections(isRoad: RoadMap, col: number, row: number): Direction[] {
  return DIRECTIONS.filter((d) =>
    isRoad(col + DIRECTION_VECTORS[d].col, row + DIRECTION_VECTORS[d].row),
  )
}

/**
 * Where to go from a cell when arriving in `direction`: any connected road except turning back.
 * Turns back only at a dead end.
 */
export function chooseDirection(
  isRoad: RoadMap,
  col: number,
  row: number,
  direction: Direction,
  random: () => number,
): Direction {
  const options = roadDirections(isRoad, col, row).filter((d) => d !== OPPOSITE[direction])
  if (options.length === 0) return OPPOSITE[direction]
  return options[Math.floor(random() * options.length)]
}

/** The right-hand side of a direction, as a grid vector */
const rightOf = (direction: Direction): GridPoint => {
  const v = DIRECTION_VECTORS[direction]
  return { col: -v.row, row: v.col }
}

/** The current position of a vehicle, in continuous grid coordinates */
export function vehiclePosition(vehicle: Vehicle): GridPoint {
  const v = DIRECTION_VECTORS[vehicle.direction]
  // after a turn, move over to the new lane during the first half of the cell
  const blend = Math.min(1, vehicle.progress * 2)
  const before = rightOf(vehicle.previousDirection)
  const after = rightOf(vehicle.direction)
  const lane = {
    col: before.col + (after.col - before.col) * blend,
    row: before.row + (after.row - before.row) * blend,
  }
  return {
    col: vehicle.col + 0.5 + v.col * vehicle.progress + lane.col * LANE_OFFSET,
    row: vehicle.row + 0.5 + v.row * vehicle.progress + lane.row * LANE_OFFSET,
  }
}

/** Whether another vehicle in the same lane is too close ahead */
/**
 * The vehicles too close ahead in the same lane.
 * Oncoming vehicles never block, even while one of them is still changing lanes after a U-turn.
 */
export function blockersOf(vehicle: Vehicle, others: Vehicle[]): Vehicle[] {
  const position = vehiclePosition(vehicle)
  const v = DIRECTION_VECTORS[vehicle.direction]
  return others.filter((other) => {
    if (other.id === vehicle.id || other.direction === OPPOSITE[vehicle.direction]) return false
    const p = vehiclePosition(other)
    const dCol = p.col - position.col
    const dRow = p.row - position.row
    const ahead = dCol * v.col + dRow * v.row
    const sideways = Math.abs(dCol * v.row - dRow * v.col)
    return ahead > 0 && ahead < SAFE_DISTANCE && sideways < LANE_OFFSET
  })
}

/** Whether another vehicle in the same lane is too close ahead */
export function isBlocked(vehicle: Vehicle, others: Vehicle[]): boolean {
  return blockersOf(vehicle, others).length > 0
}

/** Move a vehicle along the road. Mutates and returns the vehicle. */
export function stepVehicle(
  vehicle: Vehicle,
  isRoad: RoadMap,
  deltaSeconds: number,
  random: () => number,
): Vehicle {
  vehicle.progress += vehicle.speed * deltaSeconds
  while (vehicle.progress >= 1) {
    // arrived at the center of the next cell
    const v = DIRECTION_VECTORS[vehicle.direction]
    vehicle.col += v.col
    vehicle.row += v.row
    vehicle.progress -= 1
    vehicle.previousDirection = vehicle.direction
    vehicle.direction = chooseDirection(isRoad, vehicle.col, vehicle.row, vehicle.direction, random)
  }
  return vehicle
}

/** Move all vehicles that are not blocked by a vehicle ahead */
export function stepTraffic(
  vehicles: Vehicle[],
  isRoad: RoadMap,
  deltaSeconds: number,
  random: () => number,
): void {
  // decide first, then move, so the result doesn't depend on the order of the vehicles
  const blockers = new Map(vehicles.map((vehicle) => [vehicle, blockersOf(vehicle, vehicles)]))
  // two vehicles crossing at a junction can block each other: then the one with the lower id goes
  const moving = vehicles.filter((vehicle) =>
    blockers
      .get(vehicle)!
      .every((other) => vehicle.id < other.id && blockers.get(other)!.includes(vehicle)),
  )
  moving.forEach((vehicle) => stepVehicle(vehicle, isRoad, deltaSeconds, random))
}

/** Create a vehicle on a road cell, heading towards one of the connected roads */
export function createVehicle(
  id: number,
  isRoad: RoadMap,
  col: number,
  row: number,
  random: () => number,
  props: Pick<Vehicle, 'kind' | 'color' | 'speed'>,
): Vehicle {
  const options = roadDirections(isRoad, col, row)
  const direction = options.length ? options[Math.floor(random() * options.length)] : 'E'
  return { id, col, row, direction, previousDirection: direction, progress: 0, ...props }
}
