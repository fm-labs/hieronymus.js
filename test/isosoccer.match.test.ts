import { describe, expect, it } from 'vitest'
import { createRandom } from '../examples/src/worlds/isoislands/isoislands.generator'
import {
  createMatch,
  GOAL_Y0,
  GOAL_Y1,
  MATCH_SECONDS,
  PITCH_LENGTH,
  PITCH_WIDTH,
  stepMatch,
  type Match,
} from '../examples/src/worlds/isosoccer/isosoccer.match'
import { cellKind, MAP_COLUMNS, MAP_ROWS } from '../examples/src/worlds/isosoccer/isosoccer.stadium'

const DT = 1 / 60

/** Play a whole match headless and collect what happened */
const simulate = (seed: number) => {
  const random = createRandom(seed)
  const match = createMatch()
  let longestStill = 0
  let still = 0
  let goals = 0
  let previous: Match['phase'] = match.phase
  let maxOut = 0
  // the clock stops for goals and kickoffs
  for (let t = 0; t < MATCH_SECONDS * 2 && match.phase !== 'fulltime'; t += DT) {
    stepMatch(match, DT, random)
    const { ball } = match
    if (match.phase !== previous) {
      if (match.phase === 'goal') goals++
      previous = match.phase
    }
    // a loose ball nobody goes for
    const moving = Math.hypot(ball.vx, ball.vy) > 0.05
    still = match.phase === 'play' && ball.owner === null && !moving ? still + DT : 0
    longestStill = Math.max(longestStill, still)
    for (const v of [ball.x, ball.y, ball.z]) expect(Number.isFinite(v)).toBe(true)
    maxOut = Math.max(maxOut, -ball.x, ball.x - PITCH_LENGTH, -ball.y, ball.y - PITCH_WIDTH)
  }
  return { match, goals, longestStill, maxOut }
}

describe('isosoccer match', () => {
  it('starts with 11 players a side, everyone in the own half', () => {
    const match = createMatch()
    expect(match.players).toHaveLength(22)
    for (const p of match.players) {
      if (p.team === 0) expect(p.x).toBeLessThanOrEqual(PITCH_LENGTH / 2)
      else expect(p.x).toBeGreaterThanOrEqual(PITCH_LENGTH / 2)
    }
  })

  it.each([1, 2, 3, 4])('plays a whole match with goals (seed %i)', (seed) => {
    const { match, goals, longestStill, maxOut } = simulate(seed)
    expect(match.phase).toBe('fulltime')
    expect(match.score[0] + match.score[1]).toBe(goals)
    expect(goals).toBeGreaterThan(0)
    expect(goals).toBeLessThan(25)
    // a loose ball is always picked up soon
    expect(longestStill).toBeLessThan(3)
    // the ball never ends up far off the pitch
    expect(maxOut).toBeLessThan(3)
  })
})

describe('isosoccer rules', () => {
  /** A match in play with the ball moving freely from a spot */
  const inPlay = (x: number, y: number, vx: number, vy: number, lastTouch: 0 | 1) => {
    const match = createMatch()
    match.phase = 'play'
    // everyone far away, so nobody touches the ball
    for (const p of match.players) Object.assign(p, { x: PITCH_LENGTH / 2, y: -1.5, cooldown: 99 })
    Object.assign(match.ball, { x, y, z: 0, vx, vy, vz: 0, owner: null, lastTouch })
    return match
  }
  const run = (match: Match, seconds: number) => {
    for (let t = 0; t < seconds; t += DT) stepMatch(match, DT, () => 0.5)
  }

  it('gives a throw-in to the other team', () => {
    const match = inPlay(10, 2, 0, -8, 0)
    run(match, 0.5)
    expect(match.phase).toBe('restart')
    expect(match.restartKind).toBe('throw-in')
    expect(match.restartTeam).toBe(1)
  })

  it('scores a ball in the net, and the other team kicks off', () => {
    const match = inPlay(PITCH_LENGTH - 2, (GOAL_Y0 + GOAL_Y1) / 2, 10, 0, 0)
    run(match, 0.5)
    expect(match.score).toEqual([1, 0])
    expect(match.phase).toBe('goal')
    run(match, 3.1)
    expect(match.phase).toBe('kickoff')
    expect(match.restartTeam).toBe(1)
  })

  it('gives a corner or a goal kick for a ball over the goal line', () => {
    const corner = inPlay(2, 3, -8, 0, 0)
    run(corner, 0.5)
    expect(corner.restartKind).toBe('corner')
    expect(corner.restartTeam).toBe(1)
    const goalKick = inPlay(2, 3, -8, 0, 1)
    run(goalKick, 0.5)
    expect(goalKick.restartKind).toBe('goal kick')
    expect(goalKick.restartTeam).toBe(0)
  })
})

describe('isosoccer stadium', () => {
  it('has the pitch in the middle and stands only on the back sides', () => {
    expect(cellKind(MAP_COLUMNS - 1, 0)).not.toBe('pitch')
    let pitch = 0
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLUMNS; col++) {
        const kind = cellKind(col, row)
        if (kind === 'pitch') pitch++
        // nothing tall in front of the pitch, it would hide the players
        if (kind === 'stand') expect(col < 3 || row < 3).toBe(true)
      }
    }
    expect(pitch).toBe(PITCH_LENGTH * PITCH_WIDTH)
  })
})
