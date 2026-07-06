import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024 // 10 MiB
      },
      manifest: {
        name: 'Agentic App',
        short_name: 'App',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone'
      }
    })
  ]
});
