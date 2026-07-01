"use client";

import { useState, useCallback } from 'react';
import {
    ReactFlow,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Node,
    Edge,
    Connection
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { GitBranch } from 'lucide-react';
import { layoutCourseGraph, type CourseTree } from '@/lib/courseGraphLayout';
import { AppHeader } from '@/components/AppHeader';
import { AppFooter } from '@/components/AppFooter';

export default function Home() {
    const [courseQuery, setCourseQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [hasSearched, setHasSearched] = useState(false);

    const onConnect = useCallback(
        (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    const generateGraph = (dataArray: CourseTree[]) => {
        const { nodes: layoutedNodes, edges: layoutedEdges } = layoutCourseGraph(dataArray);
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
    };

    const handleSearch = async (courseIds: string[]) => {
        setIsLoading(true);
        setError(null);
        setHasSearched(true);

        try {
            const validateResponse = await fetch(`/api/courses?ids=${courseIds.join(',')}`);
            if (validateResponse.ok) {
                const found: { catalog_course_id: string }[] = await validateResponse.json();
                const foundIds = new Set(
                    found.map((course) => course.catalog_course_id.toUpperCase())
                );
                const invalidIds = courseIds.filter((id) => !foundIds.has(id));
                if (invalidIds.length > 0) {
                    throw new Error(
                        `Unknown course${invalidIds.length > 1 ? 's' : ''}: ${invalidIds.join(', ')}`
                    );
                }
            }

            const response = await fetch(`/api/course-trees/${courseIds.join(',')}`);

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to fetch course data');
            }

            const data = await response.json();
            generateGraph(data);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An unknown error occurred");
            }
            setNodes([]);
            setEdges([]);
        } finally {
            setIsLoading(false);
        }
    };

    const showEmptyState = !hasSearched && nodes.length === 0 && !error;
    const showGraph = hasSearched && !error;

    return (
        <div className="flex min-h-screen flex-col">
            <AppHeader
                courseQuery={courseQuery}
                onChange={setCourseQuery}
                onSubmit={handleSearch}
                isLoading={isLoading}
            />

            <main className="mx-auto flex w-full max-w-[var(--spacing-container-max)] flex-1 flex-col px-4 py-4 md:px-8 md:py-6 min-h-0">
                <div className="relative flex flex-1 flex-col overflow-hidden rounded-lg border border-surface-variant bg-surface-container-lowest min-h-0">
                    <div
                        className="pointer-events-none absolute inset-0 opacity-[0.03]"
                        style={{
                            backgroundImage: 'radial-gradient(circle at 50% 50%, #003087 0%, transparent 50%)',
                        }}
                    />

                    {error ? (
                        <div className="relative z-10 flex flex-1 items-center justify-center p-6 md:p-8">
                            <div className="flex max-w-md flex-col items-center rounded-lg border border-error-container bg-error-container px-6 py-4 text-center">
                                <span className="mb-1 font-[family-name:var(--font-headline)] text-lg font-semibold text-on-error-container">
                                    Error
                                </span>
                                <span className="text-sm text-on-error-container">{error}</span>
                            </div>
                        </div>
                    ) : showEmptyState ? (
                        <div className="relative z-10 flex flex-1 flex-col items-center justify-center p-6 text-center md:p-8">
                            <div className="mb-6 max-w-md">
                                <h1 className="mb-2 font-[family-name:var(--font-headline)] text-2xl font-semibold text-primary">
                                    Course Prerequisites Tool
                                </h1>
                                <p className="text-sm text-on-surface-variant">
                                    Map out your degree path and understand required preliminary courses.
                                </p>
                            </div>

                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-surface-variant bg-surface-container-low shadow-sm transition-all hover:border-primary-fixed hover:shadow-md">
                                <GitBranch className="h-8 w-8 text-outline" />
                            </div>

                            <h2 className="mb-2 font-[family-name:var(--font-headline)] text-xl font-semibold text-on-surface">
                                Prerequisites Flowchart Canvas
                            </h2>
                            <p className="max-w-md text-sm text-on-surface-variant">
                                Select a program or search for a specific course to generate its prerequisite dependency graph.
                            </p>

                            <div className="pointer-events-none absolute left-10 top-10 hidden opacity-20 md:block">
                                <div className="flex h-12 w-24 items-center justify-center rounded border-2 border-outline text-xs font-medium text-outline">
                                    IT-140
                                </div>
                                <div className="relative mx-auto my-2 h-16 w-0.5 bg-outline">
                                    <div className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rotate-45 border-b-2 border-r-2 border-outline" />
                                </div>
                                <div className="flex h-12 w-24 items-center justify-center rounded border-2 border-outline text-xs font-medium text-outline">
                                    CS-210
                                </div>
                            </div>

                            <div className="pointer-events-none absolute bottom-10 right-10 hidden opacity-20 md:block">
                                <div className="flex h-12 w-24 items-center justify-center rounded border-2 border-outline text-xs font-medium text-outline">
                                    MAT-136
                                </div>
                                <div className="relative mx-auto my-2 h-16 w-0.5 bg-outline">
                                    <div className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rotate-45 border-b-2 border-r-2 border-outline" />
                                </div>
                                <div className="flex h-12 w-24 items-center justify-center rounded border-2 border-outline text-xs font-medium text-outline">
                                    CS-250
                                </div>
                            </div>
                        </div>
                    ) : showGraph ? (
                        <div className="absolute inset-0 z-10">
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                onConnect={onConnect}
                                nodesDraggable={false}
                                fitView
                                fitViewOptions={{ padding: 0.2 }}
                                attributionPosition="bottom-right"
                                className="bg-surface-container-lowest"
                            >
                                <Background color="#e4e2e1" gap={16} />
                                <Controls className="!border-surface-variant !bg-surface-container-lowest !shadow-sm" />
                            </ReactFlow>
                        </div>
                    ) : null}
                </div>
            </main>

            <AppFooter />
        </div>
    );
}
