import type { GameConfig } from '../../../lib/game.types'
import { CameraSystem, Game, InputSystem, TileMapSystem } from '../../../lib'
import type { InventoryItem } from './isoaws.inventory.ts'
import { sampleInventory } from './isoaws.sample.ts'
import isoAwsWorldBuilder, { LAYER_PACKETS } from './isoaws.world.ts'
import { IsoAwsSystem } from './IsoAwsSystem.ts'

/** The inventories in public/aws/data/<account>.json (gitignored, so they may be missing) */
const ACCOUNTS = [
  '042427660686',
  '080763232051',
  '177345470674',
  '421445461222',
  '665944621425',
  '695295900440',
  '703382906122',
  '731727419474',
  '928655916478',
  '958035588061',
]
const DEFAULT_ACCOUNT = '928655916478'

const fetchInventory = async (url: string): Promise<InventoryItem[]> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url}: ${response.status}`)
  // the dev server answers missing files with the index page, which is not JSON
  const items = await response.json()
  if (!Array.isArray(items)) throw new Error(`${url}: not an inventory list`)
  return items
}

/**
 * Loads the inventory named by the URL, falling back to the demo data:
 * ?inventory=<url> any inventory file, ?account=<id> one of public/aws/data, ?account=all all of them,
 * ?account=demo the made-up sample. ?theme=day starts by day, ?select=<id> flies to a VPC, subnet or resource.
 */
async function loadInventory(params: URLSearchParams) {
  const inventory = params.get('inventory')
  const account = params.get('account') ?? DEFAULT_ACCOUNT
  try {
    if (inventory) return { items: await fetchInventory(inventory), source: inventory, current: '' }
    if (account === 'all') {
      const all = await Promise.all(
        ACCOUNTS.map((a) => fetchInventory(`/aws/data/${a}.json`).catch(() => [])),
      )
      const items = all.flat()
      if (items.length) return { items, source: '/aws/data/*.json', current: 'all' }
    } else if (account !== 'demo') {
      const url = `/aws/data/${account}.json`
      return { items: await fetchInventory(url), source: url, current: account }
    }
  } catch (e) {
    console.warn('isoaws: inventory not found, showing the demo data', e)
  }
  return { items: sampleInventory(), source: 'demo data (made up)', current: 'demo' }
}

export const isoawsGameLauncher = async (app: HTMLDivElement) => {
  const config: GameConfig = { id: 'isoaws', name: 'Iso AWS', fullscreen: true }
  const game = new Game(app, config)

  game.addSystem(new InputSystem(game))
  // WASD and the mouse wheel pan, ctrl/cmd + wheel zooms
  game.addSystem(new CameraSystem(game))

  const params = new URLSearchParams(window.location.search)
  const { items, source, current } = await loadInventory(params)
  const world = await isoAwsWorldBuilder(items, params.get('theme') === 'day' ? 0 : 1)
  // added before the TileMapSystem, so each frame draws the packets of the same frame
  game.addSystem(
    new IsoAwsSystem(game, world, {
      packetLayer: LAYER_PACKETS,
      source,
      accounts: ACCOUNTS,
      current,
      select: params.get('select') ?? undefined,
    }),
  )
  game.addSystem(new TileMapSystem(game, world.tileMap))

  return game
}
