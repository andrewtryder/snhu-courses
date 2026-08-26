import { NextResponse } from 'next/server';
import { withPoolClient } from '@/lib/db/pool';
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

    try {
        const rows = await withPoolClient(async (client) => {
            const result = await client.query(
                `SELECT catalog_course_id
                 FROM courses_data
                 WHERE catalog_course_id = ANY($1)`,
                [ids]
            );
            return result.rows;
        });

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Classes not found.' }, { status: 404 });
        }

        return NextResponse.json(rows);
    } catch (e) {
        console.error('Error fetching courses', e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
