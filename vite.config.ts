import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// BLACKOUT: static deployable SPA. No backend. Heavy sim math can move to a
// worker later; keep single chunk small enough for fast first paint.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('/three') || id.includes('\\three')) return 'three';
            if (id.includes('@react-three') || id.includes('three-stdlib')) return 'r3f';
            if (id.includes('postprocessing')) return 'fx';
            if (id.includes('/react') || id.includes('\\react')) return 'react';
          }
          return undefined;
        },
      },
    },
  },
  worker: { format: 'es' },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
  } as unknown as Record<string, unknown>,
});
