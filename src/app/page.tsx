import type { Metadata } from 'next';
import { Suspense } from 'react';
import { HomeClient } from '@/components/HomeClient';
import { getCourseTree } from '@/lib/courses';
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

async function loadInitialTrees(ids?: string): Promise<CourseTree[] | undefined> {
    if (!ids) {
        return undefined;
    }

    const courseIds = ids
        .split(',')
        .map((id) => id.trim().toUpperCase())
        .filter(Boolean);

    if (courseIds.length <= 1) {
        return undefined;
    }

    const trees = await Promise.all(courseIds.map((id) => getCourseTree(id)));
    const validTrees = trees.filter((tree): tree is CourseTree => tree !== null);

    return validTrees.length > 0 ? validTrees : undefined;
}

export default async function HomePage({ searchParams }: HomePageProps) {
    const { ids } = await searchParams;
    const initialTrees = await loadInitialTrees(ids);


    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        url: siteUrl,
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${siteUrl}/?ids={search_term_string}`
            },
            'query-input': 'required name=search_term_string'
        }
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <Suspense>
                <HomeClient initialIds={ids} initialTrees={initialTrees} />
            </Suspense>
        </>
    );
}
