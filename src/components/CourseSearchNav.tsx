'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';

interface CourseSearchNavProps {
    initialQuery?: string;
    currentPage?: 'home' | 'about' | 'course';
    courseQuery?: string;
    onQueryChange?: (value: string) => void;
    onMultiCourseSearch?: (courseIds: string[]) => void | Promise<void>;
    isLoading?: boolean;
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

    const handleChange = (value: string) => {
        if (onQueryChange) {
            onQueryChange(value);
        } else {
            setInternalQuery(value);
        }
    };

    const handleSearch = async (courseIds: string[]) => {
        if (courseIds.length === 1) {
            router.push(`/course/${courseIds[0]}`);
            return;
        }

        if (onMultiCourseSearch) {
            await onMultiCourseSearch(courseIds);
            return;
        }

        setInternalLoading(true);
        try {
            router.push(`/?ids=${courseIds.join(',')}`);
        } finally {
            setInternalLoading(false);
        }
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
