"use client";

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        document.body.style.overflow = 'hidden';
        closeButtonRef.current?.focus();

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Close about dialog"
                className="absolute inset-0 bg-inverse-surface/50"
                onClick={onClose}
            />

            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="about-dialog-title"
                className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg border border-surface-variant bg-surface-container-lowest p-6 shadow-lg"
            >
                <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute right-4 top-4 rounded-md p-1 text-outline transition-colors hover:bg-surface-container-low hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
                >
                    <X className="h-5 w-5" aria-hidden="true" />
                </button>

                <h2
                    id="about-dialog-title"
                    className="mb-4 pr-8 font-[family-name:var(--font-headline)] text-xl font-semibold text-primary"
                >
                    About This Tool
                </h2>

                <div className="space-y-4 text-sm text-on-surface-variant">
                    <p>
                        I built this site as a proud SNHU graduate who knows how important course planning
                        can be, especially when transfer credits, prerequisites, and heavy course loads are
                        involved.
                    </p>
                    <p>
                        During my time at Southern New Hampshire University, I often needed a clearer way to
                        understand which courses depended on others. Because I transferred in several credits
                        and wanted to make the most of each term, knowing prerequisite relationships helped
                        me plan more confidently and avoid surprises.
                    </p>
                    <p>
                        The SNHU Course Prerequisites Tool was designed to help students visualize course
                        dependencies as they move through their programs. Search for a course to see the
                        classes that may need to come before it, then use that information as a planning aid
                        while mapping out your degree path.
                    </p>
                    <p>
                        This site is unofficial and is intended for informational purposes only. Course
                        requirements, transfer evaluations, catalog rules, and program requirements can
                        change. Always confirm your academic plan with your SNHU advisor for official
                        guidance.
                    </p>
                    <p>
                        I also built another tool for SNHU students:{' '}
                        <a
                            href="https://snhu-transfers.vercel.app"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-on-surface-variant transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest rounded-sm"
                        >
                            SNHU Transfers
                            <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                        . It makes it easier to explore how certifications may transfer in as credits.
                    </p>
                </div>
            </div>
        </div>
    );
}
