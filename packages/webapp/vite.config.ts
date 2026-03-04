import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/index.js',
        assetFileNames: 'assets/[name].[ext]',
        // Inline all dynamic imports into a single bundle.
        // VS Code webviews load scripts as classic (non-module) scripts,
        // so cross-chunk ES module exports cause SyntaxError.
        inlineDynamicImports: true,
      },
    },
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm'],
  },
  assetsInclude: ['**/*.wasm'],
});
