import solanaConfig from '@solana-config/oxc/oxlint';
import { defineConfig } from 'oxlint';

export default defineConfig({
    extends: [solanaConfig],
    ignorePatterns: [
        '**/declarations/**',
        '**/dist/**',
        '**/lib/**',
        '**/node_modules/**',
        'packages/web3.js/src/__generated__/**',
        'packages/web3.js/test/dist/**',
    ],
    options: { typeAware: true },
    overrides: [
        {
            files: ['packages/web3.js/**'],
            rules: {
                'no-unused-vars': [
                    'error',
                    {
                        argsIgnorePattern: '^_',
                        caughtErrorsIgnorePattern: '^_',
                        destructuredArrayIgnorePattern: '^_',
                        varsIgnorePattern: '^_',
                    },
                ],
                'sort-keys': 'off',
                'typescript/no-floating-promises': 'off',
                'typescript/prefer-promise-reject-errors': 'off',
                'typescript/restrict-plus-operands': 'off',
                'typescript/restrict-template-expressions': 'off',
            },
        },
    ],
});
