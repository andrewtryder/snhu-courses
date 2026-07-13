import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Info } from 'lucide-react';
import {
    getCourseById,
    getCourseTree,
    getDependentCourseIds,
    getDirectPrerequisiteIds,
    getAllCourseIds,
} from '@/lib/courses';
import { siteUrl } from '@/lib/site';
import { serializeJsonLd } from '@/lib/safeJsonLd';
import { AppFooter } from '@/components/AppFooter';
import { CourseSearchNav } from '@/components/CourseSearchNav';
import { CoursePrerequisiteGraph } from '@/components/CoursePrerequisiteGraph';
import {
    PrerequisiteTreeList,
    collectPrerequisiteIds,
} from '@/components/PrerequisiteTreeList';

// Revalidate course pages every 24 hours (ISR). When generateStaticParams returns []
// because the database is unavailable at build time, pages are generated on first request.
export const revalidate = 86400;

export async function generateStaticParams() {
    const ids = await getAllCourseIds();
    return ids.map((id) => ({ id }));
}

interface CoursePageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
    const { id } = await params;
    const courseId = id.toUpperCase();
    const course = await getCourseById(courseId);

    if (!course) {
        return {
            title: 'Course Not Found',
        };
    }

    const title = `${courseId} (${course.title}) Prerequisites`;
    const description = `View SNHU ${courseId} prerequisites and dependency relationships in a crawlable course planning page.`;

    return {
        title,
        description,
        alternates: {
            canonical: `/course/${courseId}`,
        },
        openGraph: {
            title: `${title} | SNHU Course Prerequisites Tool`,
            description,
            url: `/course/${courseId}`,
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: `${title} | SNHU Course Prerequisites Tool`,
            description,
        },
    };
}

function buildCourseJsonLd(
    courseId: string,
    courseTitle: string,
    description: string | null,
    prerequisiteIds: string[]
) {
    const prereqSummary =
        prerequisiteIds.length > 0
            ? ` Prerequisites include ${prerequisiteIds.join(', ')}.`
            : ' No listed prerequisites.';

    const courseSchema = {
        '@context': 'https://schema.org',
        '@type': 'Course',
        name: courseTitle,
        courseCode: courseId,
        description:
            (description ??
                `Unofficial SNHU course prerequisite information for ${courseId}.`) +
            prereqSummary +
            ' This unofficial site is for informational purposes only; confirm requirements with your SNHU advisor.',
        provider: {
            '@type': 'CollegeOrUniversity',
            name: 'Southern New Hampshire University',
        },
        url: `${siteUrl}/course/${courseId}`,
    };

    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: siteUrl,
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: courseId,
                item: `${siteUrl}/course/${courseId}`,
            },
        ],
    };

    return [courseSchema, breadcrumbSchema];
}

export default async function CoursePage({ params }: CoursePageProps) {
    const { id } = await params;
    const courseId = id.toUpperCase();

    const [course, tree, directPrereqs, dependents] = await Promise.all([
        getCourseById(courseId),
        getCourseTree(courseId),
        getDirectPrerequisiteIds(courseId),
        getDependentCourseIds(courseId),
    ]);

    if (!course || !tree) {
        notFound();
    }

    const allPrereqIds = collectPrerequisiteIds(tree);
    const jsonLd = buildCourseJsonLd(
        courseId,
        course.title,
        course.description,
        directPrereqs
    );

    const prereqSummaryText =
        directPrereqs.length > 0
            ? `Prerequisites include ${directPrereqs.join(', ')}.`
            : 'No listed prerequisites for this course.';

    return (
        <div className="flex min-h-screen flex-col">
            <CourseSearchNav initialQuery={courseId} currentPage="course" />

            <main
                id="main-content"
                className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 md:px-8 md:py-12"
            >
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
                />

                <article aria-labelledby="course-heading">
                    <header className="mb-8">
                        <h1
                            id="course-heading"
                            className="font-[family-name:var(--font-headline)] text-3xl font-bold text-primary md:text-4xl"
                        >
                            {courseId}
                            <span className="mt-1 block text-xl font-semibold text-on-surface md:text-2xl">
                                {course.title}
                            </span>
                        </h1>
                        <p className="mt-3 text-sm text-on-surface-variant">
                            <Link
                                href="/"
                                className="font-medium text-on-surface-variant no-underline transition-colors hover:text-primary"
                            >
                                Course Prerequisites Tool
                            </Link>
                            <span aria-hidden="true" className="mx-1.5 text-outline">·</span>
                            {prereqSummaryText}
                            {allPrereqIds.length > directPrereqs.length && (
                                <>
                                    {' '}
                                    The full dependency tree includes{' '}
                                    {allPrereqIds.length} related course
                                    {allPrereqIds.length === 1 ? '' : 's'}.
                                </>
                            )}
                        </p>
                    </header>

                    <section aria-labelledby="prereq-list-heading" className="mb-10">
                        <h2
                            id="prereq-list-heading"
                            className="mb-4 font-[family-name:var(--font-headline)] text-xl font-semibold text-on-surface"
                        >
                            Prerequisite Tree
                        </h2>
                        <div className="rounded-lg border border-surface-variant bg-surface-container-low p-5">
                            <PrerequisiteTreeList tree={tree} />
                        </div>
                    </section>

                    {dependents.length > 0 && (
                        <section aria-labelledby="dependents-heading" className="mb-10">
                            <h2
                                id="dependents-heading"
                                className="mb-4 font-[family-name:var(--font-headline)] text-xl font-semibold text-on-surface"
                            >
                                This Course Is Also a Prerequisite For
                            </h2>
                            <ul className="flex flex-wrap gap-2">
                                {dependents.map((dependentId) => (
                                    <li key={dependentId}>
                                        <a
                                            href={`/course/${dependentId}`}
                                            className="inline-flex rounded-full border border-surface-variant bg-surface-container-low px-3 py-1 text-sm font-semibold text-primary transition-colors hover:border-primary hover:bg-surface-container"
                                        >
                                            {dependentId}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    <section aria-labelledby="graph-heading" className="mb-10">
                        <h2
                            id="graph-heading"
                            className="mb-4 font-[family-name:var(--font-headline)] text-xl font-semibold text-on-surface"
                        >
                            Interactive Prerequisite Graph
                        </h2>
                        <p className="mb-4 text-sm text-on-surface-variant">
                            Explore the prerequisite relationships visually. The graph below
                            supplements the crawlable list above.
                        </p>
                        <CoursePrerequisiteGraph
                            trees={[tree]}
                            graphKey={courseId}
                            ariaLabel={`Interactive prerequisite graph for ${courseId}`}
                        />
                    </section>

                    <section aria-label="Important disclaimer">
                        <div className="flex gap-3 rounded-lg border border-outline-variant bg-surface-container p-5">
                            <Info
                                className="mt-0.5 h-5 w-5 shrink-0 text-on-surface-variant"
                                aria-hidden="true"
                            />
                            <div className="space-y-1.5 text-sm leading-relaxed text-on-surface-variant">
                                <p className="font-semibold text-on-surface">
                                    Unofficial — For Informational Purposes Only
                                </p>
                                <p>
                                    This site is unofficial and is intended for informational purposes
                                    only. Course requirements, transfer evaluations, catalog rules, and
                                    program requirements can change. Always confirm your academic plan
                                    with your SNHU advisor for official guidance.
                                </p>
                            </div>
                        </div>
                    </section>
                </article>
            </main>

            <AppFooter />
        </div>
    );
}
