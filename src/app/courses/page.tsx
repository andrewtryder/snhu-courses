import type { Metadata } from 'next';
import { getAllCourseSummaries, type CourseSummary } from '@/lib/courses';
import { AppFooter } from '@/components/AppFooter';
import { CourseSearchNav } from '@/components/CourseSearchNav';

export const revalidate = 86400;

const title = 'SNHU Course Directory and Prerequisites';
const description =
    'Browse SNHU courses by subject and open crawlable prerequisite pages for individual course dependency information.';

export const metadata: Metadata = {
    title,
    description,
    alternates: {
        canonical: '/courses',
    },
    openGraph: {
        title: `${title} | SNHU Course Prerequisites Tool`,
        description,
        url: '/courses',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: `${title} | SNHU Course Prerequisites Tool`,
        description,
    },
};

/** Subject prefix from a normalized course ID (e.g. IT-140 → IT). */
function subjectPrefix(courseId: string): string {
    const upper = courseId.toUpperCase();
    const beforeHyphen = upper.split('-')[0] ?? upper;
    const letters = beforeHyphen.match(/^[A-Z]+/)?.[0];
    return letters && letters.length > 0 ? letters : 'Other';
}

function parseCourseIdParts(courseId: string): { prefix: string; number: number; rest: string } {
    const upper = courseId.toUpperCase();
    const match = upper.match(/^([A-Z]+)-?(\d+)?(.*)$/);
    if (!match) {
        return { prefix: upper, number: Number.POSITIVE_INFINITY, rest: '' };
    }
    return {
        prefix: match[1],
        number: match[2] ? Number(match[2]) : Number.POSITIVE_INFINITY,
        rest: match[3] ?? '',
    };
}

function compareCourseIdsNatural(a: string, b: string): number {
    const pa = parseCourseIdParts(a);
    const pb = parseCourseIdParts(b);
    if (pa.prefix !== pb.prefix) {
        return pa.prefix.localeCompare(pb.prefix);
    }
    if (pa.number !== pb.number) {
        return pa.number - pb.number;
    }
    if (pa.rest !== pb.rest) {
        return pa.rest.localeCompare(pb.rest);
    }
    return a.localeCompare(b);
}

interface CourseGroup {
    subject: string;
    courses: CourseSummary[];
}

function groupCoursesBySubject(summaries: CourseSummary[]): CourseGroup[] {
    const groups = new Map<string, CourseSummary[]>();

    for (const summary of summaries) {
        const subject = subjectPrefix(summary.catalog_course_id);
        const list = groups.get(subject);
        if (list) {
            list.push(summary);
        } else {
            groups.set(subject, [summary]);
        }
    }

    return Array.from(groups.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([subject, courses]) => ({
            subject,
            courses: [...courses].sort((x, y) =>
                compareCourseIdsNatural(x.catalog_course_id, y.catalog_course_id)
            ),
        }));
}

export default async function CoursesDirectoryPage() {
    const summaries = await getAllCourseSummaries();
    const groups = groupCoursesBySubject(summaries);

    return (
        <div className="flex min-h-screen flex-col">
            <CourseSearchNav currentPage="courses" />

            <main
                id="main-content"
                className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 md:px-8 md:py-12"
            >
                <header className="mb-8">
                    <h1
                        id="directory-heading"
                        className="font-[family-name:var(--font-headline)] text-3xl font-bold text-primary md:text-4xl"
                    >
                        SNHU Course Directory
                    </h1>
                    <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
                        Browse available SNHU courses by subject. Open a course to see its crawlable
                        prerequisite tree and related dependency information.
                    </p>
                </header>

                {groups.length === 0 ? (
                    <p className="text-sm text-on-surface-variant">
                        Course listings are temporarily unavailable. Please try again later.
                    </p>
                ) : (
                    <div className="space-y-8">
                        {groups.map(({ subject, courses }) => (
                            <section
                                key={subject}
                                aria-labelledby={`subject-${subject}`}
                                className="rounded-lg border border-surface-variant bg-surface-container-low p-5"
                            >
                                <h2
                                    id={`subject-${subject}`}
                                    className="mb-3 font-[family-name:var(--font-headline)] text-lg font-semibold text-on-surface"
                                >
                                    {subject}
                                    <span className="ml-2 text-sm font-normal text-on-surface-variant">
                                        ({courses.length})
                                    </span>
                                </h2>
                                <ul className="list-none space-y-1.5">
                                    {courses.map((course) => {
                                        const label = course.title
                                            ? `${course.catalog_course_id} — ${course.title}`
                                            : course.catalog_course_id;
                                        return (
                                            <li key={course.catalog_course_id}>
                                                <a
                                                    href={`/course/${course.catalog_course_id}`}
                                                    className="text-sm font-semibold text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low rounded-sm"
                                                >
                                                    {label}
                                                </a>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        ))}
                    </div>
                )}
            </main>

            <AppFooter />
        </div>
    );
}
