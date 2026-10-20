/**
 * The soccer match: pitch geometry, players, ball physics and a simple team AI.
 * Pure logic, no engine imports. Positions are in pitch cells: x along the length (0 = the home goal),
 * y across (0 = the far touchline), z is the height of the ball above the grass.
 */

export const PITCH_LENGTH = 33
export const PITCH_WIDTH = 21
/** The goal mouth, across the pitch */
export const GOAL_Y0 = 9
export const GOAL_Y1 = 12
export const GOAL_DEPTH = 1
export const CROSSBAR = 0.8

/** Real seconds for 90 minutes */
export const MATCH_SECONDS = 240

const PLAYER_SPEED = 3.2
const DRIBBLE_SPEED = 3
const PASS_SPEED = 12
const SHOT_SPEED = 14
const GRAVITY = 14
/** Rolling resistance, per second */
const FRICTION = 0.6
const CONTROL_RADIUS = 0.45
const TACKLE_RADIUS = 0.6

export type Team = 0 | 1
export type Role = 'GK' | 'DF' | 'MF' | 'FW'
export type Vec = { x: number; y: number }

export type Player = {
  id: number
  team: Team
  number: number
  role: Role
  /** Formation position when the team attacks towards +x (team 0); mirrored for team 1 */
  home: Vec
  x: number
  y: number
  vx: number
  vy: number
  /** Unit vector the player looks at */
  facing: Vec
  /** Seconds until the player may touch the ball again (after a kick or losing it) */
  cooldown: number
  /** Distance run, drives the leg animation */
  stride: number
}

export type Ball = {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  owner: number | null
  lastTouch: Team
}

export type Phase = 'kickoff' | 'play' | 'restart' | 'goal' | 'fulltime'
export type Restart = 'throw-in' | 'corner' | 'goal kick' | 'kickoff'

export type Match = {
  players: Player[]
  ball: Ball
  score: [number, number]
  /** Real seconds played */
  clock: number
  phase: Phase
  /** Seconds in the current phase */
  phaseTime: number
  /** Who takes the next kickoff or restart */
  restartTeam: Team
  restartKind: Restart
  restartTaker: number | null
  restartSpot: Vec
  /** Seconds the current owner has had the ball */
  holdTime: number
  /** The teammate a loose ball was passed to */
  receiver: number | null
  /** Per team */
  stats: {
    shots: [number, number]
    passes: [number, number]
    completed: [number, number]
    tackles: [number, number]
  }
  /** Short messages for the HUD, newest last */
  log: string[]
}

/** What the player at the keyboard does with the controlled player */
export type Control = {
  playerId: number
  move: Vec
  action: 'pass' | 'shoot' | null
}

export const TEAM_NAMES: [string, string] = ['Iso United', 'Grid City']

// 4-4-2, for the team attacking towards +x
const FORMATION: Array<[Role, number, number, number]> = [
  ['GK', 1, 1, 10.5],
  ['DF', 2, 6, 3],
  ['DF', 4, 5, 8.5],
  ['DF', 5, 5, 12.5],
  ['DF', 3, 6, 18],
  ['MF', 7, 12, 3.5],
  ['MF', 6, 11, 8.5],
  ['MF', 8, 11, 12.5],
  ['MF', 11, 12, 17.5],
  ['FW', 9, 15.5, 8.5],
  ['FW', 10, 15.5, 12.5],
]

const len = (x: number, y: number) => Math.sqrt(x * x + y * y)
const dist = (a: Vec, b: Vec) => len(a.x - b.x, a.y - b.y)
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

/** +1 if the team attacks towards +x */
export const attackDir = (team: Team) => (team === 0 ? 1 : -1)
export const goalCenter = (attackingTeam: Team): Vec => ({
  x: attackingTeam === 0 ? PITCH_LENGTH : 0,
  y: (GOAL_Y0 + GOAL_Y1) / 2,
})

/** The formation spot of a player, on the side of its team */
export const homeSpot = (p: Player): Vec => ({
  x: p.team === 0 ? p.home.x : PITCH_LENGTH - p.home.x,
  y: p.team === 0 ? p.home.y : PITCH_WIDTH - p.home.y,
})

export function createMatch(): Match {
  const players: Player[] = []
  for (const team of [0, 1] as Team[]) {
    for (const [role, number, x, y] of FORMATION) {
      const p: Player = {
        id: players.length,
        team,
        number,
        role,
        home: { x, y },
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        facing: { x: attackDir(team), y: 0 },
        cooldown: 0,
        stride: 0,
      }
      Object.assign(p, kickoffSpot(p, 0))
      players.push(p)
    }
  }
  const match: Match = {
    players,
    ball: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, owner: null, lastTouch: 0 },
    score: [0, 0],
    clock: 0,
    phase: 'kickoff',
    phaseTime: 0,
    restartTeam: 0,
    restartKind: 'kickoff',
    restartTaker: null,
    restartSpot: { x: PITCH_LENGTH / 2, y: PITCH_WIDTH / 2 },
    holdTime: 0,
    receiver: null,
    stats: { shots: [0, 0], passes: [0, 0], completed: [0, 0], tackles: [0, 0] },
    log: [],
  }
  startKickoff(match, 0)
  return match
}

/** Where a player stands at a kickoff: its formation spot, pulled back into its own half */
export function kickoffSpot(p: Player, kickoffTeam: Team): Vec {
  const home = homeSpot(p)
  const half = PITCH_LENGTH / 2
  // every player in its own half, the kicking-off strikers right at the ball
  // the other team keeps its distance from the ball
  const gap = p.team === kickoffTeam ? 1 : 3
  let x =
    p.team === 0
      ? Math.min(home.x * 0.85, half - gap)
      : Math.max(half + (home.x - half) * 0.85, half + gap)
  let y = home.y
  if (p.team === kickoffTeam && p.role === 'FW') {
    x = half - attackDir(p.team) * 0.4
    y = PITCH_WIDTH / 2 + (p.number === 9 ? -0.6 : 0.6)
  }
  return { x, y }
}

function startKickoff(match: Match, team: Team) {
  match.phase = 'kickoff'
  match.phaseTime = 0
  match.restartTeam = team
  match.restartKind = 'kickoff'
  match.restartSpot = { x: PITCH_LENGTH / 2, y: PITCH_WIDTH / 2 }
  match.restartTaker = match.players.find((p) => p.team === team && p.number === 9)!.id
  placeBall(match, match.restartSpot)
}

function placeBall(match: Match, spot: Vec) {
  match.receiver = null
  Object.assign(match.ball, { x: spot.x, y: spot.y, z: 0, vx: 0, vy: 0, vz: 0, owner: null })
}

function startRestart(match: Match, kind: Restart, team: Team, spot: Vec) {
  match.phase = 'restart'
  match.phaseTime = 0
  match.restartKind = kind
  match.restartTeam = team
  match.restartSpot = spot
  placeBall(match, spot)
  const candidates = match.players.filter(
    (p) => p.team === team && (kind === 'goal kick' ? p.role === 'GK' : p.role !== 'GK'),
  )
  candidates.sort((a, b) => dist(a, spot) - dist(b, spot))
  match.restartTaker = candidates[0].id
}

function say(match: Match, text: string) {
  const minute = Math.min(90, Math.floor((match.clock / MATCH_SECONDS) * 90) + 1)
  match.log.push(`${minute}' ${text}`)
  if (match.log.length > 6) match.log.shift()
}

export const matchMinute = (match: Match) =>
  Math.min(90, Math.floor((match.clock / MATCH_SECONDS) * 90))

/** Advance the match by `dt` seconds */
export function stepMatch(
  match: Match,
  dt: number,
  random: () => number,
  control?: Control | null,
) {
  if (dt <= 0) return
  match.phaseTime += dt
  if (match.phase === 'play' || match.phase === 'restart') match.clock += dt

  for (const p of match.players) p.cooldown = Math.max(0, p.cooldown - dt)

  switch (match.phase) {
    case 'fulltime':
      movePlayers(match, dt, (p) => homeSpot(p), null)
      // a new match after a while
      if (match.phaseTime > 10) Object.assign(match, createMatch())
      return
    case 'goal':
      movePlayers(match, dt, (p) => kickoffSpot(p, match.restartTeam), null)
      stepBall(match, dt)
      // the ball rolls into the net and stops there
      clampBallInGoal(match)
      if (match.phaseTime > 3) startKickoff(match, match.restartTeam)
      return
    case 'kickoff':
    case 'restart':
      return stepSetPiece(match, dt, random)
    case 'play':
      if (match.clock >= MATCH_SECONDS) {
        match.phase = 'fulltime'
        match.phaseTime = 0
        say(match, `Full time, ${match.score[0]} : ${match.score[1]}`)
        return
      }
      return stepPlay(match, dt, random, control ?? null)
  }
}

/** Everyone walks to their place, then the taker plays the ball to a teammate */
function stepSetPiece(match: Match, dt: number, random: () => number) {
  const taker = match.players[match.restartTaker!]
  const spot = match.restartSpot
  const isKickoff = match.phase === 'kickoff'
  // the taker stands just behind the ball, looking upfield
  const behind = { x: spot.x - attackDir(taker.team) * 0.35, y: spot.y }
  movePlayers(
    match,
    dt,
    (p) => {
      if (p === taker) return behind
      if (isKickoff) return kickoffSpot(p, match.restartTeam)
      return supportSpot(match, p, spot)
    },
    null,
  )
  const ready = dist(taker, behind) < 0.3 || match.phaseTime > 4
  if (!ready || match.phaseTime < (isKickoff ? 1.5 : 0.8)) return
  // close enough or took too long: put it in place and play on
  Object.assign(taker, behind)
  match.ball.owner = taker.id
  match.ball.lastTouch = taker.team
  match.phase = 'play'
  match.phaseTime = 0
  match.holdTime = 0
  if (match.restartKind === 'goal kick') kickLong(match, taker, random)
  else if (match.restartKind === 'corner') cross(match, taker, random)
  else pass(match, taker, random, null, 12)
}

function stepPlay(match: Match, dt: number, random: () => number, control: Control | null) {
  const { ball, players } = match
  const owner = ball.owner === null ? null : players[ball.owner]
  match.holdTime = owner ? match.holdTime + dt : 0

  // who goes for the ball: the closest field player of each team to where the ball will be
  const lead = owner ? 0.2 : 0.4
  const target = { x: ball.x + ball.vx * lead, y: ball.y + ball.vy * lead }
  const chasers = new Set<number>()
  const receiver = !owner && match.receiver !== null ? players[match.receiver] : null
  if (receiver) chasers.add(receiver.id)
  for (const team of [0, 1] as Team[]) {
    if (owner && owner.team === team) continue
    // the receiver of a pass goes for it, its teammates keep their shape
    if (receiver && receiver.team === team) continue
    const mates = players.filter((p) => p.team === team && p.role !== 'GK')
    mates.sort((a, b) => dist(a, target) - dist(b, target))
    chasers.add(mates[0].id)
    // a second player closes down when the ball is in the own half
    const ownHalf = team === 0 ? ball.x < PITCH_LENGTH / 2 : ball.x > PITCH_LENGTH / 2
    if (owner && ownHalf) chasers.add(mates[1].id)
  }

  movePlayers(
    match,
    dt,
    (p) => {
      if (owner === p) return dribbleTarget(match, p)
      if (p.role === 'GK') return keeperSpot(match, p)
      if (p === receiver) return meetBall(match, p)
      if (chasers.has(p.id)) return target
      return supportSpot(match, p, ball)
    },
    control,
  )

  // the owner carries the ball just in front of the feet
  if (owner) {
    ball.x = owner.x + owner.facing.x * 0.3
    ball.y = owner.y + owner.facing.y * 0.3
    ball.z = 0
    ball.vx = owner.vx
    ball.vy = owner.vy
    ball.vz = 0
    tackles(match, owner, dt, random, control)
    if (ball.owner === owner.id) {
      if (control && control.playerId === owner.id) controlledKick(match, owner, random, control)
      else decide(match, owner, dt, random)
    }
  } else {
    stepBall(match, dt)
    pickUp(match)
  }

  checkBallOut(match)
}

/** Move every player towards its target; the controlled one follows the keyboard */
function movePlayers(
  match: Match,
  dt: number,
  targetOf: (p: Player) => Vec,
  control: Control | null,
) {
  const { players, ball } = match
  for (const p of players) {
    let vx: number
    let vy: number
    // defenders jog a bit slower than the dribbler, so a run can get past them
    const marking = ball.owner !== null && match.players[ball.owner].team !== p.team
    const speed =
      ball.owner === p.id ? DRIBBLE_SPEED : marking ? DRIBBLE_SPEED * 0.85 : PLAYER_SPEED
    if (control && control.playerId === p.id) {
      const l = len(control.move.x, control.move.y)
      vx = l > 0 ? (control.move.x / l) * speed * 1.1 : 0
      vy = l > 0 ? (control.move.y / l) * speed * 1.1 : 0
    } else {
      const t = targetOf(p)
      const dx = t.x - p.x
      const dy = t.y - p.y
      const d = len(dx, dy)
      // slow down when arriving, so players don't jitter around their spot
      const s = d < 0.05 ? 0 : speed * Math.min(1, d / 0.8)
      vx = d > 0 ? (dx / d) * s : 0
      vy = d > 0 ? (dy / d) * s : 0
    }
    // a bit of inertia
    const k = Math.min(1, dt * 8)
    p.vx += (vx - p.vx) * k
    p.vy += (vy - p.vy) * k
  }

  // keep a little room between players
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const a = players[i]
      const b = players[j]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const d = len(dx, dy)
      if (d > 0.45 || d === 0) continue
      const push = (0.45 - d) * 2
      a.vx -= (dx / d) * push
      a.vy -= (dy / d) * push
      b.vx += (dx / d) * push
      b.vy += (dy / d) * push
    }
  }

  for (const p of players) {
    p.x = clamp(p.x + p.vx * dt, -1.5, PITCH_LENGTH + 1.5)
    p.y = clamp(p.y + p.vy * dt, -1.5, PITCH_WIDTH + 1.5)
    const v = len(p.vx, p.vy)
    p.stride += v * dt
    if (v > 0.3) p.facing = { x: p.vx / v, y: p.vy / v }
    else if (ball.owner !== p.id) {
      // standing players watch the ball
      const d = dist(p, ball)
      if (d > 0.1) p.facing = { x: (ball.x - p.x) / d, y: (ball.y - p.y) / d }
    }
  }
}

/** Formation spot, moved with the ball, further up when the team has the ball */
function supportSpot(match: Match, p: Player, ball: Vec): Vec {
  const home = homeSpot(p)
  const owner = match.ball.owner === null ? null : match.players[match.ball.owner]
  const attacking = owner ? owner.team === p.team : false
  const push = attacking ? 3 : -1
  const x = home.x + (ball.x - PITCH_LENGTH / 2) * 0.55 + attackDir(p.team) * push
  const y = home.y + (ball.y - PITCH_WIDTH / 2) * 0.3
  return { x: clamp(x, 1, PITCH_LENGTH - 1), y: clamp(y, 0.5, PITCH_WIDTH - 0.5) }
}

function keeperSpot(match: Match, p: Player): Vec {
  const { ball } = match
  const lineX = p.team === 0 ? 0 : PITCH_LENGTH
  const fromLine = Math.abs(ball.x - lineX)
  const mid = (GOAL_Y0 + GOAL_Y1) / 2
  // rush out for a loose ball close to the goal
  if (ball.owner === null && fromLine < 4 && Math.abs(ball.y - mid) < 5) return ball
  // otherwise stay between the ball and the middle of the goal
  return {
    x: lineX + attackDir(p.team) * (0.6 + Math.min(1.5, fromLine * 0.08)),
    y: clamp(mid + (ball.y - mid) * 0.25, GOAL_Y0 + 0.3, GOAL_Y1 - 0.3),
  }
}

function dribbleTarget(match: Match, p: Player): Vec {
  const goal = goalCenter(p.team)
  // run upfield, and towards the middle when close to the goal
  const x = p.x + attackDir(p.team) * 3
  const toGoal = Math.abs(goal.x - p.x)
  const y = p.y + (goal.y - p.y) * (toGoal < 12 ? 0.5 : 0.15)
  // dodge the nearest opponent in front
  const opponent = nearestOpponent(match, p)
  let dodge = 0
  if (opponent && dist(opponent, p) < 2.5 && (opponent.x - p.x) * attackDir(p.team) > 0) {
    dodge = opponent.y > p.y ? -1.5 : 1.5
  }
  return { x: clamp(x, 0.5, PITCH_LENGTH - 0.5), y: clamp(y + dodge, 0.5, PITCH_WIDTH - 0.5) }
}

const nearestOpponent = (match: Match, p: Player) => {
  let best: Player | null = null
  for (const o of match.players) {
    if (o.team !== p.team && (!best || dist(o, p) < dist(best, p))) best = o
  }
  return best
}

/** The AI owner shoots, passes or keeps running */
function decide(match: Match, p: Player, dt: number, random: () => number) {
  if (match.holdTime < 0.4) return
  const goal = goalCenter(p.team)
  const toGoal = dist(p, goal)
  const opponent = nearestOpponent(match, p)
  const pressure = opponent ? dist(opponent, p) : 99

  if (p.role === 'GK') {
    if (match.holdTime > 0.8) kickLong(match, p, random)
    return
  }
  if (toGoal < 10 && random() < dt * (toGoal < 7 ? 3 : 0.5)) return shoot(match, p, random, null)
  if (pressure < 1.2 && random() < dt * 1.5) return pass(match, p, random, null, 14)
  if (random() < dt * 0.25) pass(match, p, random, null, 14)
}

/** The controlled owner kicks only on a key press */
function controlledKick(match: Match, p: Player, random: () => number, control: Control) {
  const moving = len(control.move.x, control.move.y) > 0 ? control.move : null
  if (control.action === 'shoot') shoot(match, p, random, moving)
  else if (control.action === 'pass') pass(match, p, random, moving, 16)
}

function kick(match: Match, p: Player, to: Vec, speed: number, lift: number) {
  const { ball } = match
  const dx = to.x - ball.x
  const dy = to.y - ball.y
  const d = len(dx, dy) || 1
  ball.vx = (dx / d) * speed
  ball.vy = (dy / d) * speed
  ball.vz = lift
  ball.z = 0.05
  ball.owner = null
  ball.lastTouch = p.team
  p.cooldown = 0.4
  match.holdTime = 0
  match.receiver = null
}

/** The point on the path of the ball closest to the player: wait there and let it come */
function meetBall(match: Match, p: Player): Vec {
  const { ball } = match
  const stop = ballStop(match)
  const abx = stop.x - ball.x
  const aby = stop.y - ball.y
  const t = clamp(
    ((p.x - ball.x) * abx + (p.y - ball.y) * aby) / (abx * abx + aby * aby || 1),
    0,
    1,
  )
  return { x: ball.x + abx * t, y: ball.y + aby * t }
}

/** Where a rolling ball comes to a stop (or lands, if in the air), but not further than a few cells */
function ballStop(match: Match): Vec {
  const { ball } = match
  const t =
    ball.z > 0
      ? Math.max(0, (ball.vz + Math.sqrt(ball.vz * ball.vz + 2 * GRAVITY * ball.z)) / GRAVITY)
      : 0
  const x = ball.x + ball.vx * t
  const y = ball.y + ball.vy * t
  // on the ground it rolls v / friction further
  return { x: x + ball.vx / FRICTION, y: y + ball.vy / FRICTION }
}

function shoot(match: Match, p: Player, random: () => number, aim: Vec | null) {
  const goal = goalCenter(p.team)
  // aim at a corner, steered by the keys if the shooter is controlled
  let y = GOAL_Y0 + 0.3 + random() * (GOAL_Y1 - GOAL_Y0 - 0.6)
  if (aim && Math.abs(aim.y) > 0.3) y = aim.y > 0 ? GOAL_Y1 - 0.3 : GOAL_Y0 + 0.3
  const miss = (random() - 0.5) * Math.min(4, dist(p, goal) * 0.35)
  match.stats.shots[p.team]++
  kick(
    match,
    p,
    { x: goal.x, y: y + miss },
    SHOT_SPEED * (0.85 + random() * 0.25),
    1 + random() * 3.5,
  )
  say(match, `${TEAM_NAMES[p.team]} #${p.number} shoots`)
}

/** Pass to the most useful teammate, or the one closest to the given direction */
function pass(
  match: Match,
  p: Player,
  random: () => number,
  direction: Vec | null,
  maxRange: number,
) {
  const opponents = match.players.filter((o) => o.team !== p.team)
  let best: Player | null = null
  let bestScore = -Infinity
  for (const m of match.players) {
    if (m.team !== p.team || m === p || m.role === 'GK') continue
    const d = dist(m, p)
    if (d < 3 || d > maxRange) continue
    const dx = (m.x - p.x) / d
    const dy = (m.y - p.y) / d
    // free of opponents near the line of the pass
    let open = 3
    for (const o of opponents) {
      open = Math.min(open, distToSegment(o, p, m))
    }
    // a pass through a crowd is a gift for the other team
    if (open < 0.8 && !direction) continue
    let score = (m.x - p.x) * attackDir(p.team) * 0.5 + open * 3 + random()
    if (direction) {
      const l = len(direction.x, direction.y)
      score += ((dx * direction.x + dy * direction.y) / l) * 8
    }
    if (score > bestScore) {
      bestScore = score
      best = m
    }
  }
  // nobody free: shoot if in range, otherwise keep the ball
  if (!best) {
    if (dist(p, goalCenter(p.team)) < 10 || direction) shoot(match, p, random, direction)
    return
  }
  const d = dist(best, p)
  const t = d / PASS_SPEED
  // pass into the run of the receiver
  // and not quite perfectly
  const error = (random() - 0.5) * d * 0.12
  const to = {
    x: best.x + best.vx * t - (error * (best.y - p.y)) / d,
    y: best.y + best.vy * t + (error * (best.x - p.x)) / d,
  }
  kick(match, p, to, Math.min(PASS_SPEED, 6 + d * 0.6), d > 10 ? 3.5 : 0.3)
  match.receiver = best.id
  match.stats.passes[p.team]++
}

function kickLong(match: Match, p: Player, random: () => number) {
  const to = {
    x: p.x + attackDir(p.team) * (12 + random() * 6),
    y: 3 + random() * (PITCH_WIDTH - 6),
  }
  kick(match, p, to, PASS_SPEED * 1.1, 6)
}

function cross(match: Match, p: Player, random: () => number) {
  const goal = goalCenter(p.team)
  const to = {
    x: goal.x - attackDir(p.team) * (3 + random() * 3),
    y: goal.y + (random() - 0.5) * 4,
  }
  kick(match, p, to, PASS_SPEED, 5)
}

function distToSegment(p: Vec, a: Vec, b: Vec) {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const t = clamp(((p.x - a.x) * abx + (p.y - a.y) * aby) / (abx * abx + aby * aby || 1), 0, 1)
  return len(p.x - (a.x + abx * t), p.y - (a.y + aby * t))
}

/** Opponents close to the owner try to win the ball */
function tackles(
  match: Match,
  owner: Player,
  dt: number,
  random: () => number,
  control: Control | null,
) {
  // a player who just got the ball has a moment to get away
  if (match.holdTime < 0.7) return
  for (const o of match.players) {
    if (o.team === owner.team || o.cooldown > 0) continue
    if (dist(o, owner) > TACKLE_RADIUS) continue
    // the player at the keyboard tackles harder when pressing a key
    const rate = control && control.playerId === o.id && control.action ? 6 : 0.7
    if (random() >= dt * rate) continue
    const { ball } = match
    ball.owner = null
    ball.lastTouch = o.team
    match.receiver = null
    match.stats.tackles[o.team]++
    // the ball pops loose
    const a = random() * Math.PI * 2
    ball.vx = Math.cos(a) * 2.5
    ball.vy = Math.sin(a) * 2.5
    owner.cooldown = 0.8
    o.cooldown = 0.15
    return
  }
}

function stepBall(match: Match, dt: number) {
  const { ball } = match
  ball.x += ball.vx * dt
  ball.y += ball.vy * dt
  if (ball.z > 0 || ball.vz > 0) {
    ball.vz -= GRAVITY * dt
    ball.z += ball.vz * dt
    if (ball.z <= 0) {
      ball.z = 0
      // bounce, and lose some pace on landing
      ball.vz = ball.vz < -2 ? -ball.vz * 0.45 : 0
      ball.vx *= 0.8
      ball.vy *= 0.8
    }
  } else {
    // rolling on the grass
    const f = Math.exp(-FRICTION * dt)
    ball.vx *= f
    ball.vy *= f
  }
}

/** A loose, low ball is taken by the closest player in reach */
function pickUp(match: Match) {
  const { ball } = match
  if (ball.z > 0.6) return
  let best: Player | null = null
  for (const p of match.players) {
    if (p.cooldown > 0) continue
    // keepers reach further and catch higher balls, but a hard shot is difficult to hold
    const fast = len(ball.vx, ball.vy) > 8
    const reach = p.role === 'GK' ? (fast ? 0.55 : 0.8) : CONTROL_RADIUS
    if (ball.z > 0.35 && p.role !== 'GK') continue
    if (dist(p, ball) < reach && (!best || dist(p, ball) < dist(best, ball))) best = p
  }
  if (!best) return
  if (match.receiver === best.id) match.stats.completed[best.team]++
  ball.owner = best.id
  ball.lastTouch = best.team
  match.holdTime = 0
  match.receiver = null
}

function checkBallOut(match: Match) {
  const { ball } = match
  if (ball.y < 0 || ball.y > PITCH_WIDTH) {
    const team: Team = ball.lastTouch === 0 ? 1 : 0
    return startRestart(match, 'throw-in', team, {
      x: clamp(ball.x, 0.5, PITCH_LENGTH - 0.5),
      y: clamp(ball.y, 0, PITCH_WIDTH),
    })
  }
  if (ball.x > 0 && ball.x < PITCH_LENGTH) return
  // over a goal line: team 0 attacks the goal at x = PITCH_LENGTH
  const attacking: Team = ball.x >= PITCH_LENGTH ? 0 : 1
  const defending: Team = attacking === 0 ? 1 : 0
  if (ball.y > GOAL_Y0 && ball.y < GOAL_Y1 && ball.z < CROSSBAR) {
    match.score[attacking]++
    match.phase = 'goal'
    match.phaseTime = 0
    match.restartTeam = defending
    say(match, `GOAL! ${TEAM_NAMES[attacking]}  ${match.score[0]} : ${match.score[1]}`)
    return
  }
  const lineX = attacking === 0 ? PITCH_LENGTH : 0
  if (ball.lastTouch === defending) {
    const y = ball.y < PITCH_WIDTH / 2 ? 0.2 : PITCH_WIDTH - 0.2
    return startRestart(match, 'corner', attacking, { x: lineX - attackDir(attacking) * 0.2, y })
  }
  return startRestart(match, 'goal kick', defending, {
    x: lineX - attackDir(attacking) * 1.7,
    y: ball.y < PITCH_WIDTH / 2 ? 8 : 13,
  })
}

function clampBallInGoal(match: Match) {
  const { ball } = match
  const back = ball.x > PITCH_LENGTH / 2 ? PITCH_LENGTH + GOAL_DEPTH - 0.15 : -GOAL_DEPTH + 0.15
  if ((ball.x > PITCH_LENGTH && ball.x > back) || (ball.x < 0 && ball.x < back)) {
    ball.x = back
    ball.vx = -ball.vx * 0.2
  }
  if (ball.x < 0 || ball.x > PITCH_LENGTH) {
    ball.y = clamp(ball.y, GOAL_Y0 + 0.1, GOAL_Y1 - 0.1)
    ball.vy *= 0.5
  }
}
