import { db } from '@vercel/postgres';
import type { VercelPoolClient } from '@vercel/postgres';
import type { CourseTree } from '@/lib/courseGraphLayout';

export interface CourseRecord {
    title: string;
    pid: string;
    catalog_course_id: string;
    description: string | null;
    academic_level: string | null;
    credits: string | null;
    subject_code: string | null;
}

async function withDbClient<T>(fn: (client: VercelPoolClient) => Promise<T>): Promise<T> {
    const client = await db.connect();
    try {
        return await fn(client);
    } finally {
        client.release();
    }
}

export async function getCourseName(client: VercelPoolClient, courseId: string): Promise<string> {
    const result = await client.sql`
        SELECT title
        FROM courses_data
        WHERE catalog_course_id = ${courseId}
    `;
    return result.rows.length > 0 ? (result.rows[0].title as string) : 'Unknown';
}

export async function getCourseById(courseId: string): Promise<CourseRecord | null> {
    const id = courseId.toUpperCase();
    return withDbClient(async (client) => {
        const result = await client.sql`
            SELECT title, pid, catalog_course_id, description, academic_level, credits, subject_code
            FROM courses_data
            WHERE catalog_course_id = ${id}
        `;
        return result.rows.length > 0 ? (result.rows[0] as CourseRecord) : null;
    });
}

export async function getPrerequisiteIds(client: VercelPoolClient, courseId: string): Promise<string[]> {
    const result = await client.sql`
        SELECT prerequisites.course_id
        FROM prerequisites
        JOIN courses_data ON prerequisites.class_id = courses_data.pid
        WHERE prerequisites.class_id IN (
            SELECT pid
            FROM courses_data
            WHERE catalog_course_id = ${courseId}
        )
    `;

    const prereqs = result.rows.map((row) => row.course_id as string);
    prereqs.push(courseId);
    prereqs.sort();
    return prereqs;
}

export async function createCourseTree(
    client: VercelPoolClient,
    courseId: string,
    seenCourses: Set<string> = new Set()
): Promise<CourseTree | null> {
    if (seenCourses.has(courseId)) {
        return null;
    }

    seenCourses.add(courseId);

    const courseName = await getCourseName(client, courseId);
    if (courseName === 'Unknown') {
        return null;
    }

    const courseDict: CourseTree = {
        name: courseName,
        course_id: courseId,
    };

    const prerequisites = await getPrerequisiteIds(client, courseId);
    if (!prerequisites || prerequisites.length === 0) {
        return null;
    }

    const childTrees: CourseTree[] = [];
    for (const prereqId of prerequisites) {
        if (prereqId !== courseId) {
            const childDict = await createCourseTree(client, prereqId, seenCourses);
            if (childDict) {
                childTrees.push(childDict);
            }
        }
    }

    if (childTrees.length > 0) {
        courseDict.prerequisites = childTrees;
    }

    return courseDict;
}

export async function getCourseTree(courseId: string): Promise<CourseTree | null> {
    const id = courseId.toUpperCase();
    return withDbClient((client) => createCourseTree(client, id));
}

/**
 * Returns catalog course IDs for courses that list `courseId` as a prerequisite.
 * Used for internal linking ("this course is a prerequisite for...").
 */
export async function getDependentCourseIds(courseId: string): Promise<string[]> {
    const id = courseId.toUpperCase();
    return withDbClient(async (client) => {
        const result = await client.sql`
            SELECT DISTINCT cd.catalog_course_id
            FROM prerequisites p
            JOIN courses_data cd ON p.class_id = cd.pid
            WHERE p.course_id = ${id}
              AND cd.catalog_course_id != ${id}
            ORDER BY cd.catalog_course_id
        `;
        return result.rows.map((row) => row.catalog_course_id as string);
    });
}

/**
 * Fetches all known course IDs. Returns an empty array when the database is unavailable
 * (e.g. local builds without POSTGRES_URL) so callers can fail gracefully.
 */
export async function getAllCourseIds(): Promise<string[]> {
    try {
        return await withDbClient(async (client) => {
            const result = await client.sql`
                SELECT catalog_course_id
                FROM courses_data
                ORDER BY catalog_course_id
            `;
            return result.rows.map((row) => row.catalog_course_id as string);
        });
    } catch (error) {
        console.warn('Could not fetch course IDs for static generation:', error);
        return [];
    }
}

/** Direct prerequisite IDs for a course (excluding self). */
export async function getDirectPrerequisiteIds(courseId: string): Promise<string[]> {
    const id = courseId.toUpperCase();
    return withDbClient(async (client) => {
        const result = await client.sql`
            SELECT prerequisites.course_id
            FROM prerequisites
            JOIN courses_data ON prerequisites.class_id = courses_data.pid
            WHERE prerequisites.class_id IN (
                SELECT pid
                FROM courses_data
                WHERE catalog_course_id = ${id}
            )
              AND prerequisites.course_id != ${id}
            ORDER BY prerequisites.course_id
        `;
        return result.rows.map((row) => row.course_id as string);
    });
}
