/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Playwright + Prisma must run in the Node.js runtime, never bundled for edge/client.
    serverComponentsExternalPackages: ["playwright", "@prisma/client"],
  },
};

export default nextConfig;
