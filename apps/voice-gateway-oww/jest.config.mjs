export default {
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/**/__tests__/**',
    ],
};
