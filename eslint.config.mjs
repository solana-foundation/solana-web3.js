import js from '@eslint/js';
import {defineConfig} from 'eslint/config';
import importPlugin from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';

const ecmaVersion = 2022;
const tsFiles = ['src/**/*.ts', 'test/**/*.ts'];

export default defineConfig([
  {
    ignores: ['declarations/**', 'lib/**', 'test/dist/**'],
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  {
    files: tsFiles,
    extends: [
      js.configs.recommended,
      importPlugin.flatConfigs.errors,
      importPlugin.flatConfigs.warnings,
      importPlugin.flatConfigs.typescript,
      tseslint.configs.base,
      tseslint.configs.eslintRecommended,
    ],
    languageOptions: {
      ecmaVersion,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/require-await': ['error'],
      'import/first': ['error'],
      'import/no-commonjs': ['error'],
      'import/order': [
        'error',
        {
          groups: [
            ['internal', 'external', 'builtin'],
            ['index', 'sibling', 'parent'],
          ],
          'newlines-between': 'always',
        },
      ],
      'no-unused-vars': 'off',
      'require-await': 'off',
    },
  },
]);