import type { Metadata } from 'next';
import { ArrowUpRight, Info } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { AppFooter } from '@/components/AppFooter';

export const metadata: Metadata = {
    title: 'About',
    description:
        'Learn about the SNHU Course Prerequisites Tool — an unofficial site built by an SNHU graduate to help students visualize course dependencies and plan their degree path.',
    alternates: {
        canonical: '/about',
    },
    openGraph: {
        title: 'About | SNHU Course Prerequisites Tool',
        description:
            'Learn about the SNHU Course Prerequisites Tool — an unofficial site built by an SNHU graduate to help students visualize course dependencies and plan their degree path.',
        url: '/about',
    },
};

export default function AboutPage() {
    return (
        <div className="flex min-h-screen flex-col">
            <AppHeader showSearch={false} currentPage="about" />

            <main
                id="main-content"
                className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-10 md:px-8 md:py-16"
            >
                <article aria-labelledby="about-heading">
                    <header className="mb-10">
                        <h1
                            id="about-heading"
                            className="font-[family-name:var(--font-headline)] text-3xl font-bold text-primary md:text-4xl"
                        >
                            About This Tool
                        </h1>
                    </header>

                    <section aria-label="Background" className="space-y-5 text-base leading-relaxed text-on-surface-variant">
                        <p>
                            I built this site as a proud SNHU graduate who knows how important course
                            planning can be, especially when transfer credits, prerequisites, and heavy
                            course loads are involved.
                        </p>
                        <p>
                            During my time at Southern New Hampshire University, I often needed a clearer
                            way to understand which courses depended on others. Because I transferred in
                            several credits and wanted to make the most of each term, knowing prerequisite
                            relationships helped me plan more confidently and avoid surprises.
                        </p>
                        <p>
                            The SNHU Course Prerequisites Tool was designed to help students visualize
                            course dependencies as they move through their programs. Search for a course
                            to see the classes that may need to come before it, then use that information
                            as a planning aid while mapping out your degree path.
                        </p>
                    </section>

                    <section aria-label="Important disclaimer" className="mt-10">
                        <div className="flex gap-3 rounded-lg border border-outline-variant bg-surface-container p-5">
                            <Info
                                className="mt-0.5 h-5 w-5 shrink-0 text-on-surface-variant"
                                aria-hidden="true"
                            />
                            <div className="space-y-1.5 text-sm leading-relaxed text-on-surface-variant">
                                <p className="font-semibold text-on-surface">
                                    Unofficial — For Informational Purposes Only
                                </p>
                                <p>
                                    This site is unofficial and is intended for informational purposes
                                    only. Course requirements, transfer evaluations, catalog rules, and
                                    program requirements can change. Always confirm your academic plan
                                    with your SNHU advisor for official guidance.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section aria-label="Related tools" className="mt-8">
                        <h2 className="mb-4 font-[family-name:var(--font-headline)] text-lg font-semibold text-on-surface">
                            More Tools for SNHU Students
                        </h2>
                        <a
                            href="https://snhu-transfers.vercel.app"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-start justify-between gap-4 rounded-lg border border-surface-variant bg-surface-container-low p-5 transition-colors hover:border-primary hover:bg-surface-container"
                        >
                            <div className="min-w-0">
                                <p className="font-semibold text-primary group-hover:underline">
                                    SNHU Transfers
                                </p>
                                <p className="mt-1 text-sm text-on-surface-variant">
                                    Explore how certifications may transfer in as credits toward your
                                    SNHU degree.
                                </p>
                            </div>
                            <ArrowUpRight
                                className="mt-0.5 h-5 w-5 shrink-0 text-outline transition-colors group-hover:text-primary"
                                aria-hidden="true"
                            />
                        </a>
                    </section>
                </article>
            </main>

            <AppFooter />
        </div>
    );
}
