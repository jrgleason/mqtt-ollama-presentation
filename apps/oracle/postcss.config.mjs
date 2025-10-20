// postcss.config.mjs
// Configure PostCSS to use the Tailwind CSS PostCSS plugin so that
// `@import "tailwindcss"` in `globals.css` is handled by Next.js'
// PostCSS pipeline.

const config = {
    plugins: {
        "@tailwindcss/postcss": {},
    },
};

export default config;
