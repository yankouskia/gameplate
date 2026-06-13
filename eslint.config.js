// @ts-check
import eslint from '@eslint/js';
import importX from 'eslint-plugin-import-x';
import promise from 'eslint-plugin-promise';
import unicorn from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'docs/api/**',
      'node_modules/**',
      'website/**',
      'examples/*/dist/**',
      'examples/*/node_modules/**',
      '**/*.d.ts',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  unicorn.configs['flat/recommended'],
  importX.flatConfigs.recommended,
  promise.configs['flat/recommended'],
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.js', 'scripts/*.mjs'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TypeScript already validates these — disable the duplicates.
      'import-x/no-unresolved': 'off',
      'import-x/named': 'off',
      'import-x/namespace': 'off',
      'import-x/default': 'off',
      'import-x/no-named-as-default': 'off',
      'import-x/no-named-as-default-member': 'off',

      // TypeScript ergonomics
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true },
      ],
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],

      // Unicorn — tune away from over-opinionated defaults
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/no-null': 'off',
      'unicorn/no-array-reduce': 'off',
      'unicorn/filename-case': ['error', { cases: { kebabCase: true, camelCase: true } }],
      // unicorn 65 renamed `ignoreUsedVariables: true` → `checkUsedVariables: false`
      'unicorn/prefer-export-from': ['error', { checkUsedVariables: false }],
      'unicorn/no-array-callback-reference': 'off',
      'unicorn/explicit-length-check': 'off',

      // Imports
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import-x/no-default-export': 'error',
      'import-x/first': 'error',
      'import-x/newline-after-import': 'error',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.bench.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['**/*.config.{js,ts,mts,cjs}', '**/*.config.*.{js,ts,mts,cjs}', 'eslint.config.js'],
    rules: {
      'import-x/no-default-export': 'off',
      '@typescript-eslint/no-deprecated': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
  {
    files: ['examples/**/*.{js,ts,mjs}'],
    rules: {
      'no-console': 'off',
      'import-x/no-default-export': 'off',
    },
  },
  {
    // Build/CI scripts: Node CLIs, so console + process.exit are expected,
    // and third-party tool types are not resolvable via the default project.
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: { process: 'readonly', console: 'readonly' },
    },
    rules: {
      'no-console': 'off',
      'unicorn/no-process-exit': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
);
