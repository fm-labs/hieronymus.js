import type { GameConfig } from '@fmlabs/hieronymus'
import { CameraSystem, Game, InputSystem, TileMapSystem } from '@fmlabs/hieronymus'
import { SAMPLES } from './isoflow.samples.ts'
import type { FlowSpec } from './isoflow.types.ts'
import { FlowProjection } from './isoflow.draw.ts'
import isoFlowWorldBuilder from './isoflow.world.ts'
import { IsoFlowSystem } from './IsoFlowSystem.ts'

const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&display=swap'

/** The card text is drawn on the canvas, so the fonts must be there before the first frame */
async function loadFonts() {
  if (!document.querySelector(`link[href="${FONTS_URL}"]`)) {
    const $link = document.createElement('link')
    $link.rel = 'stylesheet'
    $link.href = FONTS_URL
    document.head.appendChild($link)
  }
  const fonts = [
    '600 26px Inter',
    '500 14px Inter',
    '600 13px "JetBrains Mono"',
    '500 14px "JetBrains Mono"',
  ]
  // offline, the fallback fonts do
  await Promise.race([
    Promise.all(fonts.map((f) => document.fonts.load(f))).catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ])
}

/**
 * The workflow named by the URL: ?graph=<url> a JSON file in the FlowSpec format,
 * ?flow=<id> one of the samples (sync, ci, etl, ml, agent). ?select=<node id> flies to a node.
 */
async function loadFlow(
  params: URLSearchParams,
): Promise<{ spec: FlowSpec; current: string; source?: string }> {
  const url = params.get('graph')
  if (url) {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`${url}: ${response.status}`)
      const spec = (await response.json()) as FlowSpec
      if (!Array.isArray(spec?.nodes) || !Array.isArray(spec?.edges)) {
        throw new Error(`${url}: not a workflow (needs nodes and edges)`)
      }
      const title = spec.title || (url.split('/').pop() ?? 'Workflow')
      return { spec: { ...spec, title, id: 'custom' }, current: 'custom', source: url }
    } catch (e) {
      console.warn('isoflow: workflow not loaded, showing a sample', e)
    }
  }
  const id = params.get('flow')
  const spec = SAMPLES.find((s) => s.id === id) ?? SAMPLES[0]
  return { spec, current: spec.id! }
}

/** A launcher for the workflow world, drawn isometric ('isoflow') or top-down ('flow') */
export const createFlowLauncher =
  (options: { id: string; name: string; projection: FlowProjection }) =>
  async (app: HTMLDivElement) => {
    const config: GameConfig = {
      id: options.id,
      name: options.name,
      fullscreen: true,
      camera: { minZoom: 0.12, maxZoom: 3 },
    }
    const game = new Game(app, config)

    game.addSystem(new InputSystem(game))
    // WASD and the mouse wheel pan, ctrl/cmd + wheel zooms
    game.addSystem(new CameraSystem(game))

    const params = new URLSearchParams(window.location.search)
    const [{ spec, current, source }] = await Promise.all([loadFlow(params), loadFonts()])
    const world = isoFlowWorldBuilder(spec, options.projection)
    // added before the TileMapSystem, so each frame draws the state of the same frame
    game.addSystem(
      new IsoFlowSystem(game, world, {
        samples: SAMPLES,
        current,
        source,
        select: params.get('select') ?? undefined,
        brand: options.name,
      }),
    )
    game.addSystem(new TileMapSystem(game, world.tileMap))

    return game
  }

export const isoflowGameLauncher = createFlowLauncher({
  id: 'isoflow',
  name: 'IsoFlow',
  projection: FlowProjection.iso,
})
