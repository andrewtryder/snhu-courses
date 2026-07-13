import Link from 'next/link';
import { CourseSearchInput } from '@/components/CourseSearchInput';

interface AppHeaderProps {
    courseQuery?: string;
    onChange?: (value: string) => void;
    onSubmit?: (courseIds: string[]) => void;
    isLoading?: boolean;
    showSearch?: boolean;
    currentPage?: 'home' | 'about' | 'course' | 'courses';
}

export function AppHeader({
    courseQuery = '',
    onChange = () => {},
    onSubmit = () => {},
    isLoading,
    showSearch = true,
    currentPage = 'home',
}: AppHeaderProps) {
    return (
        <header className="sticky top-0 z-20 border-b border-surface-variant bg-surface">
            <div className="mx-auto flex h-16 w-full max-w-[var(--spacing-container-max)] items-center gap-4 px-4 md:px-8">
                <div className="flex shrink-0 items-center gap-4">
                    <Link
                        href="/"
                        className="inline-flex items-baseline gap-2 rounded-lg border border-surface-variant bg-surface-container-low px-3 py-2 no-underline transition-colors hover:border-primary hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                        aria-label="SNHU Course Prerequisites Tool home"
                    >
                        <span className="font-[family-name:var(--font-headline)] text-lg font-bold leading-none text-primary">
                            SNHU
                        </span>
                        <span className="font-[family-name:var(--font-headline)] text-sm font-semibold leading-none tracking-wide text-on-surface">
                            Course Prerequisites Tool
                        </span>
                    </Link>
                    {currentPage === 'about' && (
                        <span
                            aria-current="page"
                            className="hidden text-sm font-semibold tracking-wide text-primary md:inline"
                        >
                            About
                        </span>
                    )}
                    {currentPage === 'courses' && (
                        <span
                            aria-current="page"
                            className="hidden text-sm font-semibold tracking-wide text-primary md:inline"
                        >
                            Directory
                        </span>
                    )}
                </div>

                {showSearch && (
                    <div className="hidden min-w-0 flex-1 md:flex md:px-6">
                        <CourseSearchInput
                            value={courseQuery}
                            onChange={onChange}
                            onSubmit={onSubmit}
                            isLoading={isLoading}
                            variant="header"
                        />
                    </div>
                )}
            </div>

            {showSearch && (
                <div className="border-t border-surface-variant px-4 pb-3 pt-3 md:hidden">
                    <CourseSearchInput
                        value={courseQuery}
                        onChange={onChange}
                        onSubmit={onSubmit}
                        isLoading={isLoading}
                        variant="header"
                    />
                </div>
            )}
        </header>
    );
}
