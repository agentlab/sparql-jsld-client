// eslint-disable-next-line no-undef
module.exports = {
  /*root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    //project: './tsconfig.json',
  },*/
  env: {
    //browser: true,
    node: true,
    jasmine: true,
    jest: true,
  },
  plugins: ['jest', 'prettier'],
  extends: ['eslint:recommended', 'plugin:jest/recommended', 'prettier', 'plugin:prettier/recommended'],
  rules: {
    'import/no-extraneous-dependencies': ['off'],
  },
  overrides: [
    {
      files: ['*.spec.*'],
      rules: {
        'jest/valid-expect': 0,
        'jest/valid-expect-in-promise': 0,
        '@typescript-eslint/no-unused-vars': 'off',
        'no-unused-vars': 'off',
        'jest/no-jasmine-globals': 'off',
      },
    },
  ],
};
