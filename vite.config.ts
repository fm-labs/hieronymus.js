import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'
import { libInjectCss } from 'vite-plugin-lib-inject-css'

// MC_API_URL and MC_API_KEY come from .env.local (see .env.example); only the dev server reads them,
// they are not exposed to the browser (that takes the VITE_ prefix)
const env = loadEnv('development', process.cwd(), 'MC_')

// https://vitejs.dev/config/
export default defineConfig({
  // resolve: {
  //   alias: {
  //     '~bootstrap': path.resolve(__dirname, 'node_modules/bootstrap'),
  //     '~react-toastify': path.resolve(__dirname, 'node_modules/react-toastify'),
  //     '~react-tabulator': path.resolve(__dirname, 'node_modules/react-tabulator'),
  //   },
  // },
  server: {
    proxy: {
      // the mission-control API for the isocontainers world (?world=isocontainers&api):
      // /mc-api/... → <MC_API_URL>/api/..., with the API key added here, never in the browser
      '/mc-api': {
        target: env.MC_API_URL || 'http://127.0.0.1:3080',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/mc-api/, '/api'),
        headers: env.MC_API_KEY ? { 'x-api-key': env.MC_API_KEY } : {},
      },
    },
  },
  plugins: [dts({ include: ['lib'], rollupTypes: true }), libInjectCss()],
  build: {
    minify: false,
    copyPublicDir: false, // public/ holds the demo app assets, they are not part of the library
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(`${__dirname}`, 'lib/index.ts'),
      name: 'WorldLib',
      // the proper extensions will be added
      fileName: 'world-lib',
    },
    // rollupOptions: {
    //   external: ['react', 'react/jsx-runtime'],
    //   output: {
    //     globals: {
    //       react: 'React',
    //       'react/jsx-runtime': 'jsxRuntime',
    //     },
    //   },
    // },
  },
})
