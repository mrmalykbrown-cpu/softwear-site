/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Tallie lives in a subdirectory of the repo, which also holds an unrelated
  // app and its lockfile. Pin the trace root so Next stops guessing.
  outputFileTracingRoot: import.meta.dirname,
  // No static export: the paywall guard (requireActiveSubscription) has to run
  // on the server, so /app is rendered by a server that can check entitlement.
};

export default nextConfig;
