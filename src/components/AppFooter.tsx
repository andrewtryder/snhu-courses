export function AppFooter() {
    return (
        <footer className="mt-auto border-t border-surface-variant bg-surface-container-low">
            <div className="mx-auto flex w-full max-w-[var(--spacing-container-max)] flex-col items-center justify-between gap-4 px-4 py-4 md:flex-row md:px-8">
                <div className="order-2 md:order-1">
                    <p className="text-center text-sm font-bold text-on-surface-variant md:text-left">
                        <span className="text-on-surface">Unofficial</span> SNHU Site. All data is for informational purposes only and not guaranteed.
                    </p>
                </div>
                <nav className="order-1 flex gap-6 text-xs font-medium tracking-wide md:order-2">
                    <a
                        href="https://github.com/andrewtryder/snhu-courses"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-on-surface-variant transition-colors hover:text-primary"
                    >
                        GitHub
                    </a>
                    <a
                        href="#"
                        className="text-on-surface-variant transition-colors hover:text-primary"
                    >
                        About
                    </a>
                </nav>
            </div>
        </footer>
    );
}
