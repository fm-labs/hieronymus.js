import { describe, expect, it } from 'vitest'
import {
  TANK_HEIGHT,
  applyLooks,
  buildContainersModel,
  parseSize,
  tankHeight,
} from '../src/worlds/isocontainers/isocontainers.layout'
import {
  badgeOf,
  imageRepository,
  labelOptions,
  lookToLabels,
  matchesImage,
  parseRules,
  removeRule,
  resolveLook,
  upsertRule,
  type StyleRule,
} from '../src/worlds/isocontainers/isocontainers.styles'
import {
  advise,
  adviseContainer,
  applyFix,
  imageTag,
  rate,
} from '../src/worlds/isocontainers/isocontainers.advisor'
import { SAMPLES } from '../src/worlds/isocontainers/isocontainers.samples'
import type { ContainersSpec } from '../src/worlds/isocontainers/isocontainers.types'

const base = { name: 'db', image: 'postgres:16', kind: 'database' as const, labels: {} }

describe('isocontainers styles', () => {
  it('matches images with and without registry and tag', () => {
    expect(matchesImage('postgres', 'docker.io/library/postgres:17')).toBe(true)
    expect(matchesImage('postgres:16*', 'postgres:16-alpine')).toBe(true)
    expect(matchesImage('postgres:16*', 'postgres:17')).toBe(false)
    expect(matchesImage('company/*', 'company/api:5.1')).toBe(true)
    expect(matchesImage('api', '192.168.0.55:5000/team/api:latest')).toBe(true)
    expect(matchesImage('redis', 'postgres:16')).toBe(false)
    expect(imageRepository('registry:5000/team/api:1.2')).toBe('registry:5000/team/api')
    expect(imageRepository('registry:5000/team/api')).toBe('registry:5000/team/api')
  })

  it('takes the kind default, then rules by specificity, then labels', () => {
    expect(resolveLook(base, []).style).toBe('vault')
    expect(resolveLook(base, []).badge).toBe('PG')
    const rules: StyleRule[] = [
      { name: 'db', style: 'tower' },
      { image: 'postgres', style: 'silo', accent: '#4cc9f0' },
      { kind: 'database', style: 'glass', scale: 1.5 },
    ]
    const look = resolveLook(base, rules)
    // the name wins over the image, the image over the kind; options merge
    expect(look.style).toBe('tower')
    expect(look.accent).toBe('#4cc9f0')
    expect(look.scale).toBeCloseTo(1.5)
    expect(look.source).toBe('rule name db')
    const labelled = resolveLook(
      { ...base, labels: { 'isocontainers.style': 'shed', 'isocontainers.badge': 'DB' } },
      rules,
    )
    expect(labelled.style).toBe('shed')
    expect(labelled.badge).toBe('DB')
    expect(labelled.source).toBe('labels')
  })

  it('brings the roof of a style, unless one is picked', () => {
    expect(resolveLook(base, [{ image: 'postgres', style: 'factory' }]).roof).toBe('chimney')
    expect(resolveLook(base, [{ image: 'postgres', style: 'factory', roof: 'tank' }]).roof).toBe(
      'tank',
    )
  })

  it('edits rules by target', () => {
    let rules = upsertRule([], { image: 'postgres' }, { style: 'silo' })
    rules = upsertRule(rules, { image: 'postgres' }, { accent: '#a78bfa' })
    expect(rules).toEqual([{ image: 'postgres', style: 'silo', accent: '#a78bfa' }])
    rules = upsertRule(rules, { name: 'db' }, { badge: 'X' })
    expect(rules).toHaveLength(2)
    // a cleared accent stays cleared
    rules = upsertRule(rules, { image: 'postgres' }, { accent: '' })
    expect(resolveLook(base, rules).accent).toBeUndefined()
    expect(removeRule(rules, { image: 'postgres' })).toEqual([{ name: 'db', badge: 'X' }])
  })

  it('parses rules and labels, and writes labels', () => {
    expect(
      parseRules({
        rules: [{ image: 'redis', style: 'silo' }, { style: 'tower' }, { kind: 'nope' }, 3],
      }),
    ).toEqual([{ image: 'redis', style: 'silo' }])
    expect(labelOptions({ 'isocontainers.style': 'Bogus', 'isocontainers.scale': '1.2' })).toEqual({
      scale: 1.2,
    })
    const look = resolveLook(base, [{ image: 'postgres', style: 'silo', accent: '#ff7a59' }])
    expect(lookToLabels(look)).toContain('isocontainers.style: silo')
    expect(lookToLabels(look)).toContain('isocontainers.accent: "#ff7a59"')
    expect(badgeOf('bitnami/redis:7')).toBe('RDS')
    expect(badgeOf('company/api:1')).toBeUndefined()
  })

  it('scales the heights, and moves the arcs with them', () => {
    const fleet = SAMPLES.find((s) => s.id === 'fleet')!
    const model = buildContainersModel(fleet)
    const exporter = model.containers.find((c) => c.name === 'node-exporter')!
    // the stack's own rule makes it a shed
    expect(exporter.look.style).toBe('shed')
    const api = model.containers.find((c) => c.name === 'api-1')!
    expect(api.look.accent).toBe('#4cc9f0')
    const arc = model.links.find((l) => l.arc && l.from === api)!
    applyLooks(model, [{ name: 'api-1', scale: 2 }])
    expect(api.height).toBe(Math.round(api.baseHeight * 2))
    expect(arc.arc!.a[2]).toBe(api.height)
  })
})

describe('isocontainers advisor', () => {
  const spec = (containers: ContainersSpec['environments'][0]['containers']): ContainersSpec => ({
    title: 't',
    environments: [{ name: 'h', containers }],
  })

  it('finds what is wrong', () => {
    const model = buildContainersModel(
      spec([
        {
          name: 'db',
          image: 'postgres',
          ports: ['5432:5432'],
          user: 'root',
          restart: 'unless-stopped',
          memory: '1 GiB',
        },
        {
          name: 'proxy',
          image: 'traefik:v3',
          mounts: ['/var/run/docker.sock:/var/run/docker.sock'],
          restart: 'always',
          memory: '128 MiB',
          health: 'healthy',
          labels: { 'isocontainers.advisor.ignore': 'root-user' },
          user: 'root',
        },
        { name: 'migrate', image: 'app/api:1', kind: 'tool', state: 'exited', exitCode: 0 },
      ]),
    )
    const checks = (name: string) =>
      adviseContainer(model.containers.find((c) => c.name === name)!)
        .map((a) => a.check)
        .sort()
    expect(checks('db')).toEqual([
      'data-without-volume',
      'latest-tag',
      'no-healthcheck',
      'public-datastore',
      'root-user',
    ])
    expect(checks('proxy')).toEqual(['docker-socket'])
    // a finished job needs no restart policy, no limit and no health check
    expect(checks('migrate')).toEqual([])
    expect(imageTag('registry:5000/app')).toBeUndefined()
    expect(imageTag('redis:7-alpine')).toBe('7-alpine')
  })

  it('rates hosts, accepted advice costing half', () => {
    const model = buildContainersModel(SAMPLES.find((s) => s.id === 'devbox')!)
    const advice = advise(model)
    expect(advice[0].severity).toBe('risk')
    const r = rate(advice, model.containers.length)
    expect(r.stars).toBeGreaterThanOrEqual(0)
    expect(r.stars).toBeLessThan(5)
    const accepted = rate(advice, model.containers.length, new Set(advice.map((a) => a.id)))
    expect(accepted.score).toBeGreaterThan(r.score)
    expect(accepted.open).toBe(0)
    expect(rate([], 3)).toEqual({ score: 100, stars: 5, open: 0 })
  })

  it('tries fixes in the view, and the advice goes away', () => {
    const model = buildContainersModel(SAMPLES.find((s) => s.id === 'devbox')!)
    for (const a of advise(model)) applyFix(a, model)
    const left = new Set(advise(model).map((a) => a.check))
    for (const check of [
      'public-datastore',
      'no-restart',
      'no-healthcheck',
      'no-memory-limit',
      'root-user',
    ])
      expect(left.has(check as never), check).toBe(false)
    // what needs a decision stays: a version to pin
    expect(left.has('latest-tag')).toBe(true)
    // no more ingress to a database that is only local now
    for (const c of model.containers.filter((c) => c.kind === 'database'))
      expect(c.in.some((l) => l.kind === 'ingress')).toBe(false)
  })

  it('rates every sample', () => {
    for (const s of SAMPLES) {
      const model = buildContainersModel(s)
      const r = rate(advise(model), model.containers.length)
      expect(r.score, s.id).toBeGreaterThan(0)
    }
  })
})

describe('isocontainers tanks', () => {
  it('reads sizes', () => {
    expect(parseSize('2.4 GB')).toBe(2.4e9)
    expect(parseSize('512 MiB')).toBe(512 * 1024 ** 2)
    expect(parseSize('48 kB')).toBe(48e3)
    expect(parseSize('1.4T')).toBe(1.4e12)
    expect(parseSize('lots')).toBeUndefined()
    expect(parseSize(undefined)).toBeUndefined()
  })

  it('grows with the size, each ×10 by the same step', () => {
    const [mb, gb, tb] = [tankHeight(1e6), tankHeight(1e9), tankHeight(1e12)]
    expect(gb).toBeGreaterThan(mb)
    expect(tb).toBeGreaterThan(gb)
    expect(gb - mb).toBe(tb - gb)
    expect(tankHeight(1)).toBeGreaterThan(0)
    expect(tankHeight(undefined)).toBe(TANK_HEIGHT)
    const shop = buildContainersModel(SAMPLES[0])
    const v = (name: string) => shop.volumes.find((x) => x.name === name)!
    expect(v('objects').height).toBeGreaterThan(v('pgdata').height)
    expect(v('pgdata').height).toBeGreaterThan(v('certs').height)
  })
})
