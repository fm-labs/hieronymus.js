import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'
import { libInjectCss } from 'vite-plugin-lib-inject-css'

// Builds the world library into dist/. The demo app lives in examples/ and has its own vite config.
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [dts({ include: ['lib'], rollupTypes: true }), libInjectCss()],
  build: {
    minify: false,
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
