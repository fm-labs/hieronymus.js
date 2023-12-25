import { chessWorldConfig } from './worlds/chess/chess.world.ts'
import { defaultWorldConfig } from './worlds/default/default.world.ts'
import { smileyWorldConfig } from './worlds/smiley/smiley.world.ts'
import { elbaWorldConfig } from './worlds/elba/elba.world.ts'
import { devWorldConfig } from './worlds/dev/dev.world.ts'
import { sandboxWorldConfig } from './worlds/sandbox/sandbox.world.ts'
import { worldBuilder } from "../lib/kernel/worldBuilder.ts";

export const worldConfigs: WorldConfig[] = [
  defaultWorldConfig,
  devWorldConfig,
  chessWorldConfig,
  smileyWorldConfig,
  elbaWorldConfig,
  sandboxWorldConfig,
]

export const getWorldConfig = (name: string): WorldConfig | undefined => {
  return worldConfigs.find((config) => config.world.name === name)
}

export const getWorld = (name: string): World | undefined => {
  const config = getWorldConfig(name)
  if (!config) {
    return undefined
  }

  return worldBuilder(config.world)
}
