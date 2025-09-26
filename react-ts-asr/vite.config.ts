import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  optimizeDeps: {
    exclude: ['html-docx-js']   // ❶ 排除预构建
  },
  build: {
    rollupOptions: {
      external: ['html-docx-js'] // ❷ 打包时也不处理
    }
  },
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    https: {
      key: '../ssl_key/server.key',
      cert: '../ssl_key/server.crt'
    },
    
    proxy: {
      '/ollama': {
        target: 'http://192.168.1.66:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, ''),
        secure: false,
        ws: true,
        headers: {
          'Origin': 'http://192.168.1.66:11434'
        }
      }
    }
  },
})
