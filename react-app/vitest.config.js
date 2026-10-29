import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // Allow vitest to reach the sdk folder outside the app root
      allow: ['..'],
    },
  },
  test: {
    globals: true,
    // Default: pure Node for SDK tests (no DOM overhead)
    environment: 'node',
    // Hook/component test files declare "// @vitest-environment jsdom" at the
    // top and need the jest-dom matchers + cleanup wired up
    environmentMatchGlobs: [
      ['src/**/*.{test,spec}.{js,jsx}', 'jsdom'],
    ],
    setupFiles: ['./src/test/setup.js'],
    include: [
      '../sdk/**/*.{test,spec}.js',
      'src/**/*.{test,spec}.{js,jsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['../sdk/**/*.js', 'src/**/*.{js,jsx}'],
      exclude: [
        '../sdk/**/*.test.js',
        'src/**/*.test.{js,jsx}',
        'src/test/',
        '**/main.jsx',
        '**/index.{js,jsx}',
        '**/*.config.{js,ts}',
      ],
    },
  },
});
