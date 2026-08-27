export type SNHUToolId = "courses" | "transfers" | "degreemap";

export interface SNHUTool {
  id: SNHUToolId;
  name: string;
  url: string;
}

/** Public production URLs for the SNHU Tools family. */
export const SNHU_TOOLS: readonly SNHUTool[] = [
  {
    id: "courses",
    name: "Course Prerequisites",
    url: "https://snhu-courses.vercel.app",
  },
  {
    id: "transfers",
    name: "Transfer Equivalencies",
    url: "https://snhu-transfers.vercel.app",
  },
  {
    id: "degreemap",
    name: "Degree Map",
    url: "https://snhu-degreemap.vercel.app",
  },
] as const;

export const CURRENT_TOOL_ID: SNHUToolId = "courses";

export const GITHUB_REPO_URL = "https://github.com/andrewtryder/snhu-courses";
