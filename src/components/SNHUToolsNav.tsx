"use client";

import { ChevronDownIcon } from "lucide-react";
import { SNHU_TOOLS, type SNHUToolId } from "@/lib/snhuTools";

const summaryClassName =
  "inline-flex cursor-pointer list-none items-center gap-1 rounded-md border border-outline-variant bg-surface-container-low px-3 py-2 text-sm font-medium text-on-surface transition-colors hover:border-primary hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface [&::-webkit-details-marker]:hidden";

interface SNHUToolsNavProps {
  currentToolId: SNHUToolId;
}

/** Compact SNHU Tools menu — duplicated intentionally across SNHU Tools repos. */
export function SNHUToolsNav({ currentToolId }: SNHUToolsNavProps) {
  return (
    <details className="relative shrink-0">
      <summary className={summaryClassName} aria-haspopup="menu">
        <span>Tools</span>
        <ChevronDownIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
      </summary>
      <div
        role="menu"
        aria-label="SNHU Tools"
        className="absolute right-0 top-full z-40 mt-1 min-w-[12.5rem] rounded-lg border border-surface-variant bg-surface-container-lowest py-1 shadow-sm"
      >
        <p className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
          SNHU Tools
        </p>
        <ul role="none">
          {SNHU_TOOLS.map((tool) => (
            <li key={tool.id} role="none">
              {tool.id === currentToolId ? (
                <span
                  role="menuitem"
                  aria-current="page"
                  className="block px-3 py-2 text-sm font-semibold text-primary"
                >
                  {tool.name}
                </span>
              ) : (
                <a
                  role="menuitem"
                  href={tool.url}
                  className="block px-3 py-2 text-sm text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                >
                  {tool.name}
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
