import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Relative asset URLs, so the static build works under any path — e.g. GitHub Pages' /ajax-engine/.
  // Routing uses the URL hash, so no server rewrites are needed either.
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        // Vendor code changes rarely, so separate chunks stay cached across app updates.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'router', test: /node_modules[\\/]react-router[\\/]/ },
            // prismjs grammars are deliberately NOT split out: they register themselves on a global Prism
            // that src/components/code/prism/global.ts sets first, which only works if they run after it.
            { name: 'highlight', test: /node_modules[\\/]prism-react-renderer[\\/]/ },
            { name: 'icons', test: /node_modules[\\/]lucide-react[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // UI tests click through whole request lifecycles; under a loaded machine they can exceed the 5 s default.
    testTimeout: 15_000,
  },
});
