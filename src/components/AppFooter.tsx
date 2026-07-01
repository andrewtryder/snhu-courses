import { formatLastUpdated, lastUpdated } from '@/lib/site';

export function AppFooter() {
    return (
        <footer aria-label="Footer" className="mt-auto border-t border-surface-variant bg-surface-container-low">
            <div className="mx-auto grid w-full max-w-[var(--spacing-container-max)] grid-cols-1 items-center gap-4 px-4 py-4 md:grid-cols-3 md:px-8">
                <p className="text-center text-sm text-on-surface-variant md:text-left">
                    {lastUpdated ? (
                        <>
                            <span className="font-bold text-on-surface">Updated:</span>{' '}
                            {formatLastUpdated(lastUpdated)}
                        </>
                    ) : null}
                </p>
                <p className="text-center text-sm text-on-surface-variant">
                    <span className="font-bold text-on-surface">Disclaimer:</span>{' '}
                    Unofficial SNHU site. All data is provided for informational purposes only.
                </p>
                <nav
                    aria-label="Footer navigation"
                    className="flex justify-center gap-6 text-xs font-medium tracking-wide md:justify-end"
                >
                    <a
                        href="https://github.com/andrewtryder/snhu-courses"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-on-surface-variant transition-colors hover:text-primary"
                    >
                        Source Code
                    </a>
                    <a
                        href="/about"
                        className="text-on-surface-variant transition-colors hover:text-primary"
                    >
                        About
                    </a>
                </nav>
            </div>
        </footer>
    );
}
