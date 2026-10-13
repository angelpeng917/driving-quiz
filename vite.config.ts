/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base './'：可部署在任何子路徑（GitHub Pages、Netlify 等）。注意：不支援直接雙擊 dist/index.html（file://），請用網站主機或 `npm run preview`
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
})
