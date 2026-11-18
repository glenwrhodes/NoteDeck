import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config.
// - `npm run build` makes the optimized files in dist/, which the web image serves.
// - `npm run dev` starts Vite's dev server with instant hot reload. Its /api
//   requests go to the running Compose stack on port 8088 (see README, "Dev mode").
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': `http://localhost:${process.env.WEB_PORT || 8088}`,
    },
  },
});
