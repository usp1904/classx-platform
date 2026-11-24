import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => {
  const base = process.env.VITE_BASE || (process.env.BUILD_TARGET === 'gh-pages' ? '/classx-platform/' : '/');
  const outDir = process.env.BUILD_OUT_DIR
    ? path.resolve(__dirname, '..', process.env.BUILD_OUT_DIR)
    : path.resolve(__dirname, '..', 'server', 'public');

  return {
    root: __dirname,
    base,
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': 'http://localhost:8787',
      },
    },
    build: {
      outDir,
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            const normalized = id.split('\\').join('/');
            if (normalized.includes('/lucide-react/')) return 'vendor-icons';
            if (normalized.includes('/react-router')) return 'vendor-router';
            if (normalized.includes('/react/') || normalized.includes('/react-dom/') || normalized.includes('/scheduler/')) {
              return 'vendor-react';
            }
            return;
          },
        },
      },
    },
  };
});
