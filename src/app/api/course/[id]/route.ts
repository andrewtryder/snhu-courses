import { db } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const resolvedParams = await params;
    const id = resolvedParams.id.toUpperCase();

    let client;
    try {
        client = await db.connect();
    } catch (e) {
        console.error("Database connection error:", e);
        return NextResponse.json({ error: "Failed to connect to the database. Ensure POSTGRES_URL is set." }, { status: 500 });
    }

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
        if (client) {
            client.release();
        }
    }
}
