/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  // Relative base so the app works at any path (GitHub Pages project site)
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // App must be fully usable before the service worker registers and if it
      // never does (N6, N8) — this only adds offline caching on top.
      manifest: {
        name: 'Wayfarer — Strider Mode Companion',
        short_name: 'Wayfarer',
        description:
          'Local-first solo companion for The One Ring 2e (Strider Mode) — dice, oracle, journeys, chronicle.',
        theme_color: '#2f3a2f',
        background_color: '#2f3a2f',
        display: 'standalone',
        icons: [],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.ts'],
  },
});
