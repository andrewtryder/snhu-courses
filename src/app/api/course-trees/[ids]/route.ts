import { NextResponse } from 'next/server';
import { getCourseTrees } from '@/lib/courses';
import { parseCourseIdList } from '@/lib/courseIds';
import type { CourseTree } from '@/lib/courseGraphLayout';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ ids: string }> }
) {
    const { ids: idsParam } = await params;
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

    try {
        const results = await getCourseTrees(parsed.ids);
        const trees: CourseTree[] = [];
        const errors: { id: string; code: string; message: string }[] = [];

        for (const { id, tree } of results) {
            if (tree) {
                trees.push(tree);
            } else {
                errors.push({
                    id,
                    code: 'not_found',
                    message: `Course not found: ${id}`,
                });
            }
        }

        if (trees.length === 0) {
            return NextResponse.json(
                { trees: [], errors, error: 'No course trees found.' },
                { status: 404 }
            );
        }

        return NextResponse.json({ trees, errors });
    } catch (e) {
        console.error('Error fetching course trees', e);
        return NextResponse.json(
            { error: 'Failed to fetch course trees.', trees: [], errors: [] },
            { status: 500 }
        );
    }
}
