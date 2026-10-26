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
  /** Everything standing (buildings, tanks, gates): moved when the plates are laid out again */
  structures: Array<{ syncPosition(): void }>
  /** The components drawn from the model: swapped by `rebuildWorld` */
  parts: {
    ground: IsoContainersGroundComponent
    overlay: IsoContainersOverlayComponent
    /** The ids of the structures in the tile map */
    ids: number[]
  }
}

/** A building per container, a tank per volume and a gate per host, in the structures layer */
function addStructures(world: Pick<ContainersWorld, 'tileMap' | 'model' | 'scene'>) {
  const { tileMap, model, scene } = world
  // adding an object moves it to its cell; the components sort by their own position, so set it again
  const structures: ContainersWorld['structures'] = []
  const ids: number[] = []
  const place = (component: IGameComponent & { syncPosition(): void }) => {
    ids.push(tileMap.addObjectAtGridPos(LAYER_STRUCTURES, 0, 0, component))
    component.syncPosition()
    structures.push(component)
  }
  for (const container of model.containers)
    place(new IsoContainerBuildingComponent({ container, scene }))
  for (const volume of model.volumes) place(new IsoContainerVolumeComponent({ volume, scene }))
  for (const env of model.environments) place(new IsoContainersGateComponent({ env, scene }))
  return { structures, ids }
}

/**
 * Build the world of a changed spec into the same tile map (the live stack, when containers come and
 * go): a new model, new structures; the ground and the overlay draw the new model. The scene stays;
 * what it holds of the old model is for the caller to move over.
 */
export function rebuildWorld(world: ContainersWorld, spec: ContainersSpec): ContainersModel {
  const old = world.model
  for (const id of world.parts.ids) world.tileMap.removeObject(LAYER_STRUCTURES, id)
  world.model = buildContainersModel(spec)
  const { structures, ids } = addStructures(world)
  world.structures = structures
  world.parts.ids = ids
  world.parts.ground.properties.model = world.model
  world.parts.overlay.properties.model = world.model
  return old
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
    showLog: true,
    popups: [],
    plates: new Map(),
    hidden: new Set(),
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

  const ground = new IsoContainersGroundComponent({ model, scene })
  tileMap.addTile(LAYER_GROUND, 0, 0, ground)
  const { structures, ids } = addStructures({ tileMap, model, scene })
  const overlay = new IsoContainersOverlayComponent({ model, scene })
  tileMap.addObjectAtGridPos(LAYER_OVERLAY, 0, 0, overlay)
  return { tileMap, model, scene, structures, parts: { ground, overlay, ids } }
}

export default isoContainersWorldBuilder
