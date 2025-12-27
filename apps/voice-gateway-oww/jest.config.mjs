export default {
    testEnvironment: 'node',
    roots: ['<rootDir>/src', '<rootDir>/tests'],
    testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/**/__tests__/**',
    ],
    transform: {},
};
