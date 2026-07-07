const isStaticExport = process.env.STATIC_EXPORT === "1";
const basePath = process.env.PAGES_BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Playwright + Prisma must run in the Node.js runtime, never bundled for edge/client.
    serverComponentsExternalPackages: ["playwright", "@prisma/client"],
  },
  // Only set when STATIC_EXPORT=1 (see scripts/build-static-demo.sh). The
  // normal `npm run build` stays a full server build — this app's actual
  // purpose (Playwright execution, Prisma persistence) requires a real
  // Node server and cannot run on a static host.
  ...(isStaticExport
    ? {
        output: "export",
        trailingSlash: true,
        basePath,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
