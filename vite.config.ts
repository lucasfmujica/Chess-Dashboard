/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
