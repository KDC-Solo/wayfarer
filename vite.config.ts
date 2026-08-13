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
      // F7.6 — the 3D dice assets are cached for offline use, but at
      // *runtime* rather than in the precache manifest: precaching them
      // would push ~3 MB onto every user before first paint, including
      // everyone who never turns 3D on, which contradicts both N1/N6
      // (fast cold start) and Phase 7's "never a functional dependency."
      // Cache-first means the first 3D roll fetches them once and every
      // later roll — online or off — is served locally.
      workbox: {
        globIgnores: [
          '**/world.*-*.js',
          '**/Dice-*.js',
          '**/dice-box.es-*.js',
          'assets/dice-box/**',
          'assets/ammo/**',
          'assets/themes/**',
        ],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/(world\.|Dice-|dice-box|ammo\/|themes\/)/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'wayfarer-dice3d',
              expiration: { maxEntries: 32 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      // App must be fully usable before the service worker registers and if it
      // never does (N6, N8) — this only adds offline caching on top.
      manifest: {
        name: 'Wayfarer — Strider Mode Companion',
        short_name: 'Wayfarer',
        description:
          'Local-first solo companion for The One Ring 2e (Strider Mode) — dice, oracle, journeys, chronicle.',
        theme_color: '#12140f',
        background_color: '#12140f',
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
