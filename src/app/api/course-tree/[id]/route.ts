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
        const tree = await createCourseTree(client, id);
        if (!tree) {
            return NextResponse.json({ error: `Class ID '${id}' not found.` }, { status: 404 });
        }

        return NextResponse.json(tree);
    } catch (e) {
        console.error("Error generating course tree", e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    } finally {
        if (client) {
            client.release();
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getCourseName(client: any, course_id: string) {
    const result = await client.sql`
        SELECT title
        FROM courses_data
        WHERE catalog_course_id = ${course_id}
    `;
    return result.rows.length > 0 ? result.rows[0].title : "Unknown";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getPrerequisites(client: any, course_id: string) {
    const result = await client.sql`
        SELECT prerequisites.course_id
        FROM prerequisites
        JOIN courses_data ON prerequisites.class_id = courses_data.pid
        WHERE prerequisites.class_id IN (
            SELECT pid
            FROM courses_data
            WHERE catalog_course_id = ${course_id}
        )
    `;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prereqs = result.rows.map((row: any) => row.course_id);
    prereqs.push(course_id); // Include self as in original python code
    prereqs.sort();
    return prereqs;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createCourseTree(client: any, course_id: string, seenCourses: Set<string> = new Set()) {
    if (seenCourses.has(course_id)) {
        return null;
    }

    seenCourses.add(course_id);

    const courseName = await getCourseName(client, course_id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const courseDict: any = {
        name: courseName || "Unknown",
        course_id: course_id
    };

    const prerequisites = await getPrerequisites(client, course_id);
    if (!prerequisites || prerequisites.length === 0) {
        return null; // Return null if no prerequisites found as per original code logic
    }

    courseDict.prerequisites = [];

    // In original code, it recursively builds a tree of all prerequisites
    for (const prereq_id of prerequisites) {
        // Skip self loop to prevent unnecessary recursion since we already added it to seen
        if (prereq_id !== course_id) {
            const childDict = await createCourseTree(client, prereq_id, seenCourses);
            if (childDict) {
                courseDict.prerequisites.push(childDict);
            }
        }
    }

    if (courseDict.prerequisites.length === 0) {
        delete courseDict.prerequisites;
    }

    return courseDict;
}
