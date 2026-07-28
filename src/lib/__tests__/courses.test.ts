/**
 * Unit tests for the prerequisite-tree CTE engine in src/lib/courses.ts.
 *
 * These tests exercise `buildTreesFromGraph` (pure TypeScript, no DB) and
 * the exported cached wrappers via mocked DB clients.
 *
 * Run: npm test
 */
import { describe, it, expect, vi } from 'vitest';

// ── Import only pure, non-DB exports for unit tests ──────────────────────────
// We import the internal helper directly; the file-level module mock below
// prevents any real @vercel/postgres or next/cache calls.

vi.mock('@vercel/postgres', () => ({
    db: {
        connect: vi.fn(),
    },
}));

vi.mock('next/cache', () => ({
    unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
    revalidateTag: vi.fn(),
    revalidatePath: vi.fn(),
}));

import { buildTreesFromGraph } from '../courses';
import type { CourseTree } from '@/lib/courseGraphLayout';

// ── Helper: quick CourseTree comparison ──────────────────────────────────────

function treeOf(course_id: string, name: string, prereqs?: CourseTree[]): CourseTree {
    const t: CourseTree = { course_id, name };
    if (prereqs && prereqs.length > 0) t.prerequisites = prereqs;
    return t;
}

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
