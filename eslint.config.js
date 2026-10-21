// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import jsdoc from 'eslint-plugin-jsdoc';
import tsdoc from 'eslint-plugin-tsdoc';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/**
 * ESLint flat config.
 *
 * - typescript-eslint "recommended" rules for all TS sources.
 * - `jsdoc/require-jsdoc` enforces a doc comment on every function, method,
 *   class, interface, type alias and exported constant in `src/`.
 * - `tsdoc/syntax` keeps those comments valid TSDoc.
 * - `eslint-config-prettier` turns off rules that would fight Prettier.
 */
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
    },
  },
  {
    files: ['src/**/*.ts'],
    plugins: { jsdoc, tsdoc },
    rules: {
      'tsdoc/syntax': 'error',
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: false,
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
            ArrowFunctionExpression: false,
            FunctionExpression: false,
          },
          contexts: [
            'TSInterfaceDeclaration',
            'TSTypeAliasDeclaration',
            'TSEnumDeclaration',
            'ExportNamedDeclaration[declaration.type="VariableDeclaration"]',
            'TSInterfaceBody > TSPropertySignature',
          ],
          checkConstructors: true,
          checkGetters: true,
          checkSetters: true,
        },
      ],
    },
  },
  {
    // Node scripts; e2e callbacks passed to page.evaluate() run in the browser.
    files: ['scripts/**/*.mjs', '*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  prettier,
);
