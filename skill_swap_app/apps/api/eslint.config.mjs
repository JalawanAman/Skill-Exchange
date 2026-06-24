import js from '@eslint/js'
import tseslint from 'typescript-eslint'

// Flat config (ESLint v9) for the Node/TypeScript backend.
export default tseslint.config(
  { ignores: ['dist/**', 'drizzle/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      // Allow intentionally-unused args/vars when prefixed with _ (e.g. Express _req, _next).
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
)
