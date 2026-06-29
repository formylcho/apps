import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 乗換APIはCORS開放のためブラウザから直接呼べるが、
// 万一CORSが閉じた場合に備え dev proxy を用意しておく（/transit-api 経由）。
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/transit-api': {
        target: 'https://api.transit.ls8h.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/transit-api/, ''),
      },
    },
  },
})
