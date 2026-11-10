import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // When the backend is ready, either set VITE_API_URL in .env
    // or uncomment the proxy below and set VITE_API_URL=/api
    // proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } },
  },
})
