import { db } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const resolvedParams = await params;
    const client = await db.connect();
    const id = resolvedParams.id.toUpperCase();

    try {
        const result = await client.sql`
            SELECT title, pid, catalog_course_id, description, academic_level,
                   credits, date_start, online_offering, campus_offering, subject_code
            FROM courses_data
            WHERE catalog_course_id = ${id}
        `;

        if (result.rows.length === 0) {
            return NextResponse.json({ error: `Class ID '${id}' not found.` }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (e) {
        console.error("Error fetching course", e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    } finally {
        client.release();
    }
}
