import type { MetadataRoute } from 'next';
import { getSitemapCatalogData } from '@/lib/courses';
import { siteUrl } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    let courseIds: string[] = [];
    let catalogLastModified: Date | null = null;

    try {
        ({ courseIds, catalogLastModified } = await getSitemapCatalogData());
    } catch (error) {
        // Build-safe: catalog infrastructure failures must not prevent deployment.
        console.warn('Could not fetch catalog data for sitemap; serving static routes only.', error);
    }

    const withCatalogTimestamp = (
        entry: Omit<MetadataRoute.Sitemap[number], 'lastModified'>
    ): MetadataRoute.Sitemap[number] =>
        catalogLastModified ? { ...entry, lastModified: catalogLastModified } : entry;

    const staticRoutes: MetadataRoute.Sitemap = [
        withCatalogTimestamp({
            url: `${siteUrl}/`,
            changeFrequency: 'weekly',
            priority: 1,
        }),
        withCatalogTimestamp({
            url: `${siteUrl}/courses`,
            changeFrequency: 'weekly',
            priority: 0.8,
        }),
        {
            url: `${siteUrl}/about`,
            changeFrequency: 'monthly',
            priority: 0.5,
        },
    ];

    // When the database is unavailable at build time, fall back to static routes only.
    const courseRoutes: MetadataRoute.Sitemap = courseIds.map((id) =>
        withCatalogTimestamp({
            url: `${siteUrl}/course/${id}`,
            changeFrequency: 'monthly',
            priority: 0.7,
        })
    );

    return [...staticRoutes, ...courseRoutes];
}
