import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        support: resolve(__dirname, 'support.html'),
        healthcare: resolve(__dirname, 'healthcare.html'),
      },
    },
  },
  // Copy static files to dist
  publicDir: 'public',
})
