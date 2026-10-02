import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://attendance-management-system-1-mhwi.onrender.com',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'https://attendance-management-system-1-mhwi.onrender.com',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
