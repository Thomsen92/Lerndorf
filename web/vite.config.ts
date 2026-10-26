import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// GitHub Pages serves the repo under /Lerndorf/.
// Two pages: the pupil app (index.html) and the teacher area (lehrer/index.html).
export default defineConfig({
  base: '/',
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        lehrer: fileURLToPath(new URL('./lehrer/index.html', import.meta.url)),
      },
    },
  },
  test: {
    setupFiles: ['tests/localeSetup.ts'],
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
