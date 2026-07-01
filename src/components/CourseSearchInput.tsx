"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
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

export function CourseSearchInput({
    value,
    onChange,
    onSubmit,
    isLoading = false,
}: CourseSearchInputProps) {
    const [suggestions, setSuggestions] = useState<CourseSuggestion[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const activeToken = getActiveToken(value);

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
                    `/api/courses/search?q=${encodeURIComponent(activeToken)}&limit=10`,
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
        <form onSubmit={handleSubmit} className="flex-1 max-w-xl mx-4">
            <div ref={containerRef} className="relative flex items-center">
                <Search className="absolute left-3 text-slate-400 w-5 h-5 z-10" />
                <input
                    ref={inputRef}
                    type="text"
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-autocomplete="list"
                    aria-controls="course-suggestions"
                    placeholder="Search courses (e.g., CS250, ACC201)..."
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => {
                        if (suggestions.length > 0) {
                            setIsOpen(true);
                        }
                    }}
                    onKeyDown={handleKeyDown}
                    className="w-full pl-10 pr-24 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                />
                <button
                    type="submit"
                    disabled={isLoading || !value.trim()}
                    className="absolute right-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                </button>

                {isOpen && (
                    <ul
                        id="course-suggestions"
                        role="listbox"
                        className="absolute left-0 right-0 top-full mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg z-50"
                    >
                        {isSearching && suggestions.length === 0 && (
                            <li className="px-3 py-2 text-sm text-slate-500">Searching...</li>
                        )}
                        {!isSearching && suggestions.length === 0 && (
                            <li className="px-3 py-2 text-sm text-slate-500">No matching courses</li>
                        )}
                        {suggestions.map((suggestion, index) => (
                            <li
                                key={suggestion.catalog_course_id}
                                role="option"
                                aria-selected={index === highlightedIndex}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => selectSuggestion(suggestion)}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                className={`cursor-pointer px-3 py-2 text-sm ${
                                    index === highlightedIndex
                                        ? 'bg-blue-50 text-blue-900'
                                        : 'text-slate-800 hover:bg-slate-50'
                                }`}
                            >
                                <span className="font-semibold">{suggestion.catalog_course_id}</span>
                                <span className="text-slate-500"> — {suggestion.title}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </form>
    );
}
