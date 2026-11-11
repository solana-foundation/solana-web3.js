import {configDefaults, defineConfig} from 'vitest/config';

// Files run serially because the mock RPC server binds a fixed port and live
// tests share one validator. The websocket tests only exist in live mode, and
// Vitest fails a file that registers no tests.
export default defineConfig({
  test: {
    exclude: process.env.TEST_LIVE
      ? configDefaults.exclude
      : [...configDefaults.exclude, 'test/websocket.test.ts'],
    fileParallelism: false,
    hookTimeout: 2000,
    include: ['test/**/*.test.ts'],
    testTimeout: 2000,
  },
});
