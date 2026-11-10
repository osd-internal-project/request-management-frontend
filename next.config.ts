import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
    The Docker image copies `.next/standalone` and runs its `server.js`, so the
    runner stage carries only the modules the build actually traced instead of a
    full `node_modules`.
  */
  output: "standalone",
  // The softphone ships untranspiled ESM that imports its own CSS and sounds.
  transpilePackages: ["@D-Callcenter/softphone-provider"],
  turbopack: {
    rules: {
      "*.mp3": { type: "asset" },
      "*.m4a": { type: "asset" },
    },
  },
};

export default nextConfig;
