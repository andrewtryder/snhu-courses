"use client";

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Loader2, Search } from 'lucide-react';

interface CourseSuggestion {
    catalog_course_id: string;
    title: string;
}

interface CourseSearchInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: (courseIds: string[]) => void;
    isLoading?: boolean;
    variant?: 'header' | 'default';
}

function getActiveToken(value: string): string {
    const parts = value.split(',');
    return parts[parts.length - 1].trim();
}

function replaceActiveToken(value: string, replacement: string): { nextValue: string; isFirstCourse: boolean } {
    const commaIndex = value.lastIndexOf(',');
    if (commaIndex === -1) {
        return { nextValue: replacement, isFirstCourse: true };
    }
    const prefix = value.slice(0, commaIndex + 1);
    return { nextValue: `${prefix} ${replacement}`, isFirstCourse: false };
}

function optionId(listboxId: string, courseId: string): string {
    return `${listboxId}-option-${courseId.replace(/[^a-zA-Z0-9-]/g, '-')}`;
}

export function CourseSearchInput({
    value,
    onChange,
    onSubmit,
    isLoading = false,
    variant = 'default',
}: CourseSearchInputProps) {
    const [suggestions, setSuggestions] = useState<CourseSuggestion[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listboxId = useId();

    const activeToken = getActiveToken(value);
    const isHeader = variant === 'header';
    const activeDescendantId =
        highlightedIndex >= 0 && suggestions[highlightedIndex]
            ? optionId(listboxId, suggestions[highlightedIndex].catalog_course_id)
            : undefined;

    useEffect(() => {
        if (activeToken.length < 1) {
            setSuggestions([]);
            setIsOpen(false);
            return;
        }

        const controller = new AbortController();
        const timeout = setTimeout(async () => {
            setIsSearching(true);
            try {
                const response = await fetch(
                    `/api/courses/search?q=${encodeURIComponent(activeToken)}&limit=25`,
                    { signal: controller.signal }
                );
                if (!response.ok) {
                    setSuggestions([]);
                    return;
                }
                const data: CourseSuggestion[] = await response.json();
                setSuggestions(data);
                setIsOpen(data.length > 0);
                setHighlightedIndex(-1);
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    setSuggestions([]);
                }
            } finally {
                setIsSearching(false);
            }
        }, 250);

        return () => {
            clearTimeout(timeout);
            controller.abort();
        };
    }, [activeToken]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectSuggestion = useCallback(
        (suggestion: CourseSuggestion) => {
            const { nextValue, isFirstCourse } = replaceActiveToken(value, suggestion.catalog_course_id);
            onChange(nextValue);
            setIsOpen(false);
            setSuggestions([]);

            if (isFirstCourse) {
                onSubmit([suggestion.catalog_course_id.toUpperCase()]);
            } else {
                inputRef.current?.focus();
            }
        },
        [onChange, onSubmit, value]
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsOpen(false);

        const courseIds = value
            .split(',')
            .map((id) => id.trim().toUpperCase())
            .filter(Boolean);

        if (courseIds.length > 0) {
            onSubmit(courseIds);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen || suggestions.length === 0) {
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
        } else if (e.key === 'Enter' && highlightedIndex >= 0) {
            e.preventDefault();
            selectSuggestion(suggestions[highlightedIndex]);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={isHeader ? 'w-full' : 'flex-1 max-w-xl mx-4'}>
            <div ref={containerRef} className="relative flex items-center">
                <Search className="absolute left-3 z-10 h-5 w-5 text-outline" aria-hidden="true" />
                <input
                    ref={inputRef}
                    type="text"
                    role="combobox"
                    aria-label="Search SNHU courses"
                    aria-expanded={isOpen}
                    aria-autocomplete="list"
                    aria-controls={listboxId}
                    aria-activedescendant={activeDescendantId}
                    placeholder={isHeader ? 'Search courses...' : 'Search courses (e.g., CS250, ACC201)...'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => {
                        if (suggestions.length > 0) {
                            setIsOpen(true);
                        }
                    }}
                    onKeyDown={handleKeyDown}
                    className={
                        isHeader
                            ? 'w-full rounded-full border border-outline-variant bg-surface-container-low py-2 pl-10 pr-4 text-sm text-on-surface outline-none transition-all placeholder:text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary'
                            : 'w-full rounded-full border border-outline-variant bg-surface-container-low py-2 pl-10 pr-24 text-sm text-on-surface outline-none transition-all placeholder:text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary'
                    }
                />
                {!isHeader && (
                    <button
                        type="submit"
                        disabled={isLoading || !value.trim()}
                        aria-label={isLoading ? 'Searching courses' : 'Search courses'}
                        className="absolute right-2 rounded-md bg-secondary-container px-3 py-1 text-sm font-semibold text-on-secondary-container transition-colors hover:bg-secondary disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : 'Search'}
                    </button>
                )}
                {isHeader && isLoading && (
                    <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-outline" aria-hidden="true" />
                )}

                {isOpen && (
                    <ul
                        id={listboxId}
                        role="listbox"
                        aria-label="Course suggestions"
                        className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-surface-variant bg-surface-container-lowest shadow-lg"
                    >
                        {isSearching && suggestions.length === 0 && (
                            <li role="status" className="px-3 py-2 text-sm text-on-surface-variant">
                                Searching...
                            </li>
                        )}
                        {!isSearching && suggestions.length === 0 && (
                            <li role="status" className="px-3 py-2 text-sm text-on-surface-variant">
                                No matching courses
                            </li>
                        )}
                        {suggestions.map((suggestion, index) => (
                            <li
                                key={suggestion.catalog_course_id}
                                id={optionId(listboxId, suggestion.catalog_course_id)}
                                role="option"
                                aria-selected={index === highlightedIndex}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => selectSuggestion(suggestion)}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                className={`cursor-pointer px-3 py-2 text-sm ${
                                    index === highlightedIndex
                                        ? 'bg-primary-fixed text-primary'
                                        : 'text-on-surface hover:bg-surface-container-low'
                                }`}
                            >
                                <span className="font-semibold">{suggestion.catalog_course_id}</span>
                                <span className="text-on-surface-variant"> — {suggestion.title}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </form>
    );
}
