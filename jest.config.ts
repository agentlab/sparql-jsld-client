import type { JestConfigWithTsJest } from 'ts-jest';

const jestConfig: JestConfigWithTsJest = {
  verbose: true,
  preset: 'ts-jest/presets/js-with-ts-esm',
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '/.git/',
    '/.github/',
    '/.husky/',
    '/.vscode/',
    '/docs/',
    '/es/',
    '/lib/',
    '/node_modules/',
    '/src/',
  ],
  transformIgnorePatterns: [
    /*'node_modules/(?!(lodash-es)/)',*/ // for yarn
    '<rootdir>/node_modules/.pnpm/(?!(lodash-es)@)', // for pnpm
  ],
  collectCoverageFrom: ['./src/**/*.{js,jsx,ts,tsx}'],
  coverageProvider: 'v8',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    // '^.+\\.[tj]sx?$' to process ts,js,tsx,jsx with `ts-jest`
    // '^.+\\.m?[tj]sx?$' to process ts,js,tsx,jsx,mts,mjs,mtsx,mjsx with `ts-jest`
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  setupFilesAfterEnv: ['jest-extended'],
};

export default jestConfig;
