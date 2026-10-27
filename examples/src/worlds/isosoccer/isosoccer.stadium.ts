/**
 * The stadium around the pitch, as a function of the grid cell. Pure logic, no engine imports.
 * The pitch starts at cell (MARGIN, MARGIN); pitch position (x, y) is grid (MARGIN + x, MARGIN + y).
 */
import { GOAL_DEPTH, GOAL_Y0, GOAL_Y1, PITCH_LENGTH, PITCH_WIDTH } from './isosoccer.match.ts'

/** Grass apron, ad boards, and two rows of stands */
export const MARGIN = 5
export const MAP_COLUMNS = PITCH_LENGTH + MARGIN * 2
export const MAP_ROWS = PITCH_WIDTH + MARGIN * 2

export type CellKind =
  | 'pitch'
  | 'apron'
  | 'boards'
  | 'stand'
  | 'concourse'
  | 'dugout'
  | 'floodlight'
  | 'goal'

/**
 * Stands are only on the back sides (small cols / rows): on the front sides they would hide the pitch.
 * The front sides get a concourse with the dugouts.
 */
export function cellKind(col: number, row: number): CellKind {
  const x = col - MARGIN
  const y = row - MARGIN
  if (x >= 0 && x < PITCH_LENGTH && y >= 0 && y < PITCH_WIDTH) return 'pitch'
  // how far outside the pitch, in cells
  const dx = x < 0 ? -x : x - PITCH_LENGTH + 1
  const dy = y < 0 ? -y : y - PITCH_WIDTH + 1
  const d = Math.max(dx, dy)
  const back = col < 2 || row < 2
  const corner = (col === 0 || col === MAP_COLUMNS - 1) && (row === 0 || row === MAP_ROWS - 1)
  if (corner && !(col === MAP_COLUMNS - 1 && row === MAP_ROWS - 1)) return 'floodlight'
  if (isGoalCell(col, row)) return 'goal'
  if (d <= 2) return 'apron'
  if (d === 3) return 'boards'
  if (back) return 'stand'
  const half = Math.floor(PITCH_LENGTH / 2)
  // the dugouts on the front touchline, either side of the halfway line
  if (
    row === MAP_ROWS - 2 &&
    (x === half - 4 || x === half - 3 || x === half + 3 || x === half + 4)
  ) {
    return 'dugout'
  }
  return 'concourse'
}

/** The cells behind the goal lines that hold the goals */
export function isGoalCell(col: number, row: number) {
  const x = col - MARGIN
  const y = row - MARGIN
  if (y < GOAL_Y0 || y >= GOAL_Y1) return false
  return (x < 0 && x >= -GOAL_DEPTH) || (x >= PITCH_LENGTH && x < PITCH_LENGTH + GOAL_DEPTH)
}

/** How many rows of stand are between the cell and the boards (0 = front row) */
export function standTier(col: number, row: number) {
  return col < 2 && row >= 2 ? 1 - col : row < 2 && col >= 2 ? 1 - row : 1
}
