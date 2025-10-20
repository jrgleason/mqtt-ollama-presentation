import {dirname} from "path";
import {fileURLToPath} from "url";
import {FlatCompat} from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
});

const eslintConfig = [
    ...compat.extends("next/core-web-vitals"),
    {
        ignores: [
            "node_modules/**",
            ".next/**",
            "out/**",
            "build/**",
            "next-env.d.ts",
            "src/generated/**",
            "src/generated/prisma/**",
        ],
        rules: {
            // Turn off unused vars rule globally (per user request)
            'no-unused-vars': 'off',
            // Turn off unused-expressions rules
            'no-unused-expressions': 'off',
        },
    },

    // Explicit override for generated files: turn off rules that commonly trigger on generated code
    {
        files: ["src/generated/**", "src/**/generated/**"],
        rules: {
            'no-unused-expressions': 'off',
            'no-unused-vars': 'off',
        },
    },
];

export default eslintConfig;
