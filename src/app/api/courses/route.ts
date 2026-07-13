import { db } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { parseCourseIdList } from '@/lib/courseIds';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
        return NextResponse.json({ error: 'No ids provided' }, { status: 400 });
    }

    const parsed = parseCourseIdList(idsParam);

    if (parsed.errors.length > 0) {
        return NextResponse.json(
            {
                error: parsed.errors.map((e) => e.message).join(' '),
                errors: parsed.errors,
            },
            { status: 400 }
        );
    }

    const ids = parsed.ids;

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
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');

        const result = await client.query(
            `
            SELECT * FROM courses_data
            WHERE catalog_course_id IN (${placeholders})
        `,
            ids
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Classes not found.' }, { status: 404 });
        }

        return NextResponse.json(result.rows);
    } catch (e) {
        console.error('Error fetching courses', e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    } finally {
        if (client) {
            client.release();
        }
    }
}
