import js from '@eslint/js';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.node,
            },
        },
        rules: {
            // Keep defaults; project can opt-in to stricter rules later
        },
    },
    // Jest configuration for test files
    {
        files: ['**/__tests__/**/*.js', '**/*.test.js', '**/*.spec.js'],
        languageOptions: {
            globals: {
                ...globals.jest,
            },
        },
    },
];
