import type { JestConfigWithTsJest } from 'ts-jest';

const jestConfig: JestConfigWithTsJest = {
  verbose: true,
  //https://kulshekhar.github.io/ts-jest/docs/guides/esm-support/
  preset: 'ts-jest/presets/js-with-ts-esm',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  //end of //https://kulshekhar.github.io/ts-jest/docs/guides/esm-support/
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
    // https://jestjs.io/docs/configuration#transformignorepatterns-arraystring
    //'node_modules/(?!(lodash-es)/)', // for yarn
    '<rootdir>/node_modules/.pnpm/(?!(lodash-es)@)', // for pnpm
  ],
  coverageProvider: 'v8',
  collectCoverageFrom: ['./src/**/*.{js,jsx,ts,tsx}'],
  setupFilesAfterEnv: ['jest-extended'],
};

export default jestConfig;
