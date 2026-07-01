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
import { Search, Loader2 } from 'lucide-react';

interface CourseNode {
    course_id: string;
    name: string;
    prerequisites?: CourseNode[];
}

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

    const primaryColors = [
        '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF',
        '#00FFFF', '#FF8000', '#008000', '#000080', '#800080',
        '#FFC0CB', '#800000', '#008080', '#808000', '#C0C0C0',
    ];

    const generateGraph = (dataArray: CourseNode[]) => {
        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];
        const nodeIds = new Set<string>();
        const edgeIds = new Set<string>();
        const prefixColors: Record<string, string> = {};

        // simple layout algorithm
        let currentX = 0;

        dataArray.forEach((courseTree) => {
            const traverse = (node: CourseNode, parent: string | null = null, depth: number = 0, xOffset: number = 0) => {
                const nodeId = node.course_id;

                if (!nodeIds.has(nodeId)) {
                    const prefixMatch = nodeId.match(/^([A-Za-z]+)/);
                    const prefix = prefixMatch ? prefixMatch[0] : 'DEFAULT';

                    if (!prefixColors[prefix]) {
                        prefixColors[prefix] = primaryColors[Object.keys(prefixColors).length % primaryColors.length];
                    }

                    const color = prefixColors[prefix];

                    newNodes.push({
                        id: nodeId,
                        position: { x: currentX + xOffset, y: depth * 150 },
                        data: {
                            label: (
                                <div className="text-center font-bold">
                                    <div className="text-sm">{nodeId}</div>
                                    <div className="text-xs font-normal text-gray-700">{node.name}</div>
                                </div>
                            )
                        },
                        style: {
                            background: `${color}20`,
                            border: `2px solid ${color}`,
                            borderRadius: '8px',
                            padding: '10px',
                            width: 150,
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                        }
                    });
                    nodeIds.add(nodeId);
                    xOffset += 180;
                }

                if (parent) {
                    const edgeId = `${parent}-${nodeId}`;
                    if (!edgeIds.has(edgeId)) {
                        newEdges.push({
                            id: edgeId,
                            source: parent,
                            target: nodeId,
                            type: 'smoothstep',
                            animated: true,
                        });
                        edgeIds.add(edgeId);
                    }
                }

                if (node.prerequisites && node.prerequisites.length > 0) {
                    node.prerequisites.forEach((child: CourseNode, idx: number) => {
                        traverse(child, nodeId, depth + 1, idx * 180);
                    });
                }
            };

            traverse(courseTree, null, 0, currentX);
            currentX += 500; // Shift root nodes apart
        });

        setNodes(newNodes);
        setEdges(newEdges);
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!courseQuery.trim()) return;

        setIsLoading(true);
        setError(null);
        setHasSearched(true);

        try {
            const courseIds = courseQuery.split(',').map(id => id.trim().toUpperCase());
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

                <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-4">
                    <div className="relative flex items-center">
                        <Search className="absolute left-3 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Enter course IDs (e.g., CS250, ACC201)..."
                            value={courseQuery}
                            onChange={(e) => setCourseQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !courseQuery.trim()}
                            className="absolute right-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                        </button>
                    </div>
                </form>

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
                        fitView
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
