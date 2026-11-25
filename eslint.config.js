// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'ios/*', 'android/*', 'src/data/flags.ts'],
  },
  {
    files: ['scripts/**', 'supabase/tests/**'],
    languageOptions: { globals: globals.node },
  },
]);
