import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["@libsql/client", "libsql", "@prisma/adapter-libsql"],
};

export default nextConfig;
