import solanaFmt from '@solana-config/oxc/oxfmt';
import { defineConfig } from 'oxfmt';

export default defineConfig({
    ...solanaFmt,
    ignorePatterns: [
        '**/declarations/**',
        '**/dist/**',
        '**/lib/**',
        '**/node_modules/**',
        'packages/web3.js/src/__generated__/**',
        'packages/web3.js/test/dist/**',
    ],
});
