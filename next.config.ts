import type { NextConfig } from "next";

const isGithubActions = process.env.GITHUB_ACTIONS === "true";
const isVercel = process.env.VERCEL === "1";
const repositoryName = "yerba-premium-web";
const isDevelopment = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  distDir: isDevelopment ? ".next-dev" : ".next",
  output: isGithubActions && !isVercel ? "export" : undefined,
  basePath: isGithubActions ? `/${repositoryName}` : undefined,
  assetPrefix: isGithubActions ? `/${repositoryName}/` : undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: isGithubActions ? `/${repositoryName}` : "",
    NEXT_PUBLIC_BUILD_MARKER:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
      process.env.GITHUB_SHA?.slice(0, 7) ??
      "local"
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