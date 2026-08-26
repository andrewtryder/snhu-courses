import { NextResponse } from 'next/server';
import { withPoolClient } from '@/lib/db/pool';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const resolvedParams = await params;
    const id = resolvedParams.id.toUpperCase();

    try {
        const row = await withPoolClient(async (client) => {
            const result = await client.sql`
                SELECT title, pid, catalog_course_id, description, academic_level,
                       credits, date_start, online_offering, campus_offering, subject_code
                FROM courses_data
                WHERE catalog_course_id = ${id}
            `;
            return result.rows[0] ?? null;
        });

        if (!row) {
            return NextResponse.json({ error: `Class ID '${id}' not found.` }, { status: 404 });
        }

        return NextResponse.json(row);
    } catch (e) {
        console.error('Error fetching course', e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
