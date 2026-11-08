import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Rule 7 (Section 2): never hard-code colours, font sizes or spacing in screens and components.
// Hex colours and pixel sizes belong in src/theme/tokens.ts only.
const designTokenRule = [
  'error',
  {
    selector: 'Literal[value=/#[0-9a-fA-F]{3,8}\\b/]',
    message: 'Use a design token from src/theme/tokens.ts instead of a raw hex colour.',
  },
  {
    selector: 'TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\\b/]',
    message: 'Use a design token from src/theme/tokens.ts instead of a raw hex colour.',
  },
  {
    selector: 'Literal[value=/\\d+(\\.\\d+)?px\\b/]',
    message: 'Use a spacing or size token from src/theme/tokens.ts instead of a pixel value.',
  },
  {
    selector: 'TemplateElement[value.raw=/\\d+(\\.\\d+)?px\\b/]',
    message: 'Use a spacing or size token from src/theme/tokens.ts instead of a pixel value.',
  },
];

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'node_modules',
      'playwright-report',
      'test-results',
      'docs',
      'supabase/functions/**/!(_shared)/**',
      'supabase/.temp',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  {
    files: ['src/pages/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}', 'src/layouts/**/*.{ts,tsx}', 'src/modals/**/*.{ts,tsx}'],
    rules: { 'no-restricted-syntax': designTokenRule },
  },
);
