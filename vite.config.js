import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// dev only: make /control open control.html (production Express handles this route)
const controlRoute = () => ({
  name: 'control-route',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url === '/control' || req.url.startsWith('/control?')) req.url = '/control.html';
      next();
    });
  }
});

export default defineConfig({
  plugins: [react(), controlRoute()],
  server: {
    port: 5173,
    proxy: {
      '/socket.io': { target: 'http://localhost:3001', ws: true },
      '/api': 'http://localhost:3001'
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: { input: { main: resolve('index.html'), control: resolve('control.html') } }
  }
});
