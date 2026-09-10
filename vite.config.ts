/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // El worker del motor se declara con { type: 'module' }, y el build de
  // Stockfish 19 de Lichess usa await de nivel superior. Sin esto Vite emite los
  // workers como iife, que no lo soporta, y el build falla.
  worker: {
    format: 'es',
  },
  // Resolve the @components/@hooks/... aliases from tsconfig.json natively
  // (Vite 8 supports this without the vite-tsconfig-paths plugin).
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      // Local stand-in for Vercel's serverless functions; see scripts/dev-api-server.mts.
      '/api': 'http://localhost:3001',
    },
    watch: {
      // Ship Studio escribe capturas y estado acá dentro; nada de eso es código
      // de la app, así que no tiene por qué disparar un recargado. (Ojo: no
      // alcanza para la preview embebida de Ship Studio, que recarga igual al
      // sacar una captura — parece no usar este watcher.)
      ignored: ['**/.shipstudio/**'],
    },
    // Cross-origin isolation, required for the multi-threaded Stockfish WASM
    // build to use SharedArrayBuffer. Mirrored in vercel.json for prod.
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  build: {
    // Keep the CRA output directory so existing deploy config keeps working.
    outDir: 'build',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    css: true,
    // Playwright owns the e2e/ directory; keep Vitest to unit/integration tests.
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
