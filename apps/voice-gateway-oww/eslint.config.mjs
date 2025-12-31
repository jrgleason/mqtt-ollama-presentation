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
            // Turn off unused vars rule (many XState actions require unused context/event params)
            'no-unused-vars': 'off',
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
