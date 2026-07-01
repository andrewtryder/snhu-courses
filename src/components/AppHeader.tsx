import { CourseSearchInput } from '@/components/CourseSearchInput';

interface AppHeaderProps {
    courseQuery: string;
    onChange: (value: string) => void;
    onSubmit: (courseIds: string[]) => void;
    isLoading?: boolean;
}

export function AppHeader({ courseQuery, onChange, onSubmit, isLoading }: AppHeaderProps) {
    return (
        <header className="sticky top-0 z-20 border-b border-surface-variant bg-surface">
            <div className="mx-auto flex h-16 w-full max-w-[var(--spacing-container-max)] items-center gap-4 px-4 md:px-8">
                <div className="flex shrink-0 items-center gap-6">
                    <a
                        href="/"
                        className="font-[family-name:var(--font-headline)] text-xl font-bold text-primary transition-opacity hover:opacity-80"
                        aria-label="SNHU Course Prerequisites Tool home"
                    >
                        SNHU
                    </a>
                    <nav aria-label="Primary" className="hidden h-full items-center md:flex">
                        <span
                            aria-current="page"
                            className="flex h-full items-center border-b-2 border-primary pb-1 text-sm font-semibold tracking-wide text-primary opacity-80"
                        >
                            Course Prerequisites Tool
                        </span>
                    </nav>
                </div>

                <div className="hidden min-w-0 flex-1 md:flex md:px-6">
                    <CourseSearchInput
                        value={courseQuery}
                        onChange={onChange}
                        onSubmit={onSubmit}
                        isLoading={isLoading}
                        variant="header"
                    />
                </div>
            </div>

            <div className="border-t border-surface-variant px-4 pb-3 pt-3 md:hidden">
                <CourseSearchInput
                    value={courseQuery}
                    onChange={onChange}
                    onSubmit={onSubmit}
                    isLoading={isLoading}
                    variant="header"
                />
            </div>
        </header>
    );
}
