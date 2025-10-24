import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        process: 'readonly',
      },
    },
    plugins: {
      prettier: prettier,
    },
    rules: {
      'prettier/prettier': 'error',
      'no-unused-vars': 'warn',
      'no-console': 'off',
    },
  },
];
