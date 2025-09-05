// vite.config.js
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Ajusta estos targets si usas otros puertos
  const apiTarget  = (env.VITE_API_BASE || 'http://127.0.0.1:8020').trim()
  const n8nTarget  = (env.VITE_N8N_BASE || 'http://127.0.0.1:5678').trim()

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          rewrite: p => p.replace(/^\/api/, ''),
        },
        '/n8n': {
          target: n8nTarget,
          changeOrigin: true,
          secure: false,
          rewrite: p => p.replace(/^\/n8n/, ''),
        },
      },
    },
  }
})



