/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      diagnostics: false,
      tsconfig: {
        rootDir: '.',
        ignoreDeprecations: '6.0',
        jsx: 'react-jsx',
        module: 'commonjs',
        moduleResolution: 'node',
        target: 'es2020',
        strict: false,
        types: ['jest', 'node'],
      },
    }],
  },
};
