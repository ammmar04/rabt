import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (local dev database) must not be bundled by the server compiler.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
