import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ ids: string }> }
) {
    const resolvedParams = await params;
    const origin = request.headers.get('host') ? `http://${request.headers.get('host')}` : 'http://localhost:3000';
    const ids = resolvedParams.ids.split(',');
    const course_trees = [];

    for (const id of ids) {
        const response = await fetch(`${origin}/api/course-tree/${id.trim()}`);
        if (response.ok) {
            const data = await response.json();
            course_trees.push(data);
        }
    }

    if (course_trees.length === 0) {
        return NextResponse.json({ error: "No course trees found." }, { status: 404 });
    }

    return NextResponse.json(course_trees);
}
