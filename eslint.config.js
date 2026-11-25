// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'ios/*', 'android/*', 'src/data/flags.ts', '.claude/*'],
  },
  {
    // jest.mock factories must be hoisted above imports and may require() their mocks.
    files: ['**/__tests__/**'],
    rules: { 'import/first': 'off', '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: ['scripts/**', 'supabase/tests/**', 'plugins/**'],
    languageOptions: { globals: globals.node },
  },
]);
