import type { MetadataRoute } from 'next';
import { getAllCourseIds } from '@/lib/courses';
import { siteUrl } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: `${siteUrl}/`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 1,
        },
        {
            url: `${siteUrl}/about`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
    ];

    // When the database is unavailable at build time, fall back to static routes only.
    const courseIds = await getAllCourseIds();
    const courseRoutes: MetadataRoute.Sitemap = courseIds.map((id) => ({
        url: `${siteUrl}/course/${id}`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.7,
    }));

    return [...staticRoutes, ...courseRoutes];
}
