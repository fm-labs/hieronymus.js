/**
 * The city plan of the 'isoaws' world, generated from the network model.
 * Pure functions without engine dependencies, so they can be unit tested.
 *
 * - Every account/region is a district: an island surrounded by a ring road. The islands are packed
 *   into shelves and connected by bridges.
 * - Every VPC is a campus inside its district: a ring road, a gateway strip at the back (name, CIDR,
 *   VPN endpoints), and a grid of subnet plots: one column per availability zone, rows by tier
 *   (public, private, isolated, transit), streets between them. A stub road connects the campus to
 *   the district's ring road.
 * - Resources stand on the plots of their subnets, one per cell. The back row of a plot carries its
 *   painted name and CIDR.
 * - Regional services outside the VPCs (functions, buckets, queues, file systems, CloudFront) stand
 *   in a park next to the campuses.
 */
import type {
  District,
  NetworkModel,
  Resource,
  Subnet,
  SubnetTier,
  Vpc,
} from './isoaws.inventory.ts'
import { tierRank } from './isoaws.inventory.ts'

export type Rect = { col: number; row: number; cols: number; rows: number }

export const GROUND = {
  void: 0,
  land: 1,
  road: 2,
  campus: 3,
  plot: 4,
  park: 5,
} as const

export type PlotLayout = { subnet: Subnet; rect: Rect }

export type CampusLayout = {
  vpc: Vpc
  /** Including the ring road */
  rect: Rect
  /** The gateway strip at the back, inside the ring */
  gateway: Rect
  plots: PlotLayout[]
  /** Availability zones, one per column of plots */
  zones: string[]
}

export type DistrictLayout = {
  district: District
  /** Including the ring road, which is shared with the neighbors */
  rect: Rect
  campuses: CampusLayout[]
  /** Where the regional services stand: below a short campus, and/or next to the campuses */
  parks: Rect[]
}

export type Placement = { resource: Resource; col: number; row: number }

export type Pick =
  | { type: 'resource'; resource: Resource }
  | { type: 'subnet'; plot: PlotLayout }
  | { type: 'vpc'; campus: CampusLayout }
  | { type: 'district'; district: DistrictLayout }

export type CityLayout = {
  columns: number
  rows: number
  /** One GROUND value per cell, index row * columns + col */
  ground: Uint8Array
  districts: DistrictLayout[]
  placements: Placement[]
  /** Where each resource stands, by key */
  positions: Map<string, Placement>
  /** What a click on a cell selects, -1 for nothing; indexes into `picks` */
  owner: Int32Array
  picks: Pick[]
}

/** Empty cells around the city, so the edges of the slab are visible */
export const MARGIN = 2
const HEADER_ROWS = 2

/** The footprint of the subnet plots of a campus: big enough for its busiest subnet */
export function plotSize(vpc: Vpc): { cols: number; rows: number } {
  const most = Math.max(0, ...vpc.subnets.map((s) => s.resources.length))
  const cols = Math.min(6, Math.max(4, Math.ceil(most / 2)))
  // the back row is for the painted label
  const rows = 1 + Math.max(2, Math.ceil(most / cols))
  return { cols, rows }
}

type CampusPlan = {
  vpc: Vpc
  cols: number
  rows: number
  zones: string[]
  /** Rows of plots per tier, in tier order */
  tiers: Array<{ tier: SubnetTier; rows: number }>
  plot: { cols: number; rows: number }
}

function planCampus(vpc: Vpc): CampusPlan {
  const zones = [...new Set(vpc.subnets.map((s) => s.az))].sort()
  if (zones.length === 0) zones.push('–')
  const tierNames = [...new Set(vpc.subnets.map((s) => s.tier))].sort(
    (a, b) => tierRank(a) - tierRank(b),
  )
  // two subnets of the same tier in one zone go below each other
  const tiers = tierNames.map((tier) => ({
    tier,
    rows: Math.max(
      ...zones.map((az) => vpc.subnets.filter((s) => s.tier === tier && s.az === az).length),
    ),
  }))
  const plotRows = Math.max(
    1,
    tiers.reduce((sum, t) => sum + t.rows, 0),
  )
  const plot = plotSize(vpc)
  return {
    vpc,
    zones,
    tiers,
    plot,
    cols: zones.length * (plot.cols + 1) + 1,
    // ring, gateway strip, then plots each followed by a street (the last one is the ring)
    rows: 2 + plotRows * (plot.rows + 1),
  }
}

type CampusSlot = {
  plan: CampusPlan
  /** Offset from the top left of the campus area, in cells */
  dc: number
  dr: number
  /** Another campus stands below it, in the same column: the stub road leads there */
  below: boolean
}

type DistrictPlan = {
  district: District
  campuses: CampusSlot[]
  /** Relative to the top left of the campus area, like the campuses */
  parks: Rect[]
  /** Inside the ring road */
  innerCols: number
  innerRows: number
}

/**
 * The campuses of a district stand in columns: the tallest sets the height, smaller ones are stacked
 * below each other when they fit, so a district with one big and two small VPCs stays compact.
 */
function planDistrict(district: District): DistrictPlan {
  const plans = district.vpcs.map(planCampus).sort((a, b) => b.rows - a.rows)
  const height = Math.max(0, ...plans.map((c) => c.rows))
  const columns: Array<{ dc: number; cols: number; rows: number; items: CampusPlan[] }> = []
  for (const plan of plans) {
    const column = columns.find((c) => plan.cols <= c.cols && c.rows + 1 + plan.rows <= height)
    if (column) {
      column.items.push(plan)
      column.rows += 1 + plan.rows
    } else columns.push({ dc: 0, cols: plan.cols, rows: plan.rows, items: [plan] })
  }
  const campuses: CampusSlot[] = []
  let dc = 0
  for (const column of columns) {
    column.dc = dc
    let dr = 0
    column.items.forEach((plan, i) => {
      campuses.push({ plan, dc, dr, below: i < column.items.length - 1 })
      dr += plan.rows + 1
    })
    dc += column.cols + 1
  }
  let n = district.services.length
  const parks: Rect[] = []
  // first the free space below the shortest column of campuses (its stub road runs through it)
  const roomy = [...columns].sort((a, b) => a.rows - b.rows)[0]
  if (n > 0 && roomy && height - roomy.rows - 1 >= 2 && roomy.cols >= 3) {
    const rows = height - roomy.rows - 1
    // the stub road of the bottom campus, see layoutCity
    const bottom = roomy.items[roomy.items.length - 1]
    const stub = bottom.zones.length > 1 ? bottom.plot.cols + 1 : 0
    // only as wide as needed
    let cols = 0
    while (n > 0 && cols < roomy.cols) {
      if (cols !== stub) n -= rows
      cols++
    }
    parks.push({ col: roomy.dc, row: roomy.rows + 1, cols, rows })
  }
  // the rest next to the campuses, as high as they are, or roughly square when there are none
  let parkCols = 0
  if (n > 0) {
    const rows = height > 0 ? height : Math.max(3, Math.ceil(Math.sqrt(n)))
    parkCols = Math.ceil(n / rows)
    parks.push({ col: dc, row: 0, cols: parkCols, rows })
  }
  const parkRows = Math.max(0, ...parks.map((p) => p.row + p.rows))
  const innerCols = Math.max(10, 1 + dc + (parkCols ? parkCols + 1 : 0))
  // header, the tallest campus or the park, and a row for the stub roads
  const innerRows = HEADER_ROWS + Math.max(height, parkRows) + 1
  return { district, campuses, parks, innerCols, innerRows }
}

/** Water between the islands, in cells */
const GAP = 3

/**
 * Every district is an island. Shelf packing: islands go left to right until the shelf is full, the
 * next shelf starts below. Bridges connect neighbors in a shelf, and each island to the one above it.
 */
function packIslands(plans: DistrictPlan[]) {
  const sizes = plans.map((p) => ({ cols: p.innerCols + 2, rows: p.innerRows + 2 }))
  const area = sizes.reduce((sum, s) => sum + (s.cols + GAP) * (s.rows + GAP), 0)
  const widest = Math.max(...sizes.map((s) => s.cols))
  const target = Math.max(widest, Math.ceil(Math.sqrt(area) * 1.5))
  const shelves: Rect[][] = []
  const rects: Rect[] = []
  let col = 0
  let row = 0
  let shelfRows = 0
  sizes.forEach((size, i) => {
    if (shelves.length === 0 || (col + size.cols > target && col > 0)) {
      row += shelves.length ? shelfRows + GAP : 0
      shelves.push([])
      col = 0
      shelfRows = 0
    }
    rects[i] = { col, row, cols: size.cols, rows: size.rows }
    shelves[shelves.length - 1].push(rects[i])
    col += size.cols + GAP
    shelfRows = Math.max(shelfRows, size.rows)
  })

  const bridges: Rect[] = []
  shelves.forEach((shelf, k) => {
    for (let i = 1; i < shelf.length; i++) {
      const [a, b] = [shelf[i - 1], shelf[i]]
      const r = a.row + Math.floor(Math.min(a.rows, b.rows) / 2)
      bridges.push({ col: a.col + a.cols, row: r, cols: b.col - (a.col + a.cols), rows: 1 })
    }
    if (k === 0) return
    for (const b of shelf) {
      // to the island above with the longest shared edge, away from the corners
      let best: { a: Rect; lo: number; hi: number } | undefined
      for (const a of shelves[k - 1]) {
        const lo = Math.max(a.col, b.col) + 2
        const hi = Math.min(a.col + a.cols, b.col + b.cols) - 3
        if (hi >= lo && (!best || hi - lo > best.hi - best.lo)) best = { a, lo, hi }
      }
      if (!best) continue
      const top = best.a.row + best.a.rows
      bridges.push({
        col: Math.floor((best.lo + best.hi) / 2),
        row: top,
        cols: 1,
        rows: b.row - top,
      })
    }
  })
  const cols = Math.max(...rects.map((r) => r.col + r.cols))
  const rows = Math.max(...rects.map((r) => r.row + r.rows))
  return { rects, bridges, cols, rows }
}

/** Generate the city plan for a network model */
export function layoutCity(model: NetworkModel): CityLayout {
  const plans = model.districts.map(planDistrict)
  const packed = plans.length ? packIslands(plans) : { rects: [], bridges: [], cols: 1, rows: 1 }
  const columns = packed.cols + MARGIN * 2
  const rows = packed.rows + MARGIN * 2
  const ground = new Uint8Array(columns * rows)
  const owner = new Int32Array(columns * rows).fill(-1)
  const picks: Pick[] = []
  const placements: Placement[] = []
  const shift = (r: Rect): Rect => ({ ...r, col: r.col + MARGIN, row: r.row + MARGIN })

  const fill = (r: Rect, value: number) => {
    for (let row = r.row; row < r.row + r.rows; row++) {
      for (let col = r.col; col < r.col + r.cols; col++) ground[row * columns + col] = value
    }
  }
  const own = (r: Rect, pick: Pick) => {
    const index = picks.push(pick) - 1
    for (let row = r.row; row < r.row + r.rows; row++) {
      for (let col = r.col; col < r.col + r.cols; col++) owner[row * columns + col] = index
    }
  }
  const ring = (r: Rect) => {
    fill({ ...r, rows: 1 }, GROUND.road)
    fill({ ...r, row: r.row + r.rows - 1, rows: 1 }, GROUND.road)
    fill({ ...r, cols: 1 }, GROUND.road)
    fill({ ...r, col: r.col + r.cols - 1, cols: 1 }, GROUND.road)
  }
  const place = (resource: Resource, col: number, row: number) => {
    placements.push({ resource, col, row })
    own({ col, row, cols: 1, rows: 1 }, { type: 'resource', resource })
  }

  const districts: DistrictLayout[] = plans.map((plan, i) => {
    const rect = shift(packed.rects[i])
    const layout: DistrictLayout = { district: plan.district, rect, campuses: [], parks: [] }
    fill(rect, GROUND.land)
    own(rect, { type: 'district', district: layout })
    ring(rect)
    const top = rect.row + 1 + HEADER_ROWS
    const left = rect.col + 2
    const bottomRing = rect.row + rect.rows - 1

    for (const { plan: c, dc, dr, below } of plan.campuses) {
      const col = left + dc
      const row = top + dr
      const campusRect = { col, row, cols: c.cols, rows: c.rows }
      const gateway = { col: col + 1, row: row + 1, cols: c.cols - 2, rows: 1 }
      const campus: CampusLayout = {
        vpc: c.vpc,
        rect: campusRect,
        gateway,
        plots: [],
        zones: c.zones,
      }
      fill(campusRect, GROUND.campus)
      own(campusRect, { type: 'vpc', campus })
      ring(campusRect)
      // streets: one between every column of plots, and one below every row of plots
      for (let z = 1; z < c.zones.length; z++) {
        fill({ col: col + z * (c.plot.cols + 1), row, cols: 1, rows: c.rows }, GROUND.road)
      }
      let plotRow = row + 2
      for (const tier of c.tiers) {
        for (let k = 0; k < tier.rows; k++) {
          fill({ col, row: plotRow + c.plot.rows, cols: c.cols, rows: 1 }, GROUND.road)
          c.zones.forEach((az, z) => {
            const subnet = c.vpc.subnets.filter((s) => s.tier === tier.tier && s.az === az)[k]
            if (!subnet) return
            const plotRect = {
              col: col + 1 + z * (c.plot.cols + 1),
              row: plotRow,
              cols: c.plot.cols,
              rows: c.plot.rows,
            }
            const plot = { subnet, rect: plotRect }
            campus.plots.push(plot)
            fill(plotRect, GROUND.plot)
            own(plotRect, { type: 'subnet', plot })
            subnet.resources.forEach((resource, n) => {
              place(
                resource,
                plotRect.col + (n % plotRect.cols),
                plotRect.row + 1 + Math.floor(n / plotRect.cols),
              )
            })
          })
          plotRow += c.plot.rows + 1
        }
      }
      // the gateways stand at the right end of the gateway strip, the name is painted on the left
      c.vpc.gateways.forEach((gw, n) => place(gw, gateway.col + gateway.cols - 1 - n, gateway.row))
      if (below) {
        // a stacked campus: down its left side to the campus below
        fill({ col, row: row + c.rows, cols: 1, rows: 1 }, GROUND.road)
      } else {
        // from the campus' first street down to the district's ring road
        const stubCol = c.zones.length > 1 ? col + c.plot.cols + 1 : col
        fill(
          { col: stubCol, row: row + c.rows, cols: 1, rows: bottomRing - (row + c.rows) },
          GROUND.road,
        )
      }
      layout.campuses.push(campus)
    }

    // the parks: column by column, so a kind of service stays together; stub roads stay free
    const services = [...plan.district.services]
    for (const r of plan.parks) {
      const park = { ...r, col: left + r.col, row: top + r.row }
      layout.parks.push(park)
      for (let col = park.col; col < park.col + park.cols; col++) {
        for (let row = park.row; row < park.row + park.rows; row++) {
          if (ground[row * columns + col] !== GROUND.land) continue
          ground[row * columns + col] = GROUND.park
          const resource = services.shift()
          if (resource) place(resource, col, row)
        }
      }
    }
    return layout
  })
  packed.bridges.forEach((b) => fill(shift(b), GROUND.road))

  return {
    columns,
    rows,
    ground,
    districts,
    placements,
    positions: new Map(placements.map((p) => [p.resource.key, p])),
    owner,
    picks,
  }
}

export const groundAt = (layout: CityLayout, col: number, row: number): number =>
  col < 0 || row < 0 || col >= layout.columns || row >= layout.rows
    ? GROUND.void
    : layout.ground[row * layout.columns + col]

/** Tells whether a cell is road; outside the map it is not */
export const cityRoadMap = (layout: CityLayout) => (col: number, row: number) =>
  groundAt(layout, col, row) === GROUND.road

/** What a click on a cell selects: the resource, else the subnet, the VPC or the district */
export function pickAt(layout: CityLayout, col: number, row: number): Pick | undefined {
  if (col < 0 || row < 0 || col >= layout.columns || row >= layout.rows) return undefined
  const index = layout.owner[row * layout.columns + col]
  return index >= 0 ? layout.picks[index] : undefined
}

/** The plot of a subnet */
export function findPlot(layout: CityLayout, subnetId: string): PlotLayout | undefined {
  for (const d of layout.districts) {
    for (const c of d.campuses) {
      const plot = c.plots.find((p) => p.subnet.id === subnetId)
      if (plot) return plot
    }
  }
  return undefined
}

export function findCampus(layout: CityLayout, vpcId: string): CampusLayout | undefined {
  for (const d of layout.districts) {
    const campus = d.campuses.find((c) => c.vpc.id === vpcId)
    if (campus) return campus
  }
  return undefined
}
