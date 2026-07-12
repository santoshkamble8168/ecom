/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Optional: set NEXT_DIST_DIR to a path outside OneDrive on Windows if .next/trace EPERM persists.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  transpilePackages: ["@ecom/ui", "@ecom/types", "@ecom/validation"],
};

export default nextConfig;
