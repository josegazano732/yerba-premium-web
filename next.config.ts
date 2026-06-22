import type { NextConfig } from "next";

const isGithubActions = process.env.GITHUB_ACTIONS === "true";
const repositoryName = "yerba-premium-web";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isGithubActions ? `/${repositoryName}` : undefined,
  assetPrefix: isGithubActions ? `/${repositoryName}/` : undefined,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      }
    ]
  }
};

export default nextConfig;