import { db } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
        return NextResponse.json({ error: "No ids provided" }, { status: 400 });
    }

    const ids = idsParam.split(',').map(id => id.toUpperCase().trim());
    const client = await db.connect();

    try {
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');

        const result = await client.query(`
            SELECT * FROM courses_data
            WHERE catalog_course_id IN (${placeholders})
        `, ids);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: "Classes not found." }, { status: 404 });
        }

        return NextResponse.json(result.rows);
    } catch (e) {
        console.error("Error fetching courses", e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    } finally {
        client.release();
    }
}
