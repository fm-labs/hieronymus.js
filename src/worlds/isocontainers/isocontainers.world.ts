import type { IGameComponent, ITileMap, TileMapConfig } from '../../../lib/game.types'
import { TileMap } from '../../../lib'
import { buildContainersModel } from './isocontainers.layout.ts'
import { FlowProjection, type ContainersScene } from './isocontainers.draw.ts'
import type { ContainersModel, ContainersSpec } from './isocontainers.types.ts'
import { IsoContainersGroundComponent } from './IsoContainersGroundComponent.ts'
import { IsoContainerBuildingComponent } from './IsoContainerBuildingComponent.ts'
import { IsoContainerVolumeComponent } from './IsoContainerVolumeComponent.ts'
import { IsoContainersGateComponent } from './IsoContainersGateComponent.ts'
import { IsoContainersOverlayComponent } from './IsoContainersOverlayComponent.ts'

export const ISOCONTAINERS_TILE_SIZE = 64

export const LAYER_GROUND = 0
export const LAYER_STRUCTURES = 1
export const LAYER_OVERLAY = 2

export type ContainersWorld = {
  tileMap: ITileMap
  model: ContainersModel
  /** Shared by all components, the system updates it every frame */
  scene: ContainersScene
}

/** Lays out the environments and builds the world: the ground, a building per container, a tank per volume */
const isoContainersWorldBuilder = (spec: ContainersSpec): ContainersWorld => {
  const model = buildContainersModel(spec)
  const config: TileMapConfig = {
    columns: model.columns,
    rows: model.rows,
    tileSize: ISOCONTAINERS_TILE_SIZE,
    projection: 'isometric',
  }
  const tileMap = new TileMap(config)
  const scene: ContainersScene = {
    time: 0,
    view: { x0: -1e9, y0: -1e9, x1: 1e9, y1: 1e9 },
    projection: FlowProjection.iso,
    zoom: 1,
    advice: new Map(),
    allAdvice: false,
    showAdvice: true,
    showCrossHost: true,
    popups: [],
    plates: new Map(),
  }

  // the ground is one flat component; everything standing is depth sorted; arcs and labels on top
  tileMap.addLayer(LAYER_GROUND, { name: 'Ground', type: 'TILE', data: [] })
  tileMap.addLayer(LAYER_STRUCTURES, {
    name: 'Structures',
    type: 'OBJECT',
    data: [],
    depthSort: true,
  })
  tileMap.addLayer(LAYER_OVERLAY, { name: 'Overlay', type: 'OBJECT', data: [] })

  tileMap.addTile(LAYER_GROUND, 0, 0, new IsoContainersGroundComponent({ model, scene }))

  // adding an object moves it to its cell; the components sort by their own position, so set it again
  const place = (component: IGameComponent) => {
    const [x, y] = [component.x, component.y]
    tileMap.addObjectAtGridPos(LAYER_STRUCTURES, 0, 0, component)
    component.setPosition(x, y)
  }
  for (const container of model.containers)
    place(new IsoContainerBuildingComponent({ container, scene }))
  for (const volume of model.volumes) place(new IsoContainerVolumeComponent({ volume, scene }))
  for (const env of model.environments) place(new IsoContainersGateComponent({ env, scene }))

  tileMap.addObjectAtGridPos(
    LAYER_OVERLAY,
    0,
    0,
    new IsoContainersOverlayComponent({ model, scene }),
  )
  return { tileMap, model, scene }
}

export default isoContainersWorldBuilder
