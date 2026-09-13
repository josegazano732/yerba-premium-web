import type { NextConfig } from "next";

const isGithubActions = process.env.GITHUB_ACTIONS === "true";
const repositoryName = "yerba-premium-web";
const isDevelopment = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  distDir: isDevelopment ? ".next-dev" : ".next",
  output: "export",
  basePath: isGithubActions ? `/${repositoryName}` : undefined,
  assetPrefix: isGithubActions ? `/${repositoryName}/` : undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: isGithubActions ? `/${repositoryName}` : ""
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      },
      {
        protocol: "https",
        hostname: "vsfyedgeotrypgyhczcg.supabase.co"
      }
    ]
  }
};

export default nextConfig;