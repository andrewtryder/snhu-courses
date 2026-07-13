'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';

interface CourseSearchNavProps {
    initialQuery?: string;
    currentPage?: 'home' | 'about' | 'course' | 'courses';
    courseQuery?: string;
    onQueryChange?: (value: string) => void;
    onMultiCourseSearch?: (courseIds: string[]) => void | Promise<void>;
    isLoading?: boolean;
}

function coursePath(courseId: string): string {
    return `/course/${encodeURIComponent(courseId)}`;
}

function homeIdsPath(courseIds: string[]): string {
    const params = new URLSearchParams();
    params.set('ids', courseIds.join(','));
    return `/?${params.toString()}`;
}

export function CourseSearchNav({
    initialQuery = '',
    currentPage = 'home',
    courseQuery: controlledQuery,
    onQueryChange,
    onMultiCourseSearch,
    isLoading: controlledLoading,
}: CourseSearchNavProps) {
    const router = useRouter();
    const [internalQuery, setInternalQuery] = useState(initialQuery);
    const [internalLoading, setInternalLoading] = useState(false);

    const courseQuery = controlledQuery ?? internalQuery;
    const isLoading = controlledLoading ?? internalLoading;

    useEffect(() => {
        return () => {
            setInternalLoading(false);
        };
    }, []);

    const handleChange = (value: string) => {
        if (onQueryChange) {
            onQueryChange(value);
        } else {
            setInternalQuery(value);
        }
    };

    const handleSearch = async (courseIds: string[]) => {
        if (courseIds.length === 1) {
            router.push(coursePath(courseIds[0]));
            return;
        }

        if (onMultiCourseSearch) {
            await onMultiCourseSearch(courseIds);
            return;
        }

        // Keep loading until navigation completes / this component unmounts.
        setInternalLoading(true);
        await router.push(homeIdsPath(courseIds));
    };

    return (
        <AppHeader
            courseQuery={courseQuery}
            onChange={handleChange}
            onSubmit={handleSearch}
            isLoading={isLoading}
            currentPage={currentPage}
        />
    );
}
