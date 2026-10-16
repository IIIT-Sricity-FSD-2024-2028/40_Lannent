/**
 * Vite configuration for the Lannent React frontend.
 *
 * The NestJS API runs on http://localhost:3000 under the /api prefix.
 * Proxying /api through the dev server keeps every request same-origin,
 * exactly like the original setup where the API served the static pages.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
