import {
  IsoCubeComponent,
  IsoCylinderComponent,
  IsoHexagonComponent,
  SpriteComponent,
  TileMap,
} from '../../../lib'
import { IsoTextComponent } from '../../../lib'
import { TileComponent } from '../../../lib/components/TileComponent.ts'

import containerData from './container.json'
import { ContainerComponent } from './ContainerComponent.ts'
import { TileMapComponent } from './TileMapComponent.ts'
import { TextComponent } from '../../../lib/components/TextComponent.ts'

const ROWS = 30
const COLUMNS = 30
const TILE_SIZE = 64

const LAYER_TILES = 0
//const LAYER_UNDERGROUND = 1
//const LAYER_GROUND = 2
const LAYER_LABELS = 3
const LAYER_BUILDINGS = 4
//const LAYER_OBJECTS = 5

// const buildContainerHostWorld = async (game: IGame, worldMap: TileMap, hostData: any) => {
//   const containerInventory: any[] = hostData?.containers || []
//   const host = hostData?.host || { id: 'unknown' }
//   const idx = hostData?.index || 0
//
//   //let rowNr = 0 + worldMap.activeCellPos[0]
//   //let colNr = 0 + worldMap.activeCellPos[1]
//   const rowNrStart = idx * 3
//   let rowNr = rowNrStart
//   let colNr = 0
//
//   worldMap.addTile(
//     LAYER_BUILDINGS,
//     colNr,
//     rowNr,
//     new IsoHexagonComponent({
//       tileSize: worldMap.tileWidth,
//       depth: 64,
//       sideLength: TILE_SIZE / 3,
//     }),
//   )
//   colNr++
//
//   containerInventory.forEach((container: any) => {
//     let tileColor = 'rgb(219,136,237)'
//     const status = container?.State?.Status?.toLowerCase() || 'unknown'
//     if (status === 'running') {
//       tileColor = 'rgb(136,237,149)'
//     } else if (status === 'stopped') {
//       tileColor = 'rgb(237,136,136)'
//     }
//
//     worldMap.createTile(LAYER_TILES, colNr, rowNr, { backgroundColor: tileColor })
//     worldMap.addTile(
//       LAYER_BUILDINGS,
//       colNr,
//       rowNr,
//       new ContainerComponent({
//         tileSize: worldMap.tileWidth,
//         width: worldMap.tileWidth / 2,
//         depth: 32,
//         //text: 'M4',
//         animated: container?.State?.Status?.toLowerCase() === 'running',
//       }),
//     )
//
//     colNr++
//     if (colNr >= 6) {
//       colNr = 1
//       rowNr++
//     }
//   })
//
//   worldMap.addObjectAtGridPos(
//     LAYER_LABELS,
//     0, // col
//     rowNrStart,
//     new TextComponent({
//       text: `${host.id}`,
//       font: '24px Tektur',
//       orientation: 'horizontal',
//       skewOrientation: 'upright',
//       color: 'rgb(231,255,255)',
//     }),
//   )
//
//   worldMap.activeCellPos = [rowNr, colNr]
//   // move active cell position down by 1 row and reset column to 0
//   //worldMap.activeCellPos[0] += 2
//   //worldMap.activeCellPos[1] = 0
// }
//
// const update = async (game: IGame, worldMap: TileMap, api: ContainerApi) => {
//   const containerHosts: any[] = await api.getContainerHosts()
//   console.log(containerHosts)
//   for (let h = 0; h < containerHosts.length; h++) {
//     const host = containerHosts[h]
//     let hostContainers: any[]
//     try {
//       hostContainers = await api.getContainerHostContainers(host.id)
//     } catch (e) {
//       hostContainers = []
//       console.error('Failed to fetch containers for host', host.id, e)
//     }
//     await buildContainerHostWorld(game, worldMap, {
//       index: h,
//       host: host,
//       containers: hostContainers,
//     })
//   }
//   console.log('Updating container world')
// }

const containerWorldBuilder = async (game: IGame): Promise<ITileMap> => {
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
    -2,
    -2,
    new IsoTextComponent({
      text: '👉 Kontainers',
      font: '48px Tektur',
      orientation: 'horizontal',
      skewOrientation: 'flat',
    }),
  )
  // worldMap.addObjectAtGridPos(
  //   LAYER_LABELS,
  //   0,
  //   0,
  //   new IsoTextComponent({
  //     text: '🥪 🎰 🗳️ 🐆 🐿️ 🪅 🚙 Kontainers',
  //     font: '96px Tektur',
  //     orientation: 'horizontal',
  //     skewOrientation: 'flat',
  //   }),
  // )
  // worldMap.addObjectAtGridPos(
  //   LAYER_LABELS,
  //   5,
  //   5,
  //   new TextComponent({
  //     text: '🏂🏿 🛩 🕹️ 🪂 🦄 🏥 🏰 🌴🕴🏻🏄🏿 ✈️ 🫟 🚁 🌏 🗼 🔊 🚀 🛰️ 📡 🚡 🥪 🎰 📦 🗳️ 🏟 🚢 🧞 🐆 🐿️ 🪅 🚙 Kontainers',
  //     font: '96px Tektur',
  //     orientation: 'horizontal',
  //   }),
  // )

  const areaDepth = 16
  worldMap.addTile(
    LAYER_BUILDINGS,
    COLUMNS / 2 - 1,
    ROWS / 2 - 1,
    new IsoCubeComponent({
      tileSize: worldMap.tileWidth,
      width: worldMap.tileWidth * COLUMNS,
      depth: areaDepth,
      offset: { x: 0, y: worldMap.tileHeight / 2 + areaDepth },
    }),
  )

  // worldMap.addObjectAtGridPos(
  //   LAYER_LABELS,
  //   1,
  //   1,
  //   new TileMapComponent({
  //     tileSize: TILE_SIZE,
  //   }),
  // )

  worldMap.activeCellPos = [0, 0]

  //await initHosts(game, worldMap, api)
  //await update(game, worldMap, api)
  // // single update to initially build the world
  // //await update(game, worldMap, api)
  // setTimeout(async () => {
  //   await update(game, worldMap, api)
  // }, 1000)
  //
  // // regular updates every 30 seconds
  // setInterval(async () => {
  //   await update(game, worldMap, api)
  // }, 30000)

  // worldMap.addObjectAtGridPos(
  //   LAYER_LABELS,
  //   colNr,
  //   rowNr,
  //   new TextComponent({
  //     text: service.label + ' (' + serviceIds.length + '/' + inventory.length + ')',
  //     font: '24px Tektur',
  //     orientation: 'horizontal',
  //     color: 'rgb(255, 255, 255)',
  //   }),
  // )

  // const points = containerInventory?.points as Array<{ id: string; x: number; y: number }>
  //
  // points.forEach((point, pindex) => {
  //   const item: any = containerInventory?.index[point.id] || null
  //   if (!item) return
  //
  //   const colNr = point.x
  //   const rowNr = point.y
  //
  //   if (item?.category === 'church') {
  //     const _tile = new TileComponent({
  //       width: worldMap.tileWidth,
  //       height: worldMap.tileHeight,
  //       backgroundColor: 'rgb(213,32,32)',
  //     })
  //     worldMap.addTile(LAYER_TILES, colNr, rowNr, _tile)
  //
  //     const _sprite = new SpriteComponent({
  //       tileSize: worldMap.tileWidth,
  //       spriteId: 6,
  //       data: item,
  //     })
  //     worldMap.addTile(LAYER_BUILDINGS, colNr, rowNr, _sprite)
  //   } else if (item?.category.startsWith('museum')) {
  //     worldMap.createTile(LAYER_TILES, colNr, rowNr, { backgroundColor: 'rgb(82,124,181)' })
  //     worldMap.addTile(
  //       LAYER_BUILDINGS,
  //       colNr,
  //       rowNr,
  //       new IsoCylinderComponent({
  //         tileSize: worldMap.tileWidth,
  //         radius: worldMap.tileWidth / 4,
  //         depth: 32,
  //         //text: 'M4',
  //       }),
  //     )
  //   } else {
  //     worldMap.createTile(LAYER_TILES, colNr, rowNr, { backgroundColor: 'rgb(219,136,237)' })
  //     worldMap.addTile(
  //       LAYER_BUILDINGS,
  //       colNr,
  //       rowNr,
  //       new IsoCubeComponent({
  //         tileSize: worldMap.tileWidth,
  //         width: worldMap.tileWidth / 2,
  //         depth: 32,
  //         //text: 'M4',
  //       }),
  //     )
  //   }
  // })

  return worldMap
}

export default containerWorldBuilder
