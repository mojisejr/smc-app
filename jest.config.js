/** @type {import('jest').Config} */
module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // TypeScript support
  preset: 'ts-jest',
  
  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@main/(.*)$': '<rootDir>/main/$1',
    '^@db/(.*)$': '<rootDir>/db/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.{js,ts}',
    '<rootDir>/tests/**/*.spec.{js,ts}'
  ],
  
  // Files to ignore
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/app/',
    '<rootDir>/renderer/'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/jest.setup.js'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'main/**/*.{js,ts}',
    'db/**/*.{js,ts}',
    '!main/**/*.d.ts',
    '!main/background.js',
    '!main/ku16/**/*', // Exclude legacy code from coverage
    '!**/__tests__/**',
    '!**/node_modules/**'
  ],
  
  // Coverage thresholds for medical device compliance
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // Critical components require higher coverage
    'main/ku-controllers/ds12/DS12Controller.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'main/ku-controllers/protocols/parsers/DS12ProtocolParser.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },
  
  // Timeout for medical device testing
  testTimeout: 30000,
  
  // Transform configuration for TypeScript
  transform: {
    '^.+\\.ts?$': 'ts-jest',
    '^.+\\.js?$': 'babel-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Global variables for test environment
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: {
        compilerOptions: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true
        }
      }
    }
  },
  
  // Mock configuration
  clearMocks: true,
  restoreMocks: true,
  
  // Verbose output for debugging
  verbose: true,
  
  // Reporter configuration
  reporters: [
    'default',
    ['jest-html-reporter', {
      pageTitle: 'SMC DS12/DS16 Test Report',
      outputPath: 'test-results/test-report.html',
      includeFailureMsg: true,
      includeSuiteFailure: true
    }]
  ]
};