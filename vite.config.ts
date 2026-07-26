import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    /**
     * Proxy để môi trường dev CÙNG ORIGIN với API.
     * Bắt buộc phải có: cookie phiên dùng SameSite=Strict nên sẽ không được gửi
     * nếu web ở localhost:5173 mà API ở localhost:5000 (khác origin).
     */
    proxy: {
      '/api': { target: 'http://127.0.0.1:5000', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:5000', changeOrigin: true },
    },
  },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          // Kiểm tra lucide TRƯỚC react: đường dẫn 'lucide-react' cũng chứa chữ 'react',
          // nên thứ tự cũ khiến nhánh vendor-icons không bao giờ được chạy tới.
          if (id.includes('lucide-react')) return 'vendor-icons'
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return 'vendor-react'
          }
          return 'vendor'
        },
      },
    },
  },
})
