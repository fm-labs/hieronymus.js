import type { IGame, TileMapConfig, ITileMap } from '@fmlabs/world'
import { IsoCubeComponent, IsoCylinderComponent, SpriteComponent, TileMap } from '@fmlabs/world'
import { IsoTextComponent } from '@fmlabs/world'
import { TileComponent } from '@fmlabs/world'
import { LineComponent } from '@fmlabs/world'
import { AwsItemComponent } from './AwsItemComponent.ts'

const awsgraphWorldBuilder = async (game: IGame, graphData: AwsGraphData): Promise<ITileMap> => {
  const ROWS = 350
  const COLUMNS = 350
  const TILE_SIZE = 64

  const LAYER_TILES = 0
  //const LAYER_UNDERGROUND = 1
  //const LAYER_GROUND = 2
  const LAYER_LABELS = 3
  const LAYER_BUILDINGS = 4
  //const LAYER_OBJECTS = 5

  const resources = game.resources

  // Init resources
  await resources.loadSpritesheet(
    'fm_iso_buildings',
    '/assets/sprites/fm_iso_buildings/fm_iso_buildings.png',
    '/assets/sprites/fm_iso_buildings/fm_iso_buildings.json',
    1,
  )
  await resources.loadSpritesheet(
    'fm_iso_pyramids',
    '/assets/sprites/fm_iso_pyramids/fm_iso_pyramids.png',
    '/assets/sprites/fm_iso_pyramids/fm_iso_pyramids.json',
    32,
  )
  await resources.loadTilesheet('mech-up', '/assets/sprites/mechanoid/Walk_Body_045.png', 6, 4, 64)
  await resources.loadTilesheet('mech-left', '/assets/sprites/mechanoid/Walk_Body_135.png', 6, 4)
  await resources.loadTilesheet('mech-down', '/assets/sprites/mechanoid/Walk_Body_225.png', 6, 4)
  await resources.loadTilesheet('mech-right', '/assets/sprites/mechanoid/Walk_Body_315.png', 6, 4)

  await resources.loadFont('BungeeSpice', '/assets/fonts/Bungee_Spice/BungeeSpice-Regular.ttf')
  await resources.loadFont('Tektur', '/assets/fonts/Tektur/Tektur-VariableFont_wdth,wght.ttf')

  const worldConfig: TileMapConfig = {
    columns: COLUMNS,
    rows: ROWS,
    tileSize: TILE_SIZE,
    //projection: 'orthogonal',
    projection: 'isometric',
  }
  const worldMap = new TileMap(worldConfig)

  // Init layers
  worldMap.addLayer(LAYER_TILES, { name: 'Tiles', type: 'TILE', data: [] })
  //worldMap.addLayer(LAYER_UNDERGROUND, { name: 'Underground', type: 'TILE', data: [] })
  //worldMap.addLayer(LAYER_GROUND, { name: 'Ground', type: 'TILE', data: [] })
  worldMap.addLayer(LAYER_LABELS, { name: 'Labels', type: 'OBJECT', data: [] })
  worldMap.addLayer(LAYER_BUILDINGS, { name: 'Buildings', type: 'TILE', data: [] })
  //worldMap.addLayer(LAYER_OBJECTS, { name: 'Objects', type: 'OBJECT', data: [] })

  worldMap.addObjectAtGridPos(
    LAYER_LABELS,
    0,
    0,
    new IsoTextComponent({
      text: 'AWS Inventory',
      font: '48px Tektur',
      orientation: 'horizontal',
    }),
  )
  //
  // const usedPositions = new Set<string>()
  //
  // const getRandomPosition = (): [number, number] => {
  //   let col: number, row: number, key: string
  //   do {
  //     col = Math.floor(Math.random() * COLUMNS)
  //     row = Math.floor(Math.random() * ROWS)
  //     key = `${col},${row}`
  //   } while (usedPositions.has(key))
  //   usedPositions.add(key)
  //   return [col, row]
  // }

  let lastCol = 0
  let lastRow = -1

  // const groupedNodes: { [key: string]: any[] } = {}
  // graphData.nodes.forEach((node) => {
  //   const typeGroup = node.type.split('::')[1] || 'Other'
  //   if (!groupedNodes[typeGroup]) {
  //     groupedNodes[typeGroup] = []
  //   }
  //   groupedNodes[typeGroup].push(node)
  // })

  //Object.entries(groupedNodes).forEach(([type, nodes]) => {})

  const typeSections = new Map<number, string>()

  let lastType = ''
  const mappedNodes = graphData.nodes
    .sort((a, b) => a.type.localeCompare(b.type))
    .map((node, index) => {
      //const row = Math.floor(index / COLUMNS) + 1
      //const col = index % COLUMNS
      let col = lastCol++
      if (col >= COLUMNS - 1) {
        col = 0
        lastCol = 0
        lastRow++
      }
      let row = lastRow
      if (node.type !== lastType) {
        lastType = node.type
        lastRow += 2
        row = lastRow
        lastCol = 0
        col = 0
        typeSections.set(row, node.type)
      }

      return { ...node, pos: [col, row] }
    })

  mappedNodes.forEach((item, index) => {
    if (!item.pos) {
      console.warn('Item has no position, skipping', item)
      return
    }
    const [colNr, rowNr] = item.pos

    if (item.type === 'AWS::EC2::Instance') {
      const _tile = new TileComponent({
        width: worldMap.tileWidth,
        height: worldMap.tileHeight,
        backgroundColor: 'rgb(213,32,32)',
      })
      worldMap.addTile(LAYER_TILES, colNr, rowNr, _tile)

      const _sprite = new SpriteComponent({
        tileSize: worldMap.tileWidth,
        spriteId: 6,
        data: item,
      })
      worldMap.addTile(LAYER_BUILDINGS, colNr, rowNr, _sprite)
    } else if (item.type.startsWith('AWS::RDS')) {
      worldMap.createTile(LAYER_TILES, colNr, rowNr, { backgroundColor: 'rgb(82,124,181)' })
      worldMap.addTile(
        LAYER_BUILDINGS,
        colNr,
        rowNr,
        new IsoCylinderComponent({
          tileSize: worldMap.tileWidth,
          radius: worldMap.tileWidth / 4,
          depth: 32,
          //text: 'M4',
        }),
      )
    } else if (item.type.startsWith('AWS::S3')) {
      worldMap.createTile(LAYER_TILES, colNr, rowNr, { backgroundColor: 'rgb(18,236,11)' })
      worldMap.addTile(
        LAYER_BUILDINGS,
        colNr,
        rowNr,
        new IsoCubeComponent({
          tileSize: worldMap.tileWidth,
          width: worldMap.tileWidth / 2,
          depth: 32,
          //text: 'M4',
        }),
      )
    } else {
      worldMap.createTile(LAYER_TILES, colNr, rowNr, { backgroundColor: 'rgba(112,110,112,0.53)' })
      worldMap.addTile(
        LAYER_BUILDINGS,
        colNr,
        rowNr,
        new AwsItemComponent({
          tileSize: worldMap.tileWidth,
        }),
      )
    }

    worldMap.addObjectAtGridPos(
      LAYER_LABELS,
      colNr + 1,
      rowNr + 1,
      new IsoTextComponent({
        text: String(item.id),
        font: '10px Arial',
        orientation: 'vertical',
        skewOrientation: 'upright',
        color: 'rgb(255,255,255)',
      }),
    )
  })

  // Draw connections
  graphData.edges.forEach((edge) => {
    const fromNode = mappedNodes.find((n) => n.id === edge.from)
    const toNode = mappedNodes.find((n) => n.id === edge.to)
    if (fromNode?.pos && toNode?.pos) {
      const [fromCol, fromRow] = fromNode.pos
      const [toCol, toRow] = toNode.pos

      worldMap.addObjectAtGridPos(
        LAYER_LABELS,
        fromCol,
        fromRow,
        new LineComponent({
          to: [
            worldMap.projection.mapGridToScreen(toCol, fromRow),
            worldMap.projection.mapGridToScreen(toCol, toRow),
          ],
          strokeColor: 'rgba(255,255,255,0.5)',
          lineWidth: 2,
          offset: { x: 0, y: worldMap.tileHeight / 2 },
        }),
      )
    }
  })

  // draw section labels
  typeSections.forEach((typeName, rowNr) => {
    worldMap.addObjectAtGridPos(
      LAYER_LABELS,
      0,
      rowNr,
      new IsoTextComponent({
        text: typeName,
        font: '24px Tektur',
        orientation: 'horizontal',
        color: 'rgb(255, 255, 255)',
      }),
    )
  })

  game.data = {
    nodes: mappedNodes,
    edges: graphData.edges,
  }

  return worldMap
}

export default awsgraphWorldBuilder
