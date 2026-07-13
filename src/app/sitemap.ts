import type { MetadataRoute } from 'next';
import { getAllCourseIds, getCatalogLastModified } from '@/lib/courses';
import { siteUrl } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const [courseIds, catalogLastModified] = await Promise.all([
        getAllCourseIds(),
        getCatalogLastModified(),
    ]);

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
