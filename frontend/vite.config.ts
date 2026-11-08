import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Backend tidak memasang CORS, jadi semua request diarahkan lewat proxy dev
 * ini. Di produksi tinggal set VITE_API_BASE_URL ke URL backend
 * (atau minta backend menambahkan CORSMiddleware).
 */
const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:8080';
const PROXY_PATHS = ['/chat', '/infer', '/ketentuan', '/dokumen', '/health'];

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: Object.fromEntries(
      PROXY_PATHS.map((path) => [path, { target: API_BASE, changeOrigin: true }]),
    ),
  },
});
