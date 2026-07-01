import { db } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() ?? '';
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '10', 10), 1), 25);

    if (query.length < 1) {
        return NextResponse.json([]);
    }

    let client;
    try {
        client = await db.connect();
    } catch (e) {
        console.error('Database connection error:', e);
        return NextResponse.json(
            { error: 'Failed to connect to the database. Ensure POSTGRES_URL is set.' },
            { status: 500 }
        );
    }

    try {
        const prefixPattern = `${query}%`;
        const containsPattern = `%${query}%`;

        const result = await client.sql`
            SELECT catalog_course_id, title
            FROM courses_data
            WHERE catalog_course_id ILIKE ${containsPattern}
            ORDER BY
                CASE WHEN catalog_course_id ILIKE ${prefixPattern} THEN 0 ELSE 1 END,
                catalog_course_id
            LIMIT ${limit}
        `;

        return NextResponse.json(result.rows);
    } catch (e) {
        console.error('Error searching courses', e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    } finally {
        if (client) {
            client.release();
        }
    }
}
