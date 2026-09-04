import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
    The Docker image copies `.next/standalone` and runs its `server.js`, so the
    runner stage carries only the modules the build actually traced instead of a
    full `node_modules`.
  */
  output: "standalone",
};

export default nextConfig;
