import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  // This app sits in apps/oddscope inside a repo whose root holds a different
  // project and its own lockfile. Without this, Next infers the repo root as
  // the tracing root and bundles the neighbouring app's files into the
  // serverless output.
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
};

export default nextConfig;
