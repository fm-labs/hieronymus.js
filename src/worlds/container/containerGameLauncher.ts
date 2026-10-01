import { Game, GamepadSystem, HeroSystem, TileMapEditorSystem } from '../../../lib'
import { GridSystem } from '../../../lib'
import { TileMapSystem } from '../../../lib'
import { InputSystem } from '../../../lib'
import { InfoSystem } from '../../../lib'
import containerWorldBuilder from './container.world.ts'
import { CameraSystem } from '../../../lib/systems/CameraSystem.ts'
import { GridLinesSystem } from '../../../lib/systems/GridLinesSystem.ts'
import { ContainerSystem } from './ContainerSystem.ts'
import { MechDemoSystem } from '../../../lib/systems/MechDemoSystem.ts'
import { WebUiSystem2 } from '../../../lib/systems/WebUiSystem2.ts'

const API_BASE_URL = 'http://127.0.0.1:3080/'
const API_KEY_LOCAL_STORAGE_KEY = 'container_api_key'
const API_DEFAULT_TTL_SECONDS = 30

const readApiKeyFromLocalStorage = (): string | null => {
  return localStorage.getItem(API_KEY_LOCAL_STORAGE_KEY)
}

const writeApiKeyToLocalStorage = (apiKey: string) => {
  localStorage.setItem(API_KEY_LOCAL_STORAGE_KEY, apiKey)
}

const cached = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number,
): Promise<T> => {
  const now = Date.now()
  const cachedItem = localStorage.getItem(key)
  if (cachedItem) {
    const parsed = JSON.parse(cachedItem)
    if (now - parsed.timestamp < ttlSeconds * 1000) {
      return parsed.data as T
    }
  }
  const data = await fetcher()
  localStorage.setItem(
    key,
    JSON.stringify({
      timestamp: now,
      data,
    }),
  )
  return data
}

const containerApiInit = (): ContainerApi => {
  const get = async (path: string) => {
    const apiKey = readApiKeyFromLocalStorage()
    return fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    }).then((res) => res.json())
  }

  const post = async (path: string, data: any) => {
    const apiKey = readApiKeyFromLocalStorage()
    return fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(data),
    }).then((res) => res.json())
  }

  const login = async (username: string, password: string) => {
    const res = fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    })
    const data = res.then((r) => r.json())
    data.then((d) => {
      if (d.apiKey) {
        writeApiKeyToLocalStorage(d.apiKey)
      }
    })
    return data
  }

  const logout = async () => {
    localStorage.removeItem(API_KEY_LOCAL_STORAGE_KEY)
  }

  const getContainerHosts = async () => {
    const cacheKey = `container_hosts`
    return cached(cacheKey, () => get(`api/containers/hosts`), API_DEFAULT_TTL_SECONDS)
  }

  const getContainerHostContainers = async (hostId: string) => {
    const cacheKey = `container_host_${hostId}`
    return cached(
      cacheKey,
      () => get(`api/containers/${hostId}/containers`),
      API_DEFAULT_TTL_SECONDS,
    )
  }

  return {
    get,
    post,
    login,
    logout,
    // helpers
    getContainerHosts,
    getContainerHostContainers,
  }
}

export const containerGameLauncher = async (app: HTMLDivElement) => {
  const urlParams = new URLSearchParams(window.location.search)
  const inventoryUrl = urlParams.get('inventory') || '/container/inventory/container.inventory.json'

  // Init gamec
  const config: GameConfig = { id: 'container', name: 'Kontainer Game', width: 600, height: 400 }
  const game = new Game(app, config)

  game.addSystem(new InfoSystem(game))
  game.addSystem(new InputSystem(game))
  game.addSystem(new CameraSystem(game))

  if (inventoryUrl) {
    const api = containerApiInit()
    const tileMap = await containerWorldBuilder(game)

    game.addSystem(new GridLinesSystem(game, tileMap))
    game.addSystem(new GridSystem(game, tileMap))
    game.addSystem(new ContainerSystem(game, tileMap, api))
    game.addSystem(new TileMapSystem(game, tileMap))
    //game.addSystem(new MechDemoSystem(game, tileMap))
    //game.addSystem(new TileMapEditorSystem(game, tileMap))
  } else {
    throw new Error('No inventory URL provided')
  }
  game.addSystem(new GamepadSystem(game))
  game.addSystem(new HeroSystem(game))

  return game
}
