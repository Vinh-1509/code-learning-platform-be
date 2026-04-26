import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'package-lock.json',
      'yarn.lock',
      'Dockerfile',
      '**/*.md',
      'eslint.config.*',
      '.prettierrc',
      'tsconfig.*.json',
      '.env*',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  {
    files: ['**/*.{ts,tsx}'],

    plugins: {
      prettier: prettierPlugin,
    },

    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
      globals: {
        ...globals.node,
      },
    },

    rules: {
      // Format
      'prettier/prettier': 'error',

      // Clean Code
      'no-undef': 'error',
      'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],

      // TypeScript-specific
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
    },
  },
  eslintConfigPrettier,
);
