const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './'
});

const customJestConfig = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js']
};

module.exports = createJestConfig(customJestConfig);
