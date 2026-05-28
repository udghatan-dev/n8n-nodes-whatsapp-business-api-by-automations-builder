const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const n8nNodesBase = require('eslint-plugin-n8n-nodes-base');

module.exports = [
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2020,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'n8n-nodes-base': n8nNodesBase,
    },
    rules: {
      ...n8nNodesBase.configs.community.rules,
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];
