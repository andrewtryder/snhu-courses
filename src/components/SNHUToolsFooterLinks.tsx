import { SNHU_TOOLS, type SNHUToolId } from "@/lib/snhuTools";

interface SNHUToolsFooterLinksProps {
  currentToolId: SNHUToolId;
}

export function SNHUToolsFooterLinks({ currentToolId }: SNHUToolsFooterLinksProps) {
  return (
    <div className="flex flex-col items-center gap-1 md:items-end">
      <p className="text-xs font-bold uppercase tracking-wide text-on-surface">SNHU Tools</p>
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 md:justify-end">
        {SNHU_TOOLS.map((tool) => (
          <li key={tool.id}>
            {tool.id === currentToolId ? (
              <span className="text-xs font-semibold text-primary" aria-current="page">
                {tool.name}
              </span>
            ) : (
              <a
                href={tool.url}
                className="text-xs font-medium text-on-surface-variant transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low rounded-sm"
              >
                {tool.name}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
