import { defineConfig } from 'vitest/config';

/**
 * Vite + Vitest configuration.
 *
 * `base: './'` makes every asset URL in the production build relative, so the
 * `dist/` folder can be hosted from any sub-path (GitHub Pages, itch.io, a
 * plain file server, ...).
 */
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
