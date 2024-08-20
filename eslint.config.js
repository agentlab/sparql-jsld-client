import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import jest from "eslint-plugin-jest";


export default [
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    ignores: [
      '/.git/*',
      '/.github/*',
      '/.husky/*',
      '/.vscode/*',
      '/dist/*',
      '/es/*',
      '/lib/*',
      '/example/*'
    ],
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      },
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    rules: {
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'import/no-anonymous-default-export': 'off',
      'import/prefer-default-export': 'off',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variableLike',
          format: ['camelCase', 'PascalCase'],
        },
      ],
    },
  },
  {
    files: ["tests/**"],
    ...jest.configs['flat/recommended'],
    rules: {
      ...jest.configs['flat/recommended'].rules,
      '@typescript-eslint/no-unused-vars': 'off',
      'jest/valid-expect': 0,
      'jest/valid-expect-in-promise': 0,
      'jest/no-jasmine-globals': 'off',
    },
  },
];