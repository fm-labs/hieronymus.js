import type { GameConfig } from '../../../lib/game.types'
import { CameraSystem, Game, InputSystem, TileMapSystem } from '../../../lib'
import isoIslandsWorldBuilder, { CLASSIC_ISLANDS_MAP } from './isoislands.world.ts'
import { generateIslandMap, randomSeed, type IslandMap } from './isoislands.generator.ts'

const intParam = (params: URLSearchParams, name: string): number | undefined => {
  const value = parseInt(params.get(name) ?? '', 10)
  return Number.isFinite(value) ? value : undefined
}

/**
 * URL parameters:
 * - map=classic: the hand-drawn map, all other parameters are ignored
 * - cols, rows: grid size (12 to 128, default 24)
 * - seed: the same seed creates the same map (random when omitted)
 * - islands: how many islands to try to place
 */
const islandMapFromUrl = (params: URLSearchParams): IslandMap => {
  if (params.get('map') === 'classic') return CLASSIC_ISLANDS_MAP
  return generateIslandMap({
    columns: intParam(params, 'cols'),
    rows: intParam(params, 'rows'),
    seed: intParam(params, 'seed'),
    islandCount: intParam(params, 'islands'),
  })
}

/** A small overlay showing the seed of the map, with links to reload it or create a new one */
const createMapInfo = (app: HTMLDivElement, map: IslandMap, params: URLSearchParams) => {
  const link = (seed: number) => {
    const linkParams = new URLSearchParams(params)
    linkParams.delete('map')
    linkParams.set('seed', String(seed))
    return `?${linkParams.toString()}`
  }

  const $info = document.createElement('div')
  $info.style.cssText =
    'position:absolute;right:10px;bottom:10px;z-index:10;padding:6px 10px;' +
    'background:rgba(0,0,0,0.5);color:white;font:12px Arial;border-radius:4px'
  const title =
    params.get('map') === 'classic'
      ? 'classic map'
      : `${map.columns}×${map.rows}, ${map.islands.length} islands, ` +
        `seed <a style="color:#9cf" href="${link(map.seed)}">${map.seed}</a>`
  $info.innerHTML = `${title} · <a style="color:#9cf" href="${link(randomSeed())}">new map</a>`
  app.appendChild($info)
}

export const isoislandsGameLauncher = async (app: HTMLDivElement) => {
  const config: GameConfig = { id: 'isoislands', name: 'Iso Islands', fullscreen: true }
  const game = new Game(app, config)

  game.addSystem(new InputSystem(game))
  // WASD and the mouse wheel pan, ctrl/cmd + wheel zooms
  game.addSystem(new CameraSystem(game))

  const params = new URLSearchParams(window.location.search)
  const map = islandMapFromUrl(params)
  console.log('isoislands map', map.columns, map.rows, 'seed', map.seed)

  const tileMap = await isoIslandsWorldBuilder(map)
  game.addSystem(new TileMapSystem(game, tileMap))
  createMapInfo(app, map, params)

  return game
}
