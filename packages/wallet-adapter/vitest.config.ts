import {fileURLToPath} from 'node:url';
import react from '@vitejs/plugin-react';
import {configDefaults, defineConfig} from 'vitest/config';

// @testing-library/react unmounts between tests only with a global `afterEach`, hence `globals`.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^@solana\/kit-plugin-wallet$/,
        replacement: fileURLToPath(
          new URL(
            './node_modules/@solana/kit-plugin-wallet/dist/index.browser.mjs',
            import.meta.url,
          ),
        ),
      },
    ],
  },
  test: {
    environment: 'jsdom',
    // Kit's Node websocket channel subclasses Node's EventTarget, which
    // rejects jsdom's. The Connection falls back to polling when the channel
    // fails, so the rejection is harmless in these tests.
    onUnhandledError(error) {
      const {code, message} = error as {code?: string; message?: string};
      if (
        code === 'ERR_INVALID_ARG_TYPE' &&
        message?.includes('"eventTargets" argument')
      ) {
        return false;
      }
    },
    globals: true,
    include: ['src/**/__tests__/**/*-test.ts?(x)'],
    exclude: process.env.TEST_LIVE
      ? configDefaults.exclude
      : [...configDefaults.exclude, '**/__tests__/e2e/**'],
  },
});
