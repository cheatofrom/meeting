import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ==================== 全局配置 ====================
// 部署时只需修改此变量为你的服务器 IP 或域名
const SERVER_HOST = "localhost";
const WSS_PORT = 10095;
const API_PORT = 10096;
const OLLAMA_PORT = 11434;
const FRONTEND_PORT = 5173;
// ================================================

// https://vite.dev/config/
export default defineConfig({
  optimizeDeps: {
    exclude: ['html-docx-js']
  },
  build: {
    rollupOptions: {
      external: ['html-docx-js']
    }
  },
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: FRONTEND_PORT,
    https: {
      key: '../ssl_key/server.key',
      cert: '../ssl_key/server.crt'
    },
    
    proxy: {
      '/api': {
        target: `https://${SERVER_HOST}:${API_PORT}`,
        changeOrigin: true,
        secure: false,
        ws: true,
        headers: {
          'Origin': `https://${SERVER_HOST}:${API_PORT}`
        }
      },
      '/ws': {
        target: `wss://${SERVER_HOST}:${WSS_PORT}`,
        changeOrigin: true,
        secure: false,
        ws: true,
        headers: {
          'Origin': `wss://${SERVER_HOST}:${WSS_PORT}`
        }
      },
      '/ollama': {
        target: `http://${SERVER_HOST}:${OLLAMA_PORT}`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, ''),
        secure: false,
        ws: true,
        headers: {
          'Origin': `http://${SERVER_HOST}:${OLLAMA_PORT}`
        }
      }
    }
  },
})
