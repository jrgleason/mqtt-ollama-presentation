import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig = {
  /* config options here */

  // Required for Docker deployment - creates standalone build
  output: 'standalone',

  // Set the workspace root to the oracle directory (multi-module project)
  outputFileTracingRoot: path.join(__dirname),

  // Avoid running ESLint during `next build` so generated Prisma client/runtime files
  // don't surface lint warnings that come from code generation.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
