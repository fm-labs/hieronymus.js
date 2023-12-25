import { defineConfig } from 'vite'
import { resolve } from 'path'
import path from 'path'
import dts from 'vite-plugin-dts'
import { libInjectCss } from 'vite-plugin-lib-inject-css'

// https://vitejs.dev/config/
export default defineConfig({
  // resolve: {
  //   alias: {
  //     '~bootstrap': path.resolve(__dirname, 'node_modules/bootstrap'),
  //     '~react-toastify': path.resolve(__dirname, 'node_modules/react-toastify'),
  //     '~react-tabulator': path.resolve(__dirname, 'node_modules/react-tabulator'),
  //   },
  // },
  plugins: [dts({ include: ['lib'] }), libInjectCss()],
  build: {
    minify: false,
    copyPublicDir: true,
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(`${__dirname}`, 'lib/main.ts'),
      name: 'ReactBoost',
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
