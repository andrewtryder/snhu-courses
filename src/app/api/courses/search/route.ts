import { NextResponse } from 'next/server';
import { withPoolClient } from '@/lib/db/pool';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() ?? '';
    const parsedLimit = parseInt(searchParams.get('limit') ?? '10', 10);
    const limit = Math.min(Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 10, 1), 25);

    if (query.length < 1) {
        return NextResponse.json([]);
    }

    try {
        const prefixPattern = `${query}%`;
        const containsPattern = `%${query}%`;

        const rows = await withPoolClient(async (client) => {
            const result = await client.sql`
                SELECT catalog_course_id, title
                FROM courses_data
                WHERE catalog_course_id ILIKE ${containsPattern}
                ORDER BY
                    CASE WHEN catalog_course_id ILIKE ${prefixPattern} THEN 0 ELSE 1 END,
                    catalog_course_id
                LIMIT ${limit}
            `;
            return result.rows;
        });

        return NextResponse.json(rows);
    } catch (e) {
        console.error('Error searching courses', e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
