const isStaticExport = process.env.STATIC_EXPORT === "1";
const isDockerBuild = process.env.DOCKER_BUILD === "1";
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
  // Only set inside the Dockerfile's build stage — produces the minimal
  // .next/standalone server used to run the public search-only demo
  // backend on Cloud Run. Local `npm run build`/`npm start` stay unaffected.
  ...(isDockerBuild ? { output: "standalone" } : {}),
};

export default nextConfig;
