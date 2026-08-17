/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Optional: set NEXT_DIST_DIR to a path outside OneDrive on Windows if .next/trace EPERM persists.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  transpilePackages: ["@ecom/ui", "@ecom/types", "@ecom/validation"],
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
    ],
  },
  /**
   * Same-origin API proxy — browser calls `/api/v1/*` on the storefront host,
   * Next forwards to the Nest API. This removes cross-origin (CORS) failures
   * in local development when using localhost vs 127.0.0.1.
   */
  async rewrites() {
    const apiOrigin = (process.env.API_PROXY_TARGET ?? "http://localhost:4000").replace(/\/$/, "");
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiOrigin}/api/v1/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      { source: "/privacy-policy", destination: "/pages/privacy-policy", permanent: false },
      { source: "/faq", destination: "/pages/faq", permanent: false },
    ];
  },
};

export default nextConfig;
