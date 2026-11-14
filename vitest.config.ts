import { resolve } from 'path'
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    resolve: {
      // tests of the example worlds run against the lib source, not the built dist/
      alias: { '@fmlabs/hieronimo': resolve(__dirname, 'lib/index.ts') },
    },
    test: {
      // ...
    },
  }),
)
