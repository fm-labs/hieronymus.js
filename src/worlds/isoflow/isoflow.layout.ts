/**
 * Turns a workflow spec into a model with a layered layout (a simple Sugiyama layout):
 * nodes are put in layers along the columns by their longest path from a source, ordered within
 * a layer to reduce crossings, and placed across the rows. Edges that skip layers pass through
 * reserved slots, and every edge is routed with straight segments: along the columns through the
 * layers, and along the rows in lanes between them.
 */
import {
  KIND_LABELS,
  type FlowEdge,
  type FlowEdgeSpec,
  type FlowGroup,
  type FlowModel,
  type FlowNode,
  type FlowSpec,
  type GridPoint,
  type NodeKind,
} from './isoflow.types.ts'

/** Cells between two layers, room for the lanes of the edges */
const LAYER_GAP = 3.5
/** Cells between two cards of a layer */
const NODE_GAP = 1.1
/** The slot an edge takes when it passes through a layer */
const PASS_H = 0.45
const MARGIN = 5

/** Card text metrics, in plane units (64 per cell); the card component uses the same */
export const CARD = {
  unit: 64,
  pad: 18,
  header: 30,
  title: 26,
  line: 20,
  footer: 34,
}

type Item = {
  key: string
  node?: FlowNode
  h: number
  layer: number
  preds: Item[]
  succs: Item[]
  order: number
  y: number
}

const KINDS = new Set(Object.keys(KIND_LABELS))

function cardSize(
  label: string,
  lines: string[],
  rowsShown: number,
  table: boolean,
): { w: number; h: number } {
  const longest = Math.max(label.length * 15.5 + 36, ...lines.map((l) => l.length * 10.5))
  const w = Math.min(7, Math.max(4, Math.ceil(((longest + CARD.pad * 2) / CARD.unit) * 2) / 2))
  const body = table ? (rowsShown + 1) * CARD.line : rowsShown * CARD.line
  const h = Math.max(2, (CARD.header + CARD.title + 18 + body + CARD.footer) / CARD.unit)
  return { w, h: Math.ceil(h * 4) / 4 }
}

const parseEdge = (spec: FlowEdgeSpec): { from: string; to: string; label?: string } =>
  Array.isArray(spec) ? { from: spec[0], to: spec[1], label: spec[2] } : spec

/** Build the model of a spec: nodes, edges, layout and routes */
export function buildFlowModel(spec: FlowSpec): FlowModel {
  const mode = spec.mode ?? 'batch'
  const byId = new Map<string, FlowNode>()
  const nodes: FlowNode[] = []
  for (const s of spec.nodes) {
    if (!s?.id || byId.has(s.id)) continue
    const kind: NodeKind = s.kind && KINDS.has(s.kind) ? s.kind : 'task'
    const label = s.label ?? s.id
    const lines = Array.isArray(s.lines) ? s.lines.map(String) : []
    // streaming clients show the last messages they received
    const rowsShown = s.table
      ? Math.max(3, Math.min(4, s.table.rows.length))
      : Math.min(5, Math.max(lines.length, mode === 'stream' && kind === 'client' ? 2 : 0))
    const size = cardSize(label, lines, rowsShown, !!s.table)
    const node: FlowNode = {
      id: s.id,
      label,
      kind,
      caption: s.caption ?? KIND_LABELS[kind],
      group: s.group,
      lines,
      table: s.table && { columns: [...s.table.columns], rows: s.table.rows.map((r) => [...r]) },
      duration: Math.max(0.2, s.duration ?? 1.5),
      failRate: Math.max(0, Math.min(1, s.failRate ?? 0)),
      note: s.note,
      w: s.w ?? size.w,
      h: s.h ?? size.h,
      in: [],
      out: [],
      col: 0,
      row: 0,
      layer: 0,
      state: mode === 'stream' ? 'live' : 'idle',
      progress: 0,
      elapsed: 0,
      flash: 0,
      count: 0,
    }
    byId.set(node.id, node)
    nodes.push(node)
  }

  const edges: FlowEdge[] = []
  const seen = new Set<string>()
  for (const raw of spec.edges) {
    const { from, to, label } = parseEdge(raw)
    const a = byId.get(from)
    const b = byId.get(to)
    const id = `${from}->${to}`
    if (!a || !b || a === b || seen.has(id)) {
      if (!a || !b) console.warn(`isoflow: edge ${id} names an unknown node`)
      continue
    }
    seen.add(id)
    const edge: FlowEdge = {
      id,
      from: a,
      to: b,
      label,
      back: false,
      path: [],
      lengths: [],
      state: 'idle',
      progress: 0,
      pulses: [],
    }
    a.out.push(edge)
    b.in.push(edge)
    edges.push(edge)
  }

  markBackEdges(nodes)
  const depth = assignLayers(nodes)
  const { columns, rows } = placeAndRoute(nodes, edges, depth)
  const groups = frameGroups(spec, nodes)

  return {
    spec,
    title: spec.title,
    subtitle: spec.subtitle ?? '',
    description: spec.description ?? '',
    mode,
    nodes,
    edges,
    byId,
    groups,
    columns: Math.ceil(Math.max(columns, ...groups.map((g) => g.col + g.cols + MARGIN))),
    rows: Math.ceil(Math.max(rows, ...groups.map((g) => g.row + g.rows + MARGIN))),
    depth,
  }
}

/** Edges that close a cycle (found by a depth-first search) are left out of the layout and the runs */
function markBackEdges(nodes: FlowNode[]) {
  const state = new Map<FlowNode, 1 | 2>()
  const visit = (n: FlowNode) => {
    state.set(n, 1)
    for (const e of n.out) {
      const s = state.get(e.to)
      if (s === 1) e.back = true
      else if (!s) visit(e.to)
    }
    state.set(n, 2)
  }
  // start from the sources, so the cycles are cut where they close
  for (const n of nodes) if (!n.in.length && !state.has(n)) visit(n)
  for (const n of nodes) if (!state.has(n)) visit(n)
}

/** Longest path layering; sources move right, next to their first successor */
function assignLayers(nodes: FlowNode[]): number {
  const fwdIn = (n: FlowNode) => n.in.filter((e) => !e.back)
  const fwdOut = (n: FlowNode) => n.out.filter((e) => !e.back)
  const indegree = new Map(nodes.map((n) => [n, fwdIn(n).length]))
  const queue = nodes.filter((n) => indegree.get(n) === 0)
  for (const n of nodes) n.layer = 0
  while (queue.length) {
    const n = queue.shift()!
    for (const e of fwdOut(n)) {
      e.to.layer = Math.max(e.to.layer, n.layer + 1)
      indegree.set(e.to, indegree.get(e.to)! - 1)
      if (indegree.get(e.to) === 0) queue.push(e.to)
    }
  }
  for (const n of nodes) {
    const out = fwdOut(n)
    if (!fwdIn(n).length && out.length) n.layer = Math.min(...out.map((e) => e.to.layer)) - 1
  }
  return nodes.reduce((d, n) => Math.max(d, n.layer + 1), 1)
}

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length

function placeAndRoute(nodes: FlowNode[], edges: FlowEdge[], depth: number) {
  // the items of each layer: the cards, and a slot for each edge that passes through
  const layers: Item[][] = Array.from({ length: depth }, () => [])
  const itemOf = new Map<FlowNode, Item>()
  for (const node of nodes) {
    const item: Item = {
      key: node.id,
      node,
      h: node.h,
      layer: node.layer,
      preds: [],
      succs: [],
      order: layers[node.layer].length,
      y: 0,
    }
    itemOf.set(node, item)
    layers[node.layer].push(item)
  }
  const chains = new Map<FlowEdge, Item[]>()
  for (const e of edges) {
    if (e.back) continue
    const chain: Item[] = [itemOf.get(e.from)!]
    for (let l = e.from.layer + 1; l < e.to.layer; l++) {
      const pass: Item = {
        key: `${e.id}#${l}`,
        h: PASS_H,
        layer: l,
        preds: [],
        succs: [],
        order: layers[l].length,
        y: 0,
      }
      layers[l].push(pass)
      chain.push(pass)
    }
    chain.push(itemOf.get(e.to)!)
    for (let i = 0; i + 1 < chain.length; i++) {
      chain[i].succs.push(chain[i + 1])
      chain[i + 1].preds.push(chain[i])
    }
    chains.set(e, chain)
  }

  orderLayers(layers)
  positionRows(layers)

  // the columns of the layers
  const layerW = layers.map((items) => Math.max(1, ...items.map((i) => i.node?.w ?? 0)))
  const layerX: number[] = []
  let x = MARGIN
  for (let l = 0; l < depth; l++) {
    layerX.push(x)
    x += layerW[l] + LAYER_GAP
  }

  // shift the rows so the top card starts at the margin
  const all = layers.flat()
  const top = Math.min(...all.map((i) => i.y - i.h / 2))
  for (const i of all) i.y += MARGIN + 1.5 - top
  for (const i of all) {
    if (!i.node) continue
    i.node.col = layerX[i.layer] + (layerW[i.layer] - i.node.w) / 2
    i.node.row = i.y - i.node.h / 2
  }

  routeEdges(chains, layers, layerX, layerW)

  const bottom = Math.max(...all.map((i) => i.y + i.h / 2))
  return { columns: x - LAYER_GAP + MARGIN, rows: bottom + MARGIN }
}

/** Barycenter sweeps, down and up, to reduce the crossings */
function orderLayers(layers: Item[][]) {
  const sortBy = (items: Item[], neighbors: (i: Item) => Item[]) => {
    const key = new Map(
      items.map((i) => {
        const ns = neighbors(i)
        return [i, ns.length ? mean(ns.map((n) => n.order)) : i.order]
      }),
    )
    items.sort((a, b) => key.get(a)! - key.get(b)! || a.order - b.order)
    items.forEach((i, k) => (i.order = k))
  }
  for (let round = 0; round < 6; round++) {
    for (let l = 1; l < layers.length; l++) sortBy(layers[l], (i) => i.preds)
    for (let l = layers.length - 2; l >= 0; l--) sortBy(layers[l], (i) => i.succs)
  }
  for (let l = 1; l < layers.length; l++) sortBy(layers[l], (i) => i.preds)
}

/**
 * Rows: every item moves toward the mean of its neighbors in the previous (or next) layer,
 * keeping its order and the spacing. The two greedy packings (from the top and from the bottom)
 * are both valid, and so is their average.
 */
function positionRows(layers: Item[][]) {
  const gap = (a: Item, b: Item) => a.h / 2 + b.h / 2 + (a.node && b.node ? NODE_GAP : 0.35)
  const place = (items: Item[], desired: number[]) => {
    const n = items.length
    if (!n) return
    const down = [...desired]
    for (let i = 1; i < n; i++)
      down[i] = Math.max(down[i], down[i - 1] + gap(items[i - 1], items[i]))
    const up = [...desired]
    for (let i = n - 2; i >= 0; i--)
      up[i] = Math.min(up[i], up[i + 1] - gap(items[i], items[i + 1]))
    items.forEach((item, i) => (item.y = (down[i] + up[i]) / 2))
  }
  // start stacked and centered
  for (const items of layers) {
    let y = 0
    items.forEach((item, i) => {
      if (i) y += gap(items[i - 1], item)
      item.y = y
    })
    items.forEach((item) => (item.y -= y / 2))
  }
  const pass = (items: Item[], neighbors: (i: Item) => Item[]) =>
    place(
      items,
      items.map((i) => {
        const ns = neighbors(i)
        return ns.length ? mean(ns.map((n) => n.y)) : i.y
      }),
    )
  for (let round = 0; round < 8; round++) {
    for (let l = 1; l < layers.length; l++) pass(layers[l], (i) => i.preds)
    for (let l = layers.length - 2; l >= 0; l--) pass(layers[l], (i) => i.succs)
  }
  for (let l = 1; l < layers.length; l++) pass(layers[l], (i) => i.preds)
}

function routeEdges(
  chains: Map<FlowEdge, Item[]>,
  layers: Item[][],
  layerX: number[],
  layerW: number[],
) {
  // where each edge leaves its source and enters its target, in rows
  const exitRow = (e: FlowEdge) => itemCenter(e.from)
  const itemCenter = (n: FlowNode) => n.row + n.h / 2
  const entry = new Map<FlowEdge, number>()
  for (const items of layers) {
    for (const item of items) {
      const target = item.node
      if (!target) continue
      const incoming = target.in
        .filter((e) => chains.has(e))
        .map((e) => {
          const chain = chains.get(e)!
          return { e, from: chain[chain.length - 2].y }
        })
        .sort((a, b) => a.from - b.from)
      const k = incoming.length
      const spread = k > 1 ? Math.min(target.h * 0.6, (k - 1) * 0.45) : 0
      incoming.forEach(({ e }, i) =>
        entry.set(e, itemCenter(target) - spread / 2 + (k > 1 ? (spread * i) / (k - 1) : 0)),
      )
    }
  }

  // the vertical segments in each gap between two layers, one lane per source item
  type Segment = { e: FlowEdge; step: number; a: number; b: number; key: string }
  const gaps: Segment[][] = layers.map(() => [])
  for (const [e, chain] of chains) {
    for (let k = 0; k + 1 < chain.length; k++) {
      const a = k === 0 ? exitRow(e) : chain[k].y
      const b = k + 2 === chain.length ? entry.get(e)! : chain[k + 1].y
      gaps[chain[k].layer].push({ e, step: k, a, b, key: chain[k].key })
    }
  }
  const laneX = new Map<string, number>()
  gaps.forEach((segments, g) => {
    const lanes = new Map<string, number[]>()
    for (const s of segments) {
      if (Math.abs(s.a - s.b) < 0.01) continue
      const rows = lanes.get(s.key) ?? []
      rows.push(s.a, s.b)
      lanes.set(s.key, rows)
    }
    const sorted = [...lanes.entries()].sort((p, q) => mean(p[1]) - mean(q[1]))
    const start = layerX[g] + layerW[g]
    sorted.forEach(([key], i) =>
      laneX.set(`${g}|${key}`, start + (LAYER_GAP * (i + 1)) / (sorted.length + 1)),
    )
  })

  for (const [e, chain] of chains) {
    const points: GridPoint[] = [[e.from.col + e.from.w, exitRow(e)]]
    for (let k = 0; k + 1 < chain.length; k++) {
      const a = k === 0 ? exitRow(e) : chain[k].y
      const b = k + 2 === chain.length ? entry.get(e)! : chain[k + 1].y
      const lane = laneX.get(`${chain[k].layer}|${chain[k].key}`)
      if (lane !== undefined && Math.abs(a - b) >= 0.01) points.push([lane, a], [lane, b])
    }
    points.push([e.to.col, entry.get(e)!])
    e.path = simplify(points)
    e.lengths = [0]
    for (let i = 1; i < e.path.length; i++) {
      const [c0, r0] = e.path[i - 1]
      const [c1, r1] = e.path[i]
      e.lengths.push(e.lengths[i - 1] + Math.abs(c1 - c0) + Math.abs(r1 - r0))
    }
  }
}

/** Drop the points in the middle of straight runs */
function simplify(points: GridPoint[]): GridPoint[] {
  const out: GridPoint[] = []
  for (const p of points) {
    const last = out[out.length - 1]
    if (last && Math.abs(last[0] - p[0]) < 1e-6 && Math.abs(last[1] - p[1]) < 1e-6) continue
    const prev = out[out.length - 2]
    if (
      prev &&
      last &&
      ((Math.abs(prev[0] - last[0]) < 1e-6 && Math.abs(last[0] - p[0]) < 1e-6) ||
        (Math.abs(prev[1] - last[1]) < 1e-6 && Math.abs(last[1] - p[1]) < 1e-6))
    ) {
      out[out.length - 1] = p
      continue
    }
    out.push(p)
  }
  return out
}

/** A frame around the cards of each group, with room for its name along the front edge */
function frameGroups(spec: FlowSpec, nodes: FlowNode[]): FlowGroup[] {
  const keys = [...new Set(nodes.map((n) => n.group).filter((g): g is string => !!g))]
  return keys.map((key) => {
    const members = nodes.filter((n) => n.group === key)
    const col0 = Math.min(...members.map((n) => n.col)) - 0.9
    const row0 = Math.min(...members.map((n) => n.row)) - 0.9
    const col1 = Math.max(...members.map((n) => n.col + n.w)) + 0.9
    const row1 = Math.max(...members.map((n) => n.row + n.h)) + 1.9
    const info = spec.groups?.[key]
    return {
      key,
      label: info?.label ?? key,
      caption: info?.caption,
      col: col0,
      row: row0,
      cols: col1 - col0,
      rows: row1 - row0,
    }
  })
}

/** The grid point at a distance (in cells) along an edge */
export function pointAlong(e: FlowEdge, distance: number): GridPoint {
  const { path, lengths } = e
  if (!path.length) return [0, 0]
  if (distance <= 0) return path[0]
  for (let i = 1; i < path.length; i++) {
    if (distance <= lengths[i]) {
      const t = (distance - lengths[i - 1]) / (lengths[i] - lengths[i - 1] || 1)
      return [
        path[i - 1][0] + (path[i][0] - path[i - 1][0]) * t,
        path[i - 1][1] + (path[i][1] - path[i - 1][1]) * t,
      ]
    }
  }
  return path[path.length - 1]
}

/** The part of an edge's path between two distances */
export function subPath(e: FlowEdge, d0: number, d1: number): GridPoint[] {
  const points: GridPoint[] = [pointAlong(e, d0)]
  for (let i = 1; i < e.path.length - 1; i++) {
    if (e.lengths[i] > d0 && e.lengths[i] < d1) points.push(e.path[i])
  }
  points.push(pointAlong(e, d1))
  return points
}

/** All nodes upstream and downstream of a node */
export function lineage(node: FlowNode): Set<FlowNode> {
  const result = new Set<FlowNode>([node])
  const walk = (n: FlowNode, next: (n: FlowNode) => FlowNode[]) => {
    for (const m of next(n)) {
      if (result.has(m)) continue
      result.add(m)
      walk(m, next)
    }
  }
  walk(node, (n) => n.in.filter((e) => !e.back).map((e) => e.from))
  walk(node, (n) => n.out.filter((e) => !e.back).map((e) => e.to))
  return result
}
