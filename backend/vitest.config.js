import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    testTimeout: 20000,
    hookTimeout: 20000,
    // Бүх тест нэг л test DB хуваалцдаг тул зэрэг ажиллуулбал race үүснэ
    fileParallelism: false,
  },
});
