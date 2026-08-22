import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

// electron-vite yapılandırması: main (ana süreç) / preload (güvenli köprü) /
// renderer (React arayüzü) için üç ayrı derleme hedefi tanımlar.
// Klasör yerleşimi dokumanlar/MIMARI.md Böl.8'e uyar: main + preload src/main/
// altında, renderer src/renderer/ altında.
export default defineConfig({
  main: {
    // node_modules bağımlılıklarını (özellikle better-sqlite3 gibi native modülleri)
    // paketin içine gömmek yerine "dışarıda" (external) bırakır — native .node
    // dosyaları bundle edilemez, çalışma anında normal require ile yüklenmeli.
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/main',
      lib: {
        entry: resolve(__dirname, 'src/main/main.ts')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/preload',
      lib: {
        entry: resolve(__dirname, 'src/main/preload.ts')
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: resolve(__dirname, 'src/renderer/index.html')
      }
    },
    plugins: [react()]
  }
})
