module.exports = {
  verbose: true,
  preset: 'ts-jest/presets/js-with-ts-esm',
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['/cypress/', '/es/', '/example/', '/lib/', '/node_modules/'],
  transformIgnorePatterns: ['node_modules/(?!(lodash-es)/)'],
  collectCoverageFrom: ['./src/**/*.{js,jsx,ts,tsx}'],
  coverageProvider: 'v8',
  globals: {
    extensionsToTreatAsEsm: ['.ts', '.js'],
    'ts-jest': {
      useESM: true,
    },
  },
  setupFilesAfterEnv: ['jest-extended'],
};
