/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export so Capacitor can bundle the web build into the APK WebView.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
