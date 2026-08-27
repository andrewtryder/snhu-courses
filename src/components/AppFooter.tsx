import { formatLastUpdated, lastUpdated } from '@/lib/site';
import { SNHUToolsFooterLinks } from '@/components/SNHUToolsFooterLinks';
import { CURRENT_TOOL_ID, GITHUB_REPO_URL } from '@/lib/snhuTools';

export function AppFooter() {
    return (
        <footer aria-label="Footer" className="mt-auto border-t border-surface-variant bg-surface-container-low">
            <div className="mx-auto w-full max-w-[var(--spacing-container-max)] px-4 py-4 md:px-8">
                <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3 md:items-center">
                    <p className="text-center text-sm text-on-surface-variant md:text-left">
                        {lastUpdated ? (
                            <>
                                <span className="font-bold text-on-surface">Last Updated:</span>{' '}
                                {formatLastUpdated(lastUpdated)}
                            </>
                        ) : null}
                    </p>
                    <p className="text-center text-sm text-on-surface-variant">
                        <span className="font-bold text-on-surface">Disclaimer:</span> Unofficial SNHU
                        site. Data is provided for informational purposes only. Confirm official
                        requirements with SNHU where appropriate.
                    </p>
                    <nav
                        aria-label="Footer navigation"
                        className="flex flex-col items-center gap-3 md:items-end"
                    >
                        <div className="flex flex-wrap justify-center gap-4 text-xs font-medium tracking-wide md:justify-end">
                            <a
                                href="/courses"
                                className="text-on-surface-variant transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low rounded-sm"
                            >
                                Courses
                            </a>
                            <a
                                href="/about"
                                className="text-on-surface-variant transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low rounded-sm"
                            >
                                About
                            </a>
                            <a
                                href={GITHUB_REPO_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-on-surface-variant transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low rounded-sm"
                            >
                                Source Code
                                <span className="sr-only"> (opens in a new tab)</span>
                            </a>
                        </div>
                        <SNHUToolsFooterLinks currentToolId={CURRENT_TOOL_ID} />
                    </nav>
                </div>
            </div>
        </footer>
    );
}
