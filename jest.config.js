const esModules = ['lodash-es'].join('|');

module.exports = {
  collectCoverageFrom: ['**/*.{js,jsx,ts,tsx}', '!**/node_modules/**', '!**/vendor/**'],
  //roots: ['<rootDir>/src'],
  //transform: {
  //  '^.+\\.tsx?$': 'ts-jest',
  //},
  //testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  //moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  //transformIgnorePatterns: [
  //  '/node_modules/(?!lodash-es/.*)'
  //],
  //transformIgnorePatterns: [`/node_modules/(?!${esModules})`],
  setupFilesAfterEnv: ['jest-extended'],
};
