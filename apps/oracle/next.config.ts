import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
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
