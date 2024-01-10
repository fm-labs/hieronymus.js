import { WorldMap } from '../../../lib/map/WorldMap.ts'
import { SpriteComponent } from '../../../lib/components/SpriteComponent.ts'
import { TextComponent } from '../../../lib/components/TextComponent.ts'
import { IsoCubeComponent } from '../../../lib/components/IsoCubeComponent.ts'
import { IsoHexagonComponent } from '../../../lib/components/IsoHexagonComponent.ts'
import { IsoCylinderComponent } from '../../../lib/components/IsoCylinderComponent.ts'

const awsWorldBuilder = async (resources: IGameResources): Promise<IWorldMap> => {
  const LAYER_TILES = 0
  const LAYER_UNDERGROUND = 1
  const LAYER_GROUND = 2
  const LAYER_LABELS = 3
  const LAYER_OBJECTS = 4

  // Init resources
  await resources.loadSpritesheet('/assets/sprites/fm_iso_buildings/fm_iso_buildings.png')
  await resources.loadSpritesheet('/assets/sprites/fm_iso_pyramids/fm_iso_pyramids.png')
  await resources.loadFont('BungeeSpice', '/assets/fonts/Bungee_Spice/BungeeSpice-Regular.ttf')
  await resources.loadFont('Tektur', '/assets/fonts/Tektur/Tektur-VariableFont_wdth,wght.ttf')

  const worldConfig: WorldMapConfig = { columns: 9, rows: 9, tileSize: 128, projection: 'dimetric' }
  const worldMap = new WorldMap(worldConfig)

  // Init layers
  worldMap.addLayer(LAYER_TILES, { name: 'Tiles', type: 'TILELAYER', data: [] })
  worldMap.addLayer(LAYER_UNDERGROUND, { name: 'Underground', type: 'TILELAYER', data: [] })
  worldMap.addLayer(LAYER_GROUND, { name: 'Ground', type: 'TILELAYER', data: [] })
  worldMap.addLayer(LAYER_LABELS, { name: 'Labels', type: 'OBJECTLAYER', data: [] })
  worldMap.addLayer(LAYER_OBJECTS, { name: 'Objects', type: 'OBJECTLAYER', data: [] })

  // tile layer
  worldMap.addTile(LAYER_TILES, 0, 0, { backgroundColor: 'rgba(255,242,0,0.27)' })
  worldMap.addTile(LAYER_TILES, 1, 0, { backgroundColor: 'rgba(255,0,106,0.5)' })
  worldMap.addTile(LAYER_TILES, 0, 1, { backgroundColor: 'rgba(0,81,255,0.5)' })
  worldMap.addTile(LAYER_TILES, 1, 1, {})

  // ground layer
  worldMap.setTile(
    LAYER_GROUND,
    0,
    0,
    new SpriteComponent({
      tileSize: worldMap.tileWidth,
      spriteImage: resources.getSprite(6),
    }),
  )
  worldMap.setTile(
    LAYER_GROUND,
    1,
    0,
    new SpriteComponent({
      tileSize: worldMap.tileWidth,
      spriteImage: resources.getSprite(7),
    }),
  )
  worldMap.setTile(
    LAYER_GROUND,
    0,
    1,
    new SpriteComponent({
      tileSize: worldMap.tileWidth,
      spriteImage: resources.getSprite(8),
    }),
  )

  // LABELS layer
  worldMap.addObjectAt(
    LAYER_LABELS,
    4,
    4,
    new TextComponent({
      text: 'Bungee Spice',
      font: '48px BungeeSpice',
      orientation: 'horizontal',
      skewOrientation: 'upright',
    }),
  )

  worldMap.addObjectAt(
    LAYER_LABELS,
    0,
    3,
    new TextComponent({
      text: 'Tektur Font',
      font: '48px Tektur',
      orientation: 'horizontal',
    }),
  )

  worldMap.addObjectAt(
    LAYER_LABELS,
    2,
    8,
    new TextComponent({
      text: 'Funky Town',
      font: '48px Arial',
      orientation: 'vertical',
    }),
  )

  // OBJECT layer
  worldMap.addObjectAt(
    LAYER_OBJECTS,
    1,
    1,
    new IsoCubeComponent({
      tileSize: worldMap.tileWidth,
      width: worldMap.tileWidth / 2,
      depth: 32,
      //text: 'M4',
    }),
  )
  worldMap.addObjectAt(
    LAYER_OBJECTS,
    2,
    1,
    new IsoHexagonComponent({
      tileSize: worldMap.tileWidth,
      width: worldMap.tileWidth / 2,
      depth: 32,
    }),
  )
  worldMap.addObjectAt(
    LAYER_OBJECTS,
    2,
    1,
    new IsoHexagonComponent({
      tileSize: worldMap.tileWidth,
      width: worldMap.tileWidth / 2,
      depth: 32,
    }),
  )
  worldMap.addObjectAt(
    LAYER_OBJECTS,
    3,
    1,
    new IsoCylinderComponent({
      tileSize: worldMap.tileWidth,
      radius: 32,
      depth: 32,
    }),
  )

  return worldMap
}

export default awsWorldBuilder
