
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',        // слушаем только локалхост
    port: 3000,
    https: false,             // HTTPS завершается на Nginx, здесь http
    strictPort: true,
    allowedHosts: ['reg.oncopulm.ru', 'www.reg.oncopulm.ru'],

    // ВАЖНО: HMR через домен и прокси Nginx
    hmr: {
      protocol: 'wss',
      host: 'reg.oncopulm.ru',
      port: 8081,
      path: '/socket',        // должен совпадать с location /socket в Nginx
    },

    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
  // server: {
  //   allowedHosts: ['marketcalc.ru', 'www.marketcalc.ru'],
  //   port: 3000,
  //   proxy: {
  //     '/api': {
  //       target: 'http://localhost:5000',
  //       // target: 'http://marketcalc.ru:5000',
  //       changeOrigin: true,
  //       // rewrite: path => path.replace(/^\/api/, ''),
  //       secure: false,
        
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  }
})
