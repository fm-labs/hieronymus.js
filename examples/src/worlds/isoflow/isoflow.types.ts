/**
 * The data model of the 'isoflow' world: a workflow is a directed graph of nodes and edges.
 * Specs are what a sample or a JSON file describes, the model adds the layout and the run state.
 */

export type NodeKind =
  | 'trigger'
  | 'task'
  | 'decision'
  | 'join'
  | 'database'
  | 'queue'
  | 'api'
  | 'client'
  | 'server'
  | 'model'
  | 'storage'
  | 'end'

export type FlowNodeSpec = {
  id: string
  /** The title on the card, defaults to the id */
  label?: string
  kind?: NodeKind
  /** The small uppercase caption above the card, defaults to the kind */
  caption?: string
  /** Nodes with the same group are framed together */
  group?: string
  /** Text rows on the card, e.g. code or messages */
  lines?: string[]
  /** A small table on the card */
  table?: { columns: string[]; rows: string[][] }
  /** Seconds a run of this node takes (batch mode) */
  duration?: number
  /** 0..1, the chance that a run fails (batch mode) */
  failRate?: number
  /** Card size in cells, along the flow (w) and across it (h) */
  w?: number
  h?: number
  /** Shown in the info pane */
  note?: string
}

/** An edge: an object, or [from, to] / [from, to, label] */
export type FlowEdgeSpec = { from: string; to: string; label?: string } | string[]

export type FlowSpec = {
  id?: string
  title: string
  subtitle?: string
  description?: string
  /** 'batch': the graph runs node by node, 'stream': events flow through it all the time */
  mode?: 'batch' | 'stream'
  nodes: FlowNodeSpec[]
  edges: FlowEdgeSpec[]
  groups?: Record<string, { label: string; caption?: string }>
}

export type NodeState = 'idle' | 'queued' | 'running' | 'success' | 'failed' | 'skipped' | 'live'
export type EdgeState = 'idle' | 'flowing' | 'done' | 'skipped'

/** A grid point: [col, row] */
export type GridPoint = [number, number]

export type FlowNode = {
  id: string
  label: string
  kind: NodeKind
  caption: string
  group?: string
  lines: string[]
  table?: { columns: string[]; rows: string[][] }
  duration: number
  failRate: number
  note?: string
  /** Footprint in cells */
  w: number
  h: number
  in: FlowEdge[]
  out: FlowEdge[]
  // layout: the back corner of the card, and its layer
  col: number
  row: number
  layer: number
  // run state
  state: NodeState
  /** 0..1 while running */
  progress: number
  /** Seconds of the last run */
  elapsed: number
  /** 1 when an event arrives, fades to 0 (stream mode) */
  flash: number
  /** Events handled (stream mode) */
  count: number
}

export type FlowEdge = {
  id: string
  from: FlowNode
  to: FlowNode
  label?: string
  /** Ignored by the layout and the runs, it closes a cycle */
  back: boolean
  /** The route on the card plane, in grid coordinates */
  path: GridPoint[]
  /** Cumulative length at each point of the path, in cells */
  lengths: number[]
  state: EdgeState
  /** 0..1 position of the data on the edge while it flows (batch mode) */
  progress: number
  /** Positions 0..1 of the events on the edge (stream mode) */
  pulses: Array<{ t: number; payload: string }>
}

export type FlowGroup = {
  key: string
  label: string
  caption?: string
  /** The frame on the ground, in grid coordinates */
  col: number
  row: number
  cols: number
  rows: number
}

export type FlowModel = {
  spec: FlowSpec
  title: string
  subtitle: string
  description: string
  mode: 'batch' | 'stream'
  nodes: FlowNode[]
  edges: FlowEdge[]
  byId: Map<string, FlowNode>
  groups: FlowGroup[]
  /** The size of the grid that holds the layout */
  columns: number
  rows: number
  /** Number of layers */
  depth: number
}

export const KIND_LABELS: Record<NodeKind, string> = {
  trigger: 'Trigger',
  task: 'Task',
  decision: 'Decision',
  join: 'Join',
  database: 'Database',
  queue: 'Queue',
  api: 'API',
  client: 'Client',
  server: 'Server logic',
  model: 'Model',
  storage: 'Storage',
  end: 'End',
}
