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
  // Honeybadger’s setupHoneybadger() injects a webpack() hook for config-file
  // entry injection and source-map upload. Next.js 16 defaults to Turbopack and
  // errors when a webpack config is present without a turbopack config. Source
  // maps are intentionally disabled, so we skip the wrapper and load Honeybadger
  // via instrumentation (server) + client init / error boundaries (browser).
  serverExternalPackages: ["@honeybadger-io/js"],
};

export default nextConfig;
