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
      'package.json',
      'yarn.lock',
      'Dockerfile',
      '**/*.md',
      '.prettierrc',
      'tsconfig.json',
      '.env*',
      'coverage'
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
      'prettier/prettier': 'error',

      'no-undef': 'error',
      'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],

      '@typescript-eslint/no-unused-vars': [
        'error',
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
  {
    files: ['tests/**/*.ts', '**/*.test.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.test.json',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  eslintConfigPrettier,
);
