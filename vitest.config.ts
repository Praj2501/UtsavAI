import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'src/test/rules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/domain/**', 'src/ai/**'],
      exclude: [
        'src/domain/index.ts',
        'src/ai/prompts/**',
        '**/*.interface.ts',
        '**/*.d.ts',
        '**/*.test.ts'
      ],
      thresholds: {
        'src/domain/**': {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80
        },
        'src/ai/**': {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  }
});
