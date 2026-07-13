const productionSiteUrl = 'https://snhu-courses.vercel.app';

export const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
    productionSiteUrl;

export const lastUpdated = process.env.NEXT_PUBLIC_LAST_UPDATED ?? '';

export function formatLastUpdated(dateStr: string): string {
    const date = new Date(dateStr.length === 10 ? `${dateStr}T00:00:00` : dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
