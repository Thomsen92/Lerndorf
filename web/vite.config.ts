import { defineConfig } from 'vite';

// GitHub Pages serves the repo under /Lerndorf/
export default defineConfig({
  base: '/Lerndorf/',
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
