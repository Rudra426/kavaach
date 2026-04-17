import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../static',   // ← outputs built files to repo root /static
    emptyOutDir: true,
  }
})