import {defineConfig} from 'vitest/config';

import mocharc from './.mocharc.json' with {type: 'json'};

// Vitest runs exactly the files mocha ignores. Files run serially because the
// mock RPC server binds a fixed port and live tests share one validator.
export default defineConfig({
  test: {
    fileParallelism: false,
    hookTimeout: 2000,
    include: mocharc.ignore,
    testTimeout: 2000,
  },
});
