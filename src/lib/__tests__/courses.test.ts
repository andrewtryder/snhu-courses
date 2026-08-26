/**
 * Unit tests for the prerequisite-tree CTE engine in src/lib/courses.ts.
 *
 * These tests exercise `buildTreesFromGraph` (pure TypeScript, no DB) and
 * the exported cached wrappers via mocked DB clients.
 *
 * Run: npm test
 */
import { beforeEach, describe, it, expect, vi } from 'vitest';

// ── Import only pure, non-DB exports for unit tests ──────────────────────────
// We import the internal helper directly; the file-level module mock below
// prevents any real database or next/cache calls.

const { withPoolClientMock, persistentCache, unstableCache } = vi.hoisted(() => {
    const entries = new Map<string, Promise<unknown>>();
    return {
        withPoolClientMock: vi.fn(),
        persistentCache: {
            clear: () => entries.clear(),
        },
        unstableCache: vi.fn((fn: (...args: never[]) => unknown, keyParts: string[]) =>
            async (...args: never[]) => {
                const key = JSON.stringify([keyParts, args]);
                const cached = entries.get(key);
                if (cached) return cached;

                const result = Promise.resolve(fn(...args));
                entries.set(key, result);
                try {
                    return await result;
                } catch (error) {
                    // Next must be allowed to retry infrastructure failures.
                    entries.delete(key);
                    throw error;
                }
            }
        ),
    };
});

vi.mock('@/lib/db/pool', () => ({ withPoolClient: withPoolClientMock }));

vi.mock('react', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react')>()),
    cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

vi.mock('next/cache', () => ({
    unstable_cache: unstableCache,
    revalidateTag: vi.fn(),
    revalidatePath: vi.fn(),
}));

import {
    buildTreesFromGraph,
    getAllCourseIds,
    getCourseById,
    getCourseTrees,
} from '../courses';
import type { CourseTree } from '@/lib/courseGraphLayout';

// ── Helper: quick CourseTree comparison ──────────────────────────────────────

function treeOf(course_id: string, name: string, prereqs?: CourseTree[]): CourseTree {
    const t: CourseTree = { course_id, name };
    if (prereqs && prereqs.length > 0) t.prerequisites = prereqs;
    return t;
}

function dbClient(overrides: Record<string, unknown> = {}) {
    return {
        query: vi.fn(),
        sql: vi.fn(),
        ...overrides,
    };
}

beforeEach(() => {
    persistentCache.clear();
    withPoolClientMock.mockReset();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('buildTreesFromGraph', () => {
    // ── 1. Course with no prerequisites ──────────────────────────────────────
    it('returns a leaf tree when a course has no prerequisites', () => {
        const rootTitles = new Map([['CS101', 'Intro to Computer Science']]);
        const results = buildTreesFromGraph(['CS101'], rootTitles, []);

        expect(results).toHaveLength(1);
        expect(results[0]!.id).toBe('CS101');
        expect(results[0]!.tree).toEqual(treeOf('CS101', 'Intro to Computer Science'));
        expect(results[0]!.tree?.prerequisites).toBeUndefined();
    });

    // ── 2. Linear prerequisite chain ─────────────────────────────────────────
    it('builds a linear chain A → B → C correctly', () => {
        // A requires B, B requires C
        const rootTitles = new Map([['A', 'Course A']]);
        const edges = [
            { parentId: 'A', parentTitle: 'Course A', childId: 'B', childTitle: 'Course B' },
            { parentId: 'B', parentTitle: 'Course B', childId: 'C', childTitle: 'Course C' },
        ];

        const [result] = buildTreesFromGraph(['A'], rootTitles, edges);
        expect(result!.tree).toEqual(
            treeOf('A', 'Course A', [
                treeOf('B', 'Course B', [
                    treeOf('C', 'Course C'),
                ]),
            ])
        );
    });

    // ── 3. Multiple direct prerequisites ─────────────────────────────────────
    it('handles multiple direct prerequisites for one course', () => {
        const rootTitles = new Map([['CS301', 'Algorithms']]);
        const edges = [
            { parentId: 'CS301', parentTitle: 'Algorithms', childId: 'CS201', childTitle: 'Data Structures' },
            { parentId: 'CS301', parentTitle: 'Algorithms', childId: 'MATH201', childTitle: 'Discrete Math' },
        ];

        const [result] = buildTreesFromGraph(['CS301'], rootTitles, edges);
        expect(result!.tree?.prerequisites).toHaveLength(2);
        const childIds = result!.tree?.prerequisites?.map((p) => p.course_id).sort();
        expect(childIds).toEqual(['CS201', 'MATH201']);
    });

    // ── 4. Diamond-shaped shared prerequisite graph ───────────────────────────
    it('handles a diamond graph: A→B, A→C, B→D, C→D', () => {
        // A requires B and C; both B and C require D.
        // The resulting tree should include D under both B and C branches.
        const rootTitles = new Map([['A', 'Course A']]);
        const edges = [
            { parentId: 'A', parentTitle: 'Course A', childId: 'B', childTitle: 'Course B' },
            { parentId: 'A', parentTitle: 'Course A', childId: 'C', childTitle: 'Course C' },
            { parentId: 'B', parentTitle: 'Course B', childId: 'D', childTitle: 'Course D' },
            { parentId: 'C', parentTitle: 'Course C', childId: 'D', childTitle: 'Course D' },
        ];

        const [result] = buildTreesFromGraph(['A'], rootTitles, edges);
        const prereqs = result!.tree?.prerequisites ?? [];
        expect(prereqs).toHaveLength(2);

        // Both branches should have D as a child
        const bBranch = prereqs.find((p) => p.course_id === 'B');
        const cBranch = prereqs.find((p) => p.course_id === 'C');
        expect(bBranch?.prerequisites?.[0]?.course_id).toBe('D');
        expect(cBranch?.prerequisites?.[0]?.course_id).toBe('D');
    });

    // ── 5. Cycle detection ────────────────────────────────────────────────────
    it('cuts cycles and does not recurse infinitely', () => {
        // A requires B, B requires A (cycle)
        const rootTitles = new Map([['A', 'Course A']]);
        const edges = [
            { parentId: 'A', parentTitle: 'Course A', childId: 'B', childTitle: 'Course B' },
            { parentId: 'B', parentTitle: 'Course B', childId: 'A', childTitle: 'Course A' },
        ];

        const [result] = buildTreesFromGraph(['A'], rootTitles, edges);
        // B should appear as a child of A, but A should NOT appear again under B.
        expect(result!.tree?.prerequisites).toHaveLength(1);
        expect(result!.tree?.prerequisites?.[0]?.course_id).toBe('B');
        // B's child (A) should be cut because A is already in the branch path.
        expect(result!.tree?.prerequisites?.[0]?.prerequisites).toBeUndefined();
    });

    // ── 6. Multiple requested root courses ────────────────────────────────────
    it('returns separate trees for multiple root courses', () => {
        const rootTitles = new Map([
            ['CS101', 'Intro CS'],
            ['IT140', 'Intro to Scripting'],
        ]);
        const edges = [
            { parentId: 'IT140', parentTitle: 'Intro to Scripting', childId: 'CS101', childTitle: 'Intro CS' },
        ];

        const results = buildTreesFromGraph(['CS101', 'IT140'], rootTitles, edges);

        expect(results).toHaveLength(2);

        const cs101 = results.find((r) => r.id === 'CS101')!;
        expect(cs101.tree).toEqual(treeOf('CS101', 'Intro CS'));
        expect(cs101.tree?.prerequisites).toBeUndefined();

        const it140 = results.find((r) => r.id === 'IT140')!;
        expect(it140.tree?.prerequisites).toHaveLength(1);
        expect(it140.tree?.prerequisites?.[0]?.course_id).toBe('CS101');
    });

    // ── 7. One valid and one unknown root course ──────────────────────────────
    it('returns null tree for an unknown course ID', () => {
        const rootTitles = new Map([['CS101', 'Intro CS']]);
        // UNKNOWN999 has no entry in rootTitles (not found in DB)
        const results = buildTreesFromGraph(['CS101', 'UNKNOWN999'], rootTitles, []);

        expect(results).toHaveLength(2);

        const cs101 = results.find((r) => r.id === 'CS101')!;
        expect(cs101.tree).not.toBeNull();

        const unknown = results.find((r) => r.id === 'UNKNOWN999')!;
        expect(unknown.tree).toBeNull();
    });
});

describe('catalog cache wrappers', () => {
    it('normalizes lowercase and uppercase course IDs before the persistent cache', async () => {
        const query = vi.fn().mockResolvedValue({
            rows: [{ catalog_course_id: 'IT140', title: 'Scripting', pid: '1' }],
        });
        withPoolClientMock.mockImplementation(async (fn) => fn(dbClient({ query })));

        await getCourseById('it140');
        await getCourseById('IT140');

        expect(query).toHaveBeenCalledTimes(1);
        expect(query.mock.calls[0]?.[1]).toEqual(['IT140']);
    });

    it('caches a successful empty course-ID result', async () => {
        const sql = vi.fn().mockResolvedValue({ rows: [] });
        withPoolClientMock.mockImplementation(async (fn) => fn(dbClient({ sql })));

        await expect(getAllCourseIds()).resolves.toEqual([]);
        await expect(getAllCourseIds()).resolves.toEqual([]);

        expect(sql).toHaveBeenCalledTimes(1);
    });

    it('does not persist an empty fallback when the database throws', async () => {
        const sql = vi.fn().mockResolvedValue({ rows: [{ catalog_course_id: 'CS250' }] });
        withPoolClientMock
            .mockRejectedValueOnce(new Error('Neon HTTP 402 quota exceeded'))
            .mockImplementation(async (fn) => fn(dbClient({ sql })));

        await expect(getAllCourseIds()).resolves.toEqual([]);
        await expect(getAllCourseIds()).resolves.toEqual(['CS250']);
        await expect(getAllCourseIds()).resolves.toEqual(['CS250']);

        expect(withPoolClientMock).toHaveBeenCalledTimes(2);
        expect(sql).toHaveBeenCalledTimes(1);
    });

    it('uses one canonical multi-root cache entry while preserving requested order', async () => {
        const query = vi
            .fn()
            .mockResolvedValueOnce({
                rows: [
                    { catalog_course_id: 'CS250', title: 'Software Development' },
                    { catalog_course_id: 'IT140', title: 'Scripting' },
                ],
            })
            .mockResolvedValueOnce({
                rows: [
                    { parent_id: 'IT140', parent_title: 'Scripting', child_id: 'CS250', child_title: 'Software Development' },
                    { parent_id: 'CS250', parent_title: 'Software Development', child_id: 'MATH142', child_title: 'Precalculus' },
                    { parent_id: 'IT140', parent_title: 'Scripting', child_id: 'MATH142', child_title: 'Precalculus' },
                ],
            });
        withPoolClientMock.mockImplementation(async (fn) => fn(dbClient({ query })));

        const reverse = await getCourseTrees(['it140', 'CS250']);
        const canonical = await getCourseTrees(['cs250', 'IT140']);

        expect(reverse.map((result) => result.id)).toEqual(['IT140', 'CS250']);
        expect(canonical.map((result) => result.id)).toEqual(['CS250', 'IT140']);
        expect(reverse[0]?.tree?.prerequisites?.map((node) => node.course_id)).toEqual(['CS250', 'MATH142']);
        expect(reverse[1]?.tree?.prerequisites?.[0]?.course_id).toBe('MATH142');
        expect(query).toHaveBeenCalledTimes(2);
        expect(query.mock.calls[0]?.[1]).toEqual([['CS250', 'IT140']]);
    });

    it('keeps unknown and duplicate roots in their requested positions', async () => {
        const query = vi
            .fn()
            .mockResolvedValueOnce({ rows: [{ catalog_course_id: 'IT140', title: 'Scripting' }] })
            .mockResolvedValueOnce({ rows: [] });
        withPoolClientMock.mockImplementation(async (fn) => fn(dbClient({ query })));

        const results = await getCourseTrees(['unknown999', 'it140', 'IT140']);

        expect(results.map((result) => result.id)).toEqual(['UNKNOWN999', 'IT140', 'IT140']);
        expect(results.map((result) => result.tree === null)).toEqual([true, false, false]);
        expect(query.mock.calls[0]?.[1]).toEqual([['IT140', 'UNKNOWN999']]);
    });
});
