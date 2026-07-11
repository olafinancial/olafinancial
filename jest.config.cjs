module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/unit'],
  testMatch: ['**/*.test.js'],
  transform: {},
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: { lines: 80, functions: 80, branches: 70, statements: 80 }
  },
  coverageReporters: ['text', 'lcov', 'html']
};
