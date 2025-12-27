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
<<<<<<< HEAD
    setupFiles: ['<rootDir>/tests/setup.js'],
=======
>>>>>>> e4aafe6 (feat: skip transcription when no speech detected)
};
