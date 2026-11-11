import {defineConfig} from 'vitest/config';

// Files run serially because the mock RPC server binds a fixed port and live
// tests share one validator.
export default defineConfig({
  test: {
    fileParallelism: false,
    hookTimeout: 2000,
    include: ['test/**/*.test.ts'],
    testTimeout: 2000,
  },
});
