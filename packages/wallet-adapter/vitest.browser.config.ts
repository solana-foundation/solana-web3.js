import {fileURLToPath} from 'node:url';
import react from '@vitejs/plugin-react';
import {playwright} from '@vitest/browser-playwright';
import {defineConfig} from 'vitest/config';

export default defineConfig({
  define: {'process.env': {}},
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
    browser: {
      enabled: true,
      headless: true,
      instances: [{browser: 'chromium'}],
      provider: playwright(),
    },
    globalSetup: './src/__tests__/e2e/surfnet-global-setup.ts',
    globals: true,
    include: ['src/__tests__/e2e/example-page-live-test.tsx'],
  },
});
