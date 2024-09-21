import globals from "globals";
import jsEsLint from "@eslint/js";
import tsEsLint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import jest from "eslint-plugin-jest";


export default [
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      },
    },
  },
  jsEsLint.configs.recommended,
  //https://typescript-eslint.io/getting-started/typed-linting/
  ...tsEsLint.configs.recommended/*TypeChecked*/,
  ...tsEsLint.configs.strict/*TypeChecked*/,
  ...tsEsLint.configs.stylistic/*TypeChecked*/,
  eslintConfigPrettier,
  /*{
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },*/
  {
    rules: {
      '@typescript-eslint/no-dynamic-delete': 'off', // TODO: Consider Map instead of JS object for this
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
    files: ["**/*.{js,mjs,cjs,ts}"],
    ignores: [
      '/.git/*',
      '/.github/*',
      '/.husky/*',
      '/.vscode/*',
      '/dist/*',
      '/es/*',
      '/lib/*',
      'eslint.config.*',
      '/eslint.config.*',
      '**/eslint.config.js',
    ],
  },
  {
    files: ["test/**"],
    ...jest.configs['flat/recommended'],
    rules: {
      ...jest.configs['flat/recommended'].rules,
      '@typescript-eslint/no-unused-vars': 'off',
      //'@typescript-eslint/no-unsafe-call': 'off',
      //'@typescript-eslint/no-explicit-any': 'off',
      //'jest/valid-expect': 0,
      //'jest/valid-expect-in-promise': 0,
      //'jest/no-jasmine-globals': 'off',
    },
  },
];