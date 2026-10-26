import type { GameConfig } from '../../../lib/game.types'
import { CameraSystem, Game, InputSystem, TileMapSystem } from '../../../lib'
import { SAMPLES } from './isocontainers.samples.ts'
import { toEnvironments } from './isocontainers.import.ts'
import type { ContainersSpec } from './isocontainers.types.ts'
import { parseRules, type StyleRule } from './isocontainers.styles.ts'
import isoContainersWorldBuilder from './isocontainers.world.ts'
import { IsoContainersSystem } from './IsoContainersSystem.ts'

const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&display=swap'

/** The text on the roofs is drawn on the canvas, so the fonts must be there before the first frame */
async function loadFonts() {
  if (!document.querySelector(`link[href="${FONTS_URL}"]`)) {
    const $link = document.createElement('link')
    $link.rel = 'stylesheet'
    $link.href = FONTS_URL
    document.head.appendChild($link)
  }
  const fonts = [
    '600 19px Inter',
    '700 40px Inter',
    '600 11px "JetBrains Mono"',
    '700 15px "JetBrains Mono"',
  ]
  // offline, the fallback fonts do
  await Promise.race([
    Promise.all(fonts.map((f) => document.fonts.load(f))).catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ])
}

/**
 * The environments named by the URL:
 * ?graph=<url>[,<url>…] JSON files, one host each: docker inspect output, docker compose config output,
 * or a ContainersSpec; ?stack=<id> one of the samples (shop, fleet, states, devbox).
 */
async function loadSpec(
  params: URLSearchParams,
): Promise<{ spec: ContainersSpec; current: string; source?: string }> {
  const graph = params.get('graph')
  if (graph) {
    try {
      const urls = graph.split(',').filter(Boolean)
      const environments = (
        await Promise.all(
          urls.map(async (url) => {
            const response = await fetch(url)
            if (!response.ok) throw new Error(`${url}: ${response.status}`)
            const name = (url.split('/').pop() ?? 'host').replace(/\.json$/, '')
            return toEnvironments(await response.json(), name)
          }),
        )
      ).flat()
      const spec: ContainersSpec = {
        id: 'custom',
        title:
          environments.length > 1 ? `${environments.length} hosts.` : `${environments[0].name}.`,
        subtitle: `${environments.reduce((n, e) => n + (e.containers?.length ?? 0), 0)} containers, from ${urls.length > 1 ? `${urls.length} files` : urls[0]}`,
        environments,
      }
      return { spec, current: 'custom', source: graph }
    } catch (e) {
      console.warn('isocontainers: environment not loaded, showing a sample', e)
    }
  }
  const id = params.get('stack')
  const spec = SAMPLES.find((s) => s.id === id) ?? SAMPLES[0]
  return { spec, current: spec.id! }
}

/** ?styles=<url>: building style rules, a JSON array (or { rules: [...] }) */
async function loadStyles(params: URLSearchParams): Promise<StyleRule[]> {
  const url = params.get('styles')
  if (!url) return []
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`${url}: ${response.status}`)
    return parseRules(await response.json())
  } catch (e) {
    console.warn('isocontainers: styles not loaded', e)
    return []
  }
}

export const isocontainersGameLauncher = async (app: HTMLDivElement) => {
  const config: GameConfig = {
    id: 'isocontainers',
    name: 'IsoContainers',
    fullscreen: true,
    camera: { minZoom: 0.12, maxZoom: 3 },
  }
  const game = new Game(app, config)

  game.addSystem(new InputSystem(game))
  // WASD and the mouse wheel pan, ctrl/cmd + wheel zooms
  game.addSystem(new CameraSystem(game))

  const params = new URLSearchParams(window.location.search)
  const [{ spec, current, source }, styleRules] = await Promise.all([
    loadSpec(params),
    loadStyles(params),
    loadFonts(),
  ])
  const world = isoContainersWorldBuilder(spec)
  // added before the TileMapSystem, so each frame draws the state of the same frame
  game.addSystem(
    new IsoContainersSystem(game, world, {
      samples: SAMPLES,
      current,
      source,
      select: params.get('select') ?? undefined,
      zoom: Number(params.get('zoom')) || undefined,
      styleRules,
      advisor: params.has('advisor'),
    }),
  )
  game.addSystem(new TileMapSystem(game, world.tileMap))

  return game
}
