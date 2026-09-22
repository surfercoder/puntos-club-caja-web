import nextJest from 'next/jest.js';

import type { Config } from 'jest';

const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.tsx'],
  testEnvironment: 'jsdom',

  // Deshace cada jest.spyOn despues de cada test: un spy que quedo colgado de
  // una assertion que fallo no se filtra a los tests que siguen.
  restoreMocks: true,

  coverageProvider: 'v8',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!**/*.d.ts',
    // Archivos de tipos/config sin codigo propio.
    '!src/app/manifest.ts',
    '!next.config.ts',
    '!proxy.ts',
  ],
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: { branches: 100, functions: 100, lines: 100, statements: 100 },
  },

  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testEnvironmentOptions: { url: 'http://localhost:3002' },
  watchman: false,
};

export default createJestConfig(config);
