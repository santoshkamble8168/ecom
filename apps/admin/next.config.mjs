/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Optional: set NEXT_DIST_DIR to a path outside OneDrive on Windows if .next/trace EPERM persists.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  transpilePackages: ["@ecom/ui", "@ecom/types", "@ecom/validation"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "http", hostname: "localhost", port: "9000" },
      { protocol: "http", hostname: "127.0.0.1", port: "9000" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  /**
   * Same-origin API proxy — browser calls `/api/v1/*` on the admin host,
   * Next forwards to the Nest API. Avoids CORS and localhost vs 127.0.0.1.
   */
  async rewrites() {
    const apiOrigin = (process.env.API_PROXY_TARGET ?? "http://127.0.0.1:4000").replace(/\/$/, "");
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiOrigin}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
