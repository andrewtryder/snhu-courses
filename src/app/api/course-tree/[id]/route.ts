import { NextResponse } from 'next/server';
import { getCourseTree } from '@/lib/courses';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const resolvedParams = await params;
    const id = resolvedParams.id.toUpperCase();

    try {
        const tree = await getCourseTree(id);
        if (!tree) {
            return NextResponse.json({ error: `Class ID '${id}' not found.` }, { status: 404 });
        }

        return NextResponse.json(tree);
    } catch (e) {
        console.error('Error generating course tree', e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
