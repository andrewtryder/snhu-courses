import type { CourseTree } from '@/lib/courseGraphLayout';

interface PrerequisiteTreeListProps {
    tree: CourseTree;
    /** When true, renders only the nested list (for use inside a parent `<li>`). */
    nested?: boolean;
}

function PrerequisiteListItems({ prerequisites }: { prerequisites: CourseTree[] }) {
    return (
        <>
            {prerequisites.map((prereq) => (
                <li key={prereq.course_id} className="leading-relaxed">
                    <a
                        href={`/course/${prereq.course_id}`}
                        className="font-semibold text-primary transition-colors hover:underline"
                    >
                        {prereq.course_id}
                    </a>
                    <span className="text-on-surface-variant"> — {prereq.name}</span>
                    {prereq.prerequisites && prereq.prerequisites.length > 0 && (
                        <ul className="mt-2 list-disc space-y-2 pl-5">
                            <PrerequisiteListItems prerequisites={prereq.prerequisites} />
                        </ul>
                    )}
                </li>
            ))}
        </>
    );
}

export function PrerequisiteTreeList({ tree, nested = false }: PrerequisiteTreeListProps) {
    if (!tree.prerequisites || tree.prerequisites.length === 0) {
        if (nested) {
            return null;
        }
        return (
            <p className="text-sm text-on-surface-variant">
                No listed prerequisites for this course.
            </p>
        );
    }

    const list = (
        <ul className="list-disc space-y-2 pl-5">
            <PrerequisiteListItems prerequisites={tree.prerequisites} />
        </ul>
    );

    if (nested) {
        return list;
    }

    return list;
}

/** Flatten unique prerequisite course IDs from a tree (excluding the root). */
export function collectPrerequisiteIds(tree: CourseTree): string[] {
    const ids = new Set<string>();

    function walk(node: CourseTree) {
        for (const prereq of node.prerequisites ?? []) {
            ids.add(prereq.course_id);
            walk(prereq);
        }
    }

    walk(tree);
    return Array.from(ids).sort();
}
