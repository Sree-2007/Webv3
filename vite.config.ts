import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  // IMPORTANT: The base must match your repo name (case-sensitive).
  // If your repo is https://github.com/Sree-2007/Webv3, then base = '/Webv3/'
  base: '/Webv3/',
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
})
