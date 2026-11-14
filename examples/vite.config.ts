import { defineConfig } from 'vite'

// // MC_API_URL and MC_API_KEY come from .env.local (see .env.example); only the dev server reads them,
// // they are not exposed to the browser (that takes the VITE_ prefix)
// const env = loadEnv('development', process.cwd(), 'MC_')

// The demo app. It uses the world library as the '@fmlabs/hieronymus' package, i.e. the built ../dist,
// so run `pnpm build` (or `pnpm build:watch`) in the root first.
// https://vitejs.dev/config/
export default defineConfig({
  // server: {
  //   proxy: {
  //     // the mission-control API for the isocontainers world (?world=isocontainers&api):
  //     // /mc-api/... → <MC_API_URL>/api/..., with the API key added here, never in the browser
  //     '/mc-api': {
  //       target: env.MC_API_URL || 'http://127.0.0.1:3080',
  //       changeOrigin: true,
  //       rewrite: (path: string) => path.replace(/^\/mc-api/, '/api'),
  //       headers: env.MC_API_KEY ? { 'x-api-key': env.MC_API_KEY } : {},
  //     },
  //   },
  // },
  build: {
    target: 'es2022', // main.ts uses top-level await
    minify: false,
  },
})
