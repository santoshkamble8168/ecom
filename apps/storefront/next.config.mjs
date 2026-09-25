/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Optional: set NEXT_DIST_DIR to a path outside OneDrive on Windows if .next/trace EPERM persists.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  transpilePackages: ["@ecom/ui", "@ecom/types", "@ecom/validation", "@ecom/analytics", "@ecom/shared"],
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "http", hostname: "localhost", port: "9000" },
      { protocol: "http", hostname: "127.0.0.1", port: "9000" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
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
      { source: "/favicon.ico", destination: "/icon", permanent: false },
      { source: "/privacy-policy", destination: "/privacy", permanent: false },
      { source: "/terms-and-conditions", destination: "/terms", permanent: false },
      { source: "/pages/privacy-policy", destination: "/privacy", permanent: false },
      { source: "/pages/terms", destination: "/terms", permanent: false },
      { source: "/pages/about", destination: "/about", permanent: false },
      { source: "/pages/contact", destination: "/contact", permanent: false },
      { source: "/pages/shipping", destination: "/shipping", permanent: false },
      { source: "/pages/returns", destination: "/returns", permanent: false },
      { source: "/faq", destination: "/pages/faq", permanent: false },
      { source: "/faqs", destination: "/pages/faq", permanent: false },
    ];
  },
};

export default nextConfig;
