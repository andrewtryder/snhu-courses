import type { NextConfig } from "next";
import { execSync } from "node:child_process";

function getLastUpdated(): string {
  try {
    return execSync("git log -1 --format=%cs", { encoding: "utf-8" }).trim();
  } catch {
    return process.env.VERCEL_GIT_COMMIT_DATE?.slice(0, 10) ?? "";
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_LAST_UPDATED: getLastUpdated(),
  },
};

export default nextConfig;
