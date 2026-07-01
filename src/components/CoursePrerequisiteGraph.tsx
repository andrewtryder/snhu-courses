'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
    ReactFlow,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    type Node,
    type Edge,
    type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { layoutCourseGraph, type CourseTree } from '@/lib/courseGraphLayout';

const CONTROL_LABELS: Record<string, string> = {
    'react-flow__controls-zoomin': 'Zoom in',
    'react-flow__controls-zoomout': 'Zoom out',
    'react-flow__controls-fitview': 'Fit view',
    'react-flow__controls-interactive': 'Toggle interactivity',
};

function labelGraphControls(container: HTMLElement | null) {
    if (!container) return;

    const controls = container.querySelector('.react-flow__controls');
    if (!controls) return;

    controls.setAttribute('role', 'toolbar');
    controls.setAttribute('aria-label', 'Graph view controls');

    for (const button of controls.querySelectorAll('button')) {
        for (const className of button.classList) {
            const label = CONTROL_LABELS[className];
            if (label) {
                button.setAttribute('aria-label', label);
                break;
            }
        }
    }
}

interface CoursePrerequisiteGraphProps {
    trees: CourseTree[];
    graphKey: string;
    ariaLabel: string;
    className?: string;
    minHeight?: string;
}

export function CoursePrerequisiteGraph({
    trees,
    graphKey,
    ariaLabel,
    className = 'h-[28rem]',
    minHeight,
}: CoursePrerequisiteGraphProps) {
    const graphSectionRef = useRef<HTMLElement>(null);
    const { nodes: initialNodes, edges: initialEdges } = layoutCourseGraph(trees);
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);

    const onConnect = useCallback(
        (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    useEffect(() => {
        const { nodes: layoutedNodes, edges: layoutedEdges } = layoutCourseGraph(trees);
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
    }, [trees, setNodes, setEdges]);

    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            labelGraphControls(graphSectionRef.current);
        });
        return () => cancelAnimationFrame(frame);
    }, [graphKey, nodes.length]);

    return (
        <section
            ref={graphSectionRef}
            role="region"
            aria-label={ariaLabel}
            className={`relative overflow-hidden rounded-lg border border-surface-variant bg-surface-container-lowest ${className}`}
            style={minHeight ? { minHeight } : undefined}
        >
            <ReactFlow
                key={graphKey}
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
        </section>
    );
}
