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
  build: {
    // Raises the warning threshold to 1000 kB (1 MB) to silence safe limits
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        // Automatically splits heavy node_modules (like leaflet) into a separate bundle
        codeSplitting: {
          groups: [
            {
              name: 'vendor',
              test: /node_modules/,
            },
          ],
        },
      },
    },
  },
})
