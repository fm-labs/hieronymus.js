export function calculateWaypoints(p1: Point2D, p2: Point2D): Point2D[] {
  const waypoints: Point2D[] = []
  waypoints.push(p1)

  // If already aligned horizontally or vertically, no direction change needed
  if (p1.x === p2.x || p1.y === p2.y) {
    return waypoints
  }

  // Move horizontally first, then vertically (you can reverse this if preferred)
  waypoints.push({ x: p2.x, y: p1.y })

  waypoints.push(p2)
  return waypoints
}

export function calculateIsoWaypoints(A: Point2D, B: Point2D): Point2D[] {
  const dx = B.x - A.x
  const dy = B.y - A.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  const waypoints: Point2D[] = []
  waypoints.push(A)

  let turnPoint: Point2D | null = null
  let line1: Point2D | null = null
  let line2: Point2D | null = null
  if (dx < 0 && dy > 0) {
    console.log('Find waypoint SW')
    line1 = pointAtAngle(A, 153.4, distance * 2)
    line2 = pointAtAngle(B, -153.4, distance * 2)
  } else if (dx > 0 && dy > 0) {
    console.log('Find waypoint SE')
    line1 = pointAtAngle(A, 26.56, distance * 2)
    line2 = pointAtAngle(B, -26.56, distance * 2)
  } else if (dx > 0 && dy < 0) {
    console.log('Find waypoint NE')
    line1 = pointAtAngle(A, -26.56, distance * 2)
    line2 = pointAtAngle(B, 26.56, distance * 2)
  } else if (dx < 0 && dy < 0) {
    console.log('Find waypoint NW')
    line1 = pointAtAngle(A, -153.4, distance * 2)
    line2 = pointAtAngle(B, -153.4 - 90, distance * 2)
  } else {
    // do not turn, just go straight
  }
  if (line1 !== null && line2 !== null) {
    //waypoints.push(line1)
    //waypoints.push(line2)
    turnPoint = getLineIntersection(A, line1, B, line2)
  }
  if (turnPoint !== null) {
    waypoints.push(turnPoint)
  }

  waypoints.push(B)
  return waypoints
}

export function getDirection(A: Point2D, B: Point2D): MoveDirection | undefined {
  const dx = B.x - A.x
  const dy = B.y - A.y

  if (dx < 0 && dy > 0) {
    return 'down'
  } else if (dx > 0 && dy > 0) {
    return 'right'
  } else if (dx > 0 && dy < 0) {
    return 'up'
  } else if (dx < 0 && dy < 0) {
    return 'left'
  } else {
    //console.warn('Invalid direction: points are aligned or identical', dx, dy)
    //throw new Error('Invalid direction: points are aligned or identical')
    return undefined
  }
}

/**
 * Given two points A and B, returns two possible points C such that
 * triangle ACB has a right angle at C.
 */

function findRightAnglePoints(A: Point2D, B: Point2D): [Point2D, Point2D] {
  const dx = B.x - A.x
  const dy = B.y - A.y

  // Rotate AB by ±90° in top-down canvas
  const C1: Point2D = {
    x: A.x + dy, // clockwise
    y: A.y - dx,
  }

  const C2: Point2D = {
    x: A.x - dy, // counterclockwise
    y: A.y + dx,
  }

  return [C1, C2]
}

/**
 * Given two points A and B (in top-down canvas),
 * returns two points C such that triangle ABC has a right angle at A.
 */
function findRightAngleAtA(A: Point2D, B: Point2D): [Point2D, Point2D] {
  const dx = B.x - A.x
  const dy = B.y - A.y

  // Get perpendicular vectors to AB
  const C1: Point2D = {
    x: A.x + dy,
    y: A.y - dx,
  }

  const C2: Point2D = {
    x: A.x - dy,
    y: A.y + dx,
  }

  return [C1, C2]
}

/**
 * Given two points A and B (in top-down canvas),
 * returns two points C such that triangle A–B–C has a right angle at C.
 */
function findRightAngleAtC(A: Point2D, B: Point2D): [Point2D, Point2D] {
  const midX = (A.x + B.x) / 2
  const midY = (A.y + B.y) / 2

  const dx = B.x - A.x
  const dy = B.y - A.y

  // Half-length vector from A to B
  const halfDx = dx / 2
  const halfDy = dy / 2

  // Perpendicular vectors to AB
  const perp1: Point2D = {
    x: midX + halfDy,
    y: midY - halfDx,
  }

  const perp2: Point2D = {
    x: midX - halfDy,
    y: midY + halfDx,
  }

  return [perp1, perp2]
}

/**
 * Given a point, angle (in degrees), and length,
 * returns the second point along that angle and distance.
 */
function pointAtAngle(origin: Point2D, angleDeg: number, length: number): Point2D {
  const angleRad = (angleDeg * Math.PI) / 180

  const x = origin.x + length * Math.cos(angleRad)
  const y = origin.y + length * Math.sin(angleRad) // +sin because Y grows down in canvas

  return { x, y }
}

/**
 * Returns the intersection point of two infinite lines (A-B and C-D),
 * or null if lines are parallel.
 */
function getLineIntersection(A: Point2D, B: Point2D, C: Point2D, D: Point2D): Point2D | null {
  const a1 = B.y - A.y
  const b1 = A.x - B.x
  const c1 = a1 * A.x + b1 * A.y

  const a2 = D.y - C.y
  const b2 = C.x - D.x
  const c2 = a2 * C.x + b2 * C.y

  const determinant = a1 * b2 - a2 * b1

  if (determinant === 0) {
    // Lines are parallel (or coincident)
    return null
  }

  const x = (b2 * c1 - b1 * c2) / determinant
  const y = (a1 * c2 - a2 * c1) / determinant

  return { x, y }
}
