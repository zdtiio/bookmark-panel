import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteStaticCopy } from 'vite-plugin-static-copy'

const BROWSERS = ['chrome', 'firefox', 'edge']

const resolveBrowser = (mode) => (BROWSERS.includes(mode) ? mode : 'chrome')

export default defineConfig(({ mode }) => {
  const browser = resolveBrowser(mode)
  // Edge 与 Chrome 同为 Chromium 内核，复用同一份清单
  const manifest = browser === 'firefox' ? 'firefox' : 'chrome'

  return {
    plugins: [
      vue(),
      viteStaticCopy({
        targets: [
          {
            src: `manifests/manifest.${manifest}.json`,
            dest: '.',
            rename: 'manifest.json'
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
      outDir: `dist/${browser}`,
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: 'src/popup/index.html',
          options: 'src/options/index.html',
          newtab: 'src/newtab/index.html'
        }
      }
    }
  }
})
