import type { Metadata } from 'next';
import { Suspense } from 'react';
import { HomeClient } from '@/components/HomeClient';
import { getCourseTrees } from '@/lib/courses';
import { parseCourseIdList } from '@/lib/courseIds';
import { serializeJsonLd } from '@/lib/safeJsonLd';
import { siteUrl } from '@/lib/site';
import type { CourseTree } from '@/lib/courseGraphLayout';

export const metadata: Metadata = {
    alternates: {
        canonical: '/',
    },
};

interface HomePageProps {
    searchParams: Promise<{ ids?: string }>;
}

interface InitialLoadResult {
    trees?: CourseTree[];
    error?: string;
    ids?: string;
}

async function loadInitialTrees(ids?: string): Promise<InitialLoadResult> {
    if (!ids) {
        return {};
    }

    const parsed = parseCourseIdList(ids);

    if (parsed.errors.length > 0) {
        return {
            error: parsed.errors.map((e) => e.message).join(' '),
            ids,
        };
    }

    // Single-course URLs redirect via client search; SSR only loads multi-course graphs.
    if (parsed.ids.length <= 1) {
        return { ids };
    }

    try {
        const results = await getCourseTrees(parsed.ids);
        const trees: CourseTree[] = [];
        const missing: string[] = [];

        for (const { id, tree } of results) {
            if (tree) {
                trees.push(tree);
            } else {
                missing.push(id);
            }
        }

        if (missing.length > 0) {
            return {
                trees: trees.length > 0 ? trees : undefined,
                error: `Unknown course${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`,
                ids: parsed.ids.join(','),
            };
        }

        return {
            trees: trees.length > 0 ? trees : undefined,
            ids: parsed.ids.join(','),
        };
    } catch {
        return {
            error: 'Could not load course data. Please try again later.',
            ids: parsed.ids.join(','),
        };
    }
}

export default async function HomePage({ searchParams }: HomePageProps) {
    const { ids } = await searchParams;
    const { trees: initialTrees, error: initialError, ids: normalizedIds } =
        await loadInitialTrees(ids);

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        url: siteUrl,
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${siteUrl}/?ids={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
        },
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
            />
            <Suspense>
                <HomeClient
                    initialIds={normalizedIds ?? ids}
                    initialTrees={initialTrees}
                    initialError={initialError}
                />
            </Suspense>
        </>
    );
}
