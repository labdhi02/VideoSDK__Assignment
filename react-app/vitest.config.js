import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // Allow vitest to read files outside the app root (e.g. ../sdk)
      allow: ['..'],
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    include: [
      'src/**/*.{test,spec}.{js,jsx}',
      '../sdk/**/*.{test,spec}.js',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.config.js',
        '**/main.jsx',
        '**/index.jsx',
      ],
    },
  },
});
