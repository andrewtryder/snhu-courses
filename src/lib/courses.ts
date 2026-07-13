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
            // Clone per branch so diamond-shared prerequisites remain under sibling edges.
            const childDict = await createCourseTree(client, prereqId, new Set(seenCourses));
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

export interface CourseTreeResult {
    id: string;
    tree: CourseTree | null;
}

/** Load multiple course trees using a single DB client (fresh seen-set per root). */
export async function getCourseTrees(courseIds: string[]): Promise<CourseTreeResult[]> {
    if (courseIds.length === 0) {
        return [];
    }

    return withDbClient(async (client) => {
        const results: CourseTreeResult[] = [];
        for (const courseId of courseIds) {
            const id = courseId.toUpperCase();
            const tree = await createCourseTree(client, id);
            results.push({ id, tree });
        }
        return results;
    });
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

export interface CourseSummary {
    catalog_course_id: string;
    title: string;
}

/**
 * Fetches all course IDs and titles for the directory page in one query.
 * Deduplicates by catalog_course_id (first wins). Returns [] when the DB is unavailable.
 */
export async function getAllCourseSummaries(): Promise<CourseSummary[]> {
    try {
        return await withDbClient(async (client) => {
            const result = await client.sql`
                SELECT catalog_course_id, title
                FROM courses_data
                WHERE catalog_course_id IS NOT NULL
                ORDER BY catalog_course_id
            `;

            const seen = new Set<string>();
            const summaries: CourseSummary[] = [];

            for (const row of result.rows) {
                const id = row.catalog_course_id as string;
                if (!id || seen.has(id)) {
                    continue;
                }
                seen.add(id);
                summaries.push({
                    catalog_course_id: id,
                    title: (row.title as string) ?? '',
                });
            }

            return summaries;
        });
    } catch (error) {
        console.warn('Could not fetch course summaries for directory:', error);
        return [];
    }
}

/**
 * Successful catalog sync timestamp from catalog_sync_state.completed_at.
 * Returns null when unavailable, missing, or invalid — never throws for sitemap use.
 */
export async function getCatalogLastModified(): Promise<Date | null> {
    try {
        return await withDbClient(async (client) => {
            const result = await client.sql`
                SELECT completed_at
                FROM catalog_sync_state
                WHERE id = 'catalog'
            `;

            if (result.rows.length === 0) {
                return null;
            }

            const raw = result.rows[0].completed_at;
            if (raw == null) {
                return null;
            }

            const date = raw instanceof Date ? raw : new Date(raw as string);
            if (Number.isNaN(date.getTime())) {
                return null;
            }

            return date;
        });
    } catch (error) {
        console.warn('Could not fetch catalog last-modified timestamp:', error);
        return null;
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
