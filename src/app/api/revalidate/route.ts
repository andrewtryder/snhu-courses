import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * POST /api/revalidate
 *
 * Invalidates the `catalog-data` cache tag and revalidates key static paths.
 * Intended for use by CircleCI or a trusted desktop process after a successful
 * catalog promotion.
 *
 * Authorization: Bearer <REVALIDATE_SECRET>
 *
 * Returns 500 if REVALIDATE_SECRET is not configured (fails closed).
 * Returns 401 if the Authorization header does not match.
 *
 * Example (curl):
 *   curl -X POST https://your-site.vercel.app/api/revalidate \
 *     -H "Authorization: Bearer $REVALIDATE_SECRET"
 */
export async function POST(request: Request) {
    const secret = process.env.REVALIDATE_SECRET;

    // Fail closed: if the secret is not configured, refuse all requests.
    if (!secret) {
        return NextResponse.json(
            { error: 'Revalidation endpoint is not configured.' },
            { status: 500 }
        );
    }

    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // Invalidate all data cached under the catalog-data tag.
    // In Next.js 16 revalidateTag requires a second profile argument.
    // 'max' means no expire limit — the entry is revalidated on the next request.
    revalidateTag('catalog-data', 'max');

    // Also revalidate key catalog-backed routes so they are regenerated on next request.
    revalidatePath('/courses');
    revalidatePath('/course/[id]', 'page');
    revalidatePath('/sitemap.xml');

    return NextResponse.json({
        revalidated: true,
        tag: 'catalog-data',
        paths: ['/courses', '/course/[id]', '/sitemap.xml'],
        revalidatedAt: new Date().toISOString(),
    });
}
