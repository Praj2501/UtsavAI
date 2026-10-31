import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.svg', 'icon-512.svg'],
      manifest: {
        name: 'Utsav AI - Celebration & Event Planner',
        short_name: 'Utsav AI',
        description: 'GenAI celebration and event planner for weddings, birthdays, and community events',
        theme_color: '#ea580c',
        background_color: '#fffbeb',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}']
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-firebase-auth': ['firebase/app', 'firebase/auth'],
          'vendor-firebase-db': ['firebase/firestore'],
          'vendor-utils': ['zod', 'zustand']
        }
      }
    }
  }
});
