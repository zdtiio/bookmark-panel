import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    vue(),
    viteStaticCopy({
      targets: [
        {
          src: 'src/manifest.json',
          dest: '.'
        },
        {
          src: 'icons',
          dest: '.'
        },
        {
          src: 'src/background',
          dest: 'src'
        }
      ]
    })
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html',
        options: 'src/options/index.html',
        newtab: 'src/newtab/index.html'
      }
    }
  }
})