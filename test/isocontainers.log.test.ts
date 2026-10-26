import { describe, expect, it } from 'vitest'
import { LogSimulator, LogStream, portOf } from '../src/worlds/isocontainers/isocontainers.log'
import { buildContainersModel } from '../src/worlds/isocontainers/isocontainers.layout'
import { ContainersSimulation, START_SECONDS } from '../src/worlds/isocontainers/isocontainers.sim'
import { SAMPLES } from '../src/worlds/isocontainers/isocontainers.samples'

/** A seeded random, so the lines are the same on every run */
function seeded(seed = 7) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

const fleet = () => {
  const model = buildContainersModel(SAMPLES.find((s) => s.id === 'fleet')!)
  const stream = new LogStream(200, () => 0)
  const sim = new ContainersSimulation(model, seeded())
  const logSim = new LogSimulator(model, stream, seeded(11))
  sim.onEvent = logSim.hear
  const run = (seconds: number) => {
    for (let i = 0; i < seconds * 30; i++) {
      sim.step(1 / 30)
      logSim.step(1 / 30)
    }
  }
  return { model, stream, sim, run }
}

describe('isocontainers log', () => {
  it('keeps the last lines, numbered, and tells the listeners', () => {
    const stream = new LogStream(3, () => 42)
    const heard: number[] = []
    const stop = stream.subscribe((e) => heard.push(e.id))
    for (let i = 0; i < 5; i++) stream.push({ source: 'world', level: 'info', text: `line ${i}` })
    expect(stream.events.map((e) => e.text)).toEqual(['line 2', 'line 3', 'line 4'])
    expect(stream.events[0]).toMatchObject({ id: 3, time: 42 })
    stop()
    stream.push({ source: 'world', level: 'info', text: 'unheard' })
    expect(heard).toEqual([1, 2, 3, 4, 5])
  })

  it('writes a few lines a second of traffic, from the containers', () => {
    const { stream, run } = fleet()
    run(10)
    const traffic = stream.events.filter((e) => e.source === 'container' && e.level === 'info')
    // at most the rate (2.2 a second) plus the first burst
    expect(traffic.length).toBeGreaterThan(5)
    expect(traffic.length).toBeLessThanOrEqual(10 * 2.2 + 3)
    for (const e of traffic) expect(e.host && e.key && e.actor).toBeTruthy()
  })

  it('writes the engine events of a stop, and the failed calls after it', () => {
    const { model, stream, sim, run } = fleet()
    const postgres = model.containers.find((c) => c.key === 'data-1/postgres')!
    sim.stop(postgres)
    const engine = stream.events.filter((e) => e.source === 'engine' && e.key === postgres.key)
    expect(engine.map((e) => e.text)).toEqual([
      'container kill signal=SIGTERM',
      'container die exitCode=0',
      'network disconnect db',
      'container stop',
    ])
    run(8)
    const errors = stream.events.filter((e) => e.level === 'error' && e.text.includes('postgres'))
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].text).toContain(`postgres:${portOf(postgres)}`)
    // at most one a second per target
    expect(errors.length).toBeLessThanOrEqual(9)

    sim.start(postgres)
    run(START_SECONDS + 0.5)
    const texts = stream.events.filter((e) => e.key === postgres.key).map((e) => e.text)
    expect(texts).toContain('network connect db')
    expect(texts).toContain('LOG:  database system is ready to accept connections')
  })
})
