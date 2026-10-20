import { describe, expect, it } from 'vitest'
import {
  roadDirections,
  stepTraffic,
  createVehicle,
  type Vehicle,
} from '../src/worlds/isocity/isocity.traffic'
import {
  buildNetworkModel,
  cidrSize,
  instanceSize,
  resourceKey,
  subnetTier,
  type ResourceKind,
} from '../src/worlds/isoaws/isoaws.inventory'
import {
  cityRoadMap,
  GROUND,
  groundAt,
  layoutCity,
  pickAt,
  type CityLayout,
  type Rect,
} from '../src/worlds/isoaws/isoaws.layout'
import { sampleInventory, SAMPLE_ACCOUNT } from '../src/worlds/isoaws/isoaws.sample'

const model = buildNetworkModel(sampleInventory())
const key = (kind: ResourceKind, id: string, region = 'eu-west-1') =>
  resourceKey(kind, SAMPLE_ACCOUNT, region, id)
const layout = layoutCity(model)
const isRoad = cityRoadMap(layout)

const cellsOf = (r: Rect) =>
  Array.from({ length: r.cols * r.rows }, (_, i) => [
    r.col + (i % r.cols),
    r.row + Math.floor(i / r.cols),
  ])

const roadCells = (l: CityLayout) => {
  const cells: Array<[number, number]> = []
  for (let row = 0; row < l.rows; row++) {
    for (let col = 0; col < l.columns; col++)
      if (groundAt(l, col, row) === GROUND.road) cells.push([col, row])
  }
  return cells
}

describe('isoaws inventory', () => {
  it('parses CIDRs, tiers and instance sizes', () => {
    expect(cidrSize('10.0.0.0/16')).toBe(65536)
    expect(cidrSize('10.0.255.0/27')).toBe(32)
    expect(subnetTier('vpc/prod/isolatedSubnet1', false)).toBe('isolated')
    expect(subnetTier('', true)).toBe('public')
    expect(subnetTier('', false)).toBe('private')
    expect(instanceSize('t3.nano')).toBe(1)
    expect(instanceSize('m5.2xlarge')).toBe(7)
    expect(instanceSize('c6i.8xlarge')).toBe(8)
  })

  it('groups the sample into districts, VPCs and subnets', () => {
    expect(model.accounts).toEqual([SAMPLE_ACCOUNT])
    expect(model.districts.map((d) => d.key)).toEqual([
      'global',
      `${SAMPLE_ACCOUNT}/eu-west-1`,
      `${SAMPLE_ACCOUNT}/us-east-1`,
    ])
    expect(model.vpcs.size).toBe(2)
    expect(model.subnets.size).toBe(16)
    expect(model.vpcs.get('vpc-prod')!.gateways.map((g) => g.id)).toEqual(['cvpn-endpoint-prod'])
  })

  it('puts every resource in the right place', () => {
    const subnetOf = (k: string) => model.resources.get(k)!.subnetId
    expect(subnetOf(key('instance', 'i-api1'))).toBe('subnet-private-a')
    // the database stands in the subnet of its zone, and links to the rest of its subnet group
    expect(subnetOf(key('database', 'prod-db'))).toBe('subnet-isolated-b')
    expect(model.resources.get(key('database', 'prod-db'))!.links).toEqual([
      'subnet:subnet-isolated-a',
      'subnet:subnet-isolated-c',
    ])
    expect(subnetOf(key('vpn-target', 'cvpn-assoc-c'))).toBe('subnet-transit-c')
    expect(subnetOf(key('vpc-lambda', 'vpc-indexer'))).toBe('subnet-private-a')
    expect(model.resources.get(key('instance', 'i-worker'))).toMatchObject({
      volumes: 2,
      ecs: true,
    })
  })

  it('links CloudFront to its origin bucket and EFS to its mount targets', () => {
    const distribution = key('distribution', 'E2SAMPLE', 'us-east-1')
    expect(model.resources.get(distribution)!.links).toEqual([key('bucket', 'prod-assets')])
    expect(model.resources.get(key('bucket', 'prod-assets'))!.links).toEqual([distribution])
    expect(model.resources.get(key('filesystem', 'fs-shared'))!.links).toHaveLength(3)
  })

  it('keeps resources with the same id in different regions apart, and skips duplicates', () => {
    const items = sampleInventory()
    const twin = { ...items.find((i) => i.resource_id === 'webhook')!, region_id: 'us-east-1' }
    const twice = buildNetworkModel([...items, twin, items[0]])
    expect(twice.resources.size).toBe(model.resources.size + 1)
    expect(layoutCity(twice).placements).toHaveLength(model.resources.size + 1)
  })

  it('counts what it does not draw', () => {
    expect(model.hidden).toEqual([['AWS::IAM::Role', 12]])
  })
})

describe('isoaws layout', () => {
  it('places every resource once, on a free cell', () => {
    expect(layout.placements).toHaveLength(model.resources.size)
    const cells = new Set(layout.placements.map((p) => `${p.col},${p.row}`))
    expect(cells.size).toBe(layout.placements.length)
    for (const p of layout.placements) {
      expect(groundAt(layout, p.col, p.row)).not.toBe(GROUND.road)
      expect(groundAt(layout, p.col, p.row)).not.toBe(GROUND.void)
    }
  })

  it('puts subnet resources on their plot, below the label row', () => {
    for (const d of layout.districts) {
      for (const c of d.campuses) {
        for (const plot of c.plots) {
          for (const r of plot.subnet.resources) {
            const p = layout.positions.get(r.key)!
            expect(p.col).toBeGreaterThanOrEqual(plot.rect.col)
            expect(p.col).toBeLessThan(plot.rect.col + plot.rect.cols)
            expect(p.row).toBeGreaterThan(plot.rect.row)
            expect(p.row).toBeLessThan(plot.rect.row + plot.rect.rows)
          }
        }
      }
    }
  })

  it('gives every subnet a plot, one column per zone', () => {
    const prod = layout.districts.flatMap((d) => d.campuses).find((c) => c.vpc.id === 'vpc-prod')!
    expect(prod.plots).toHaveLength(12)
    expect(prod.zones).toEqual(['eu-west-1a', 'eu-west-1b', 'eu-west-1c'])
    // public plots are at the back (lower rows), transit at the front
    const rowOf = (id: string) => prod.plots.find((p) => p.subnet.id === id)!.rect.row
    expect(rowOf('subnet-public-a')).toBeLessThan(rowOf('subnet-private-a'))
    expect(rowOf('subnet-isolated-a')).toBeLessThan(rowOf('subnet-transit-a'))
    // plots don't overlap and don't touch roads
    for (const plot of prod.plots) {
      for (const [col, row] of cellsOf(plot.rect))
        expect(groundAt(layout, col, row)).toBe(GROUND.plot)
    }
  })

  it('keeps every campus inside its island, with no roads outside the campuses', () => {
    const campuses = layout.districts.flatMap((d) => d.campuses.map((c) => c.rect))
    for (const d of layout.districts) {
      const r = d.rect
      for (const c of d.campuses) {
        expect(c.rect.col).toBeGreaterThan(r.col)
        expect(c.rect.row).toBeGreaterThan(r.row)
        expect(c.rect.col + c.rect.cols).toBeLessThan(r.col + r.cols)
        expect(c.rect.row + c.rect.rows).toBeLessThan(r.row + r.rows)
      }
    }
    const inside = (col: number, row: number) =>
      campuses.some(
        (c) => col >= c.col && col < c.col + c.cols && row >= c.row && row < c.row + c.rows,
      )
    for (const [col, row] of roadCells(layout)) {
      expect(inside(col, row), `road outside a campus at ${col},${row}`).toBe(true)
    }
  })

  it('connects the roads of each campus, and only those', () => {
    for (const campus of layout.districts.flatMap((d) => d.campuses)) {
      const r = campus.rect
      const roads = roadCells(layout).filter(
        ([col, row]) =>
          col >= r.col && col < r.col + r.cols && row >= r.row && row < r.row + r.rows,
      )
      const seen = new Set([roads[0].join()])
      const queue = [roads[0]]
      while (queue.length) {
        const [col, row] = queue.pop()!
        for (const [dc, dr] of [
          [0, 1],
          [1, 0],
          [0, -1],
          [-1, 0],
        ]) {
          const next: [number, number] = [col + dc, row + dr]
          if (isRoad(...next) && !seen.has(next.join())) {
            seen.add(next.join())
            queue.push(next)
          }
        }
      }
      // all of the campus' roads, and none from elsewhere
      expect(seen.size).toBe(roads.length)
    }
  })

  it('has no road wider than one lane', () => {
    // two parallel roads next to each other would let packets turn into the other lane
    for (const [col, row] of roadCells(layout)) {
      const square = isRoad(col + 1, row) && isRoad(col, row + 1) && isRoad(col + 1, row + 1)
      expect(square, `2x2 road block at ${col},${row}`).toBe(false)
    }
  })

  it('has no dead ends', () => {
    for (const [col, row] of roadCells(layout)) {
      expect(roadDirections(isRoad, col, row).length, `dead end at ${col},${row}`).toBeGreaterThan(
        1,
      )
    }
  })

  it('picks the resource, else the subnet, the VPC or the district', () => {
    const p = layout.positions.get(key('instance', 'i-api1'))!
    expect(pickAt(layout, p.col, p.row)).toMatchObject({
      type: 'resource',
      resource: { id: 'i-api1' },
    })
    const plot = layout.districts[1].campuses[0].plots[0]
    expect(pickAt(layout, plot.rect.col, plot.rect.row)).toMatchObject({ type: 'subnet' })
    const campus = layout.districts[1].campuses[0]
    expect(pickAt(layout, campus.rect.col, campus.rect.row)).toMatchObject({ type: 'vpc' })
    const d = layout.districts[1]
    expect(pickAt(layout, d.rect.col + 1, d.rect.row + 1)).toMatchObject({ type: 'district' })
    expect(pickAt(layout, 0, 0)).toBeUndefined()
  })

  it('lays out several accounts as one rectangle', () => {
    const other = sampleInventory().map((i) => ({ ...i, account_id: '210987654321' }))
    const big = layoutCity(buildNetworkModel([...sampleInventory(), ...other]))
    expect(big.districts).toHaveLength(5)
    // the global district is shared
    expect(big.districts.filter((d) => d.district.key === 'global')).toHaveLength(1)
    expect(big.placements).toHaveLength(model.resources.size * 2)
  })
})

describe('isoaws traffic', () => {
  it('keeps the packets moving', () => {
    // seeded PRNG (mulberry32), so failures are reproducible
    let seed = 42
    const random = () => {
      seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
    const roads = roadCells(layout)
    const vehicles: Vehicle[] = []
    for (let i = 0; i < Math.round(roads.length / 9); i++) {
      const [col, row] = roads[(i * 9) % roads.length]
      vehicles.push(
        createVehicle(i + 1, isRoad, col, row, random, {
          kind: 'car',
          color: '',
          speed: 1.4 + random(),
        }),
      )
    }
    const still = new Map(vehicles.map((v) => [v.id, 0]))
    let longest = 0
    for (let step = 0; step < 6000; step++) {
      const before = vehicles.map((v) => `${v.col},${v.row},${v.progress}`)
      stepTraffic(vehicles, isRoad, 1 / 30, random)
      vehicles.forEach((v, i) => {
        const moved = before[i] !== `${v.col},${v.row},${v.progress}`
        still.set(v.id, moved ? 0 : still.get(v.id)! + 1 / 30)
        longest = Math.max(longest, still.get(v.id)!)
      })
    }
    expect(longest).toBeLessThan(5)
  })
})
