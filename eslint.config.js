import js from '@eslint/js';
import globals from 'globals';
export default [{ ignores: ['client/dist/**', 'node_modules/**', '.wrangler-build/**', 'coverage/**', 'test-results/**'] }, js.configs.recommended, { files: ['**/*.js', '**/*.jsx', '**/*.mjs'], languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node, ...globals.browser, ...globals.jest, ...globals.worker, JSX: 'readonly' }, parserOptions: { ecmaFeatures: { jsx: true } } }, rules: { 'no-unused-vars': 'off', 'no-undef': 'error', 'no-control-regex':'off' } }];
