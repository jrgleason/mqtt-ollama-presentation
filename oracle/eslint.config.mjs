import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
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
      // Globally allow explicit any where necessary
      '@typescript-eslint/no-explicit-any': 'off',
      // Turn off unused vars rule globally (per user request)
      '@typescript-eslint/no-unused-vars': 'off',
      // Also disable base no-unused-vars in case it's active
      'no-unused-vars': 'off',
      // Turn off unused-expressions rules (base + TypeScript plugin)
      'no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
];

export default eslintConfig;
