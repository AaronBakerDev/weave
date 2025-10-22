/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || "/",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  experimental: {},
};

export default nextConfig;
