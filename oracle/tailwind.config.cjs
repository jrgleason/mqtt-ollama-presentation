// Disable the rule that forbids `require()` in this CommonJS Tailwind config
/* eslint-disable @typescript-eslint/no-require-imports */

// tailwind.config.cjs
// Configure content paths so Tailwind scans the Next app files for class names.
// This must live at the Next.js app root (the `oracle` folder).

module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [
    // Tailwind Animate plugin is installed and used in the project; include it if present.
    require('tailwindcss-animate'),
  ],
};
