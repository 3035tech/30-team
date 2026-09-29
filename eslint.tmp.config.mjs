import globals from 'globals';
import react from 'eslint-plugin-react';
export default [
  {
    files: ['**/*.{js,jsx,mjs}'],
    plugins: { react },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    rules: { 'no-undef': 'error', 'react/jsx-uses-vars': 'error', 'no-unused-vars': ['warn', { varsIgnorePattern: '^(React|_)', args: 'none' }], 'no-dupe-keys': 'error' },
  },
];
