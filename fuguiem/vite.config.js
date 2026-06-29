import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 完全に静的なSPA。データは src/data/iems.json に同梱済みなので
// 外部APIへの依存はなく、dist/ をそのまま静的ホスティングできる。
export default defineConfig({
  base: './',
  plugins: [vue()],
})
