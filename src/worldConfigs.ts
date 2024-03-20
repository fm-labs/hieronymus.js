import { chessWorldConfig } from './worlds/chess/chess.world.ts'
import { defaultWorldConfig } from './worlds/default/default.world.ts'
import { smileyWorldConfig } from './worlds/smiley/smiley.world.ts'
import { elbaWorldConfig } from './worlds/elba/elba.world.ts'
import { sandboxWorldConfig } from './worlds/sandbox/sandbox.world.ts'
import { worldBuilder } from '../lib/world/worldBuilder.ts'

/**
 * @deprecated
 */
export const worldConfigs: WorldConfig[] = [
  defaultWorldConfig,
  chessWorldConfig,
  smileyWorldConfig,
  elbaWorldConfig,
  sandboxWorldConfig,
]

/**
 * @deprecated
 * @param name
 */
export const getWorldConfig = (name: string): WorldConfig | undefined => {
  return worldConfigs.find((config) => config.world.name === name)
}

/**
 * @deprecated
 * @param name
 */
export const getWorld = (name: string): World | undefined => {
  const config = getWorldConfig(name)
  if (!config) {
    return undefined
  }

  return worldBuilder(config.world)
}
