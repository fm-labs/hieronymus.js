type AwsGraphData = {
  nodes: {
    id: number
    item_id: string
    type: string
    label: string
    pos?: [number, number] // the map position (col, row)
  }[]
  edges: {
    from: number
    to: number
    label: string
  }[]
}
