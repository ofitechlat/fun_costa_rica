import { defineConfig } from 'vite';

// En desarrollo: `npm run dev:server` (API en :8004) + `npm run dev` (Vite en :5173 con proxy a la API).
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:8004',
      '/uploads': 'http://localhost:8004'
    }
  }
});
