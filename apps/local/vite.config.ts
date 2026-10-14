import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Served under a sub-path on GitHub Pages; `/` everywhere else.
  base: process.env.TRICC_BASE ?? '/',
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  build: { sourcemap: true },
})
