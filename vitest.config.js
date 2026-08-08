import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['[1-7]/script.js', '中国历史七年级下册_Enhanced_HTML/script.js'],
      all: true,
    },
  },
});
