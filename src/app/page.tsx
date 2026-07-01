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
import { Search } from 'lucide-react';
import { layoutCourseGraph, type CourseTree } from '@/lib/courseGraphLayout';
import { CourseSearchInput } from '@/components/CourseSearchInput';

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

    return (
        <main className="flex flex-col h-screen w-full bg-slate-50 font-sans">
            <header className="bg-white border-b border-slate-200 p-4 shadow-sm z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-600 text-white p-2 rounded-lg font-bold">
                        SNHU
                    </div>
                    <h1 className="text-xl font-bold text-slate-800">Course Prerequisites</h1>
                </div>

                <CourseSearchInput
                    value={courseQuery}
                    onChange={setCourseQuery}
                    onSubmit={handleSearch}
                    isLoading={isLoading}
                />

                <div className="text-sm text-slate-500 hidden md:block">
                    Separate multiple courses with commas
                </div>
            </header>

            <div className="flex-1 w-full relative h-full">
                {error ? (
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-sm flex flex-col items-center max-w-md text-center">
                            <span className="font-bold text-lg mb-1">Error</span>
                            <span>{error}</span>
                        </div>
                    </div>
                ) : !hasSearched && nodes.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                        <Search className="w-16 h-16 mb-4 text-slate-300" />
                        <h2 className="text-2xl font-bold text-slate-500 mb-2">Search for a Course</h2>
                        <p className="text-center max-w-md">
                            Enter one or more course codes (like CS250 or ACC201) in the search bar above to generate interactive prerequisite trees.
                        </p>
                    </div>
                ) : (
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
                    >
                        <Background color="#ccc" gap={16} />
                        <Controls />
                    </ReactFlow>
                )}
            </div>
        </main>
    );
}
