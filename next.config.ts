import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  serverExternalPackages: ["@libsql/client", "libsql", "@prisma/adapter-libsql", "@prisma/client"],
  // Allows loading the dev server from a phone on the same network (e.g. http://192.168.x.x:3000).
  // Without this, Next blocks the HMR/webpack dev client on cross-origin requests, which stops
  // the client bundle from ever bootstrapping — the page ships but React never hydrates.
  allowedDevOrigins: ["192.168.1.157"],
};

export default nextConfig;
