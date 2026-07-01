import dagre from '@dagrejs/dagre';
import { MarkerType, type Edge, type Node } from '@xyflow/react';
import type { ReactNode } from 'react';

export interface CourseTree {
    course_id: string;
    name: string;
    prerequisites?: CourseTree[];
}

const NODE_WIDTH = 150;
const NODE_HEIGHT = 76;

interface SubjectPalette {
    bg: string;
    border: string;
    courseId: string;
    name: string;
}

const SUBJECT_PALETTES: SubjectPalette[] = [
    { bg: '#dbe1ff', border: '#003087', courseId: '#001d59', name: '#444652' },
    { bg: '#dae2ff', border: '#2c6cf0', courseId: '#001849', name: '#444652' },
    { bg: '#f0eded', border: '#747683', courseId: '#1b1c1c', name: '#444652' },
    { bg: '#e8f5e9', border: '#004112', courseId: '#002908', name: '#444652' },
    { bg: '#ffdad6', border: '#ba1a1a', courseId: '#93000a', name: '#444652' },
    { bg: '#f6f3f2', border: '#0053cf', courseId: '#001d59', name: '#444652' },
    { bg: '#eae8e7', border: '#3959b0', courseId: '#1c4197', name: '#444652' },
    { bg: '#fefcff', border: '#747683', courseId: '#303030', name: '#475569' },
];

function buildCourseLabel(courseId: string, name: string, palette: SubjectPalette): ReactNode {
    return (
        <div className="text-center font-bold">
            <div className="text-sm" style={{ color: palette.courseId }}>{courseId}</div>
            <div
                className="text-xs font-normal leading-snug line-clamp-2"
                style={{ color: palette.name }}
                title={name}
            >
                {name}
            </div>
        </div>
    );
}

function buildGraphElements(dataArray: CourseTree[]): { nodes: Node[]; edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const nodeIds = new Set<string>();
    const edgeIds = new Set<string>();
    const prefixColors: Record<string, SubjectPalette> = {};

    const traverse = (node: CourseTree, parent: string | null = null) => {
        const nodeId = node.course_id;

        if (!nodeIds.has(nodeId)) {
            const prefixMatch = nodeId.match(/^([A-Za-z]+)/);
            const prefix = prefixMatch ? prefixMatch[0] : 'DEFAULT';

            if (!prefixColors[prefix]) {
                prefixColors[prefix] = SUBJECT_PALETTES[Object.keys(prefixColors).length % SUBJECT_PALETTES.length];
            }

            const palette = prefixColors[prefix];

            nodes.push({
                id: nodeId,
                position: { x: 0, y: 0 },
                data: {
                    label: buildCourseLabel(nodeId, node.name, palette),
                },
                style: {
                    background: palette.bg,
                    border: `2px solid ${palette.border}`,
                    borderRadius: '8px',
                    padding: '10px',
                    width: NODE_WIDTH,
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.12)',
                },
            });
            nodeIds.add(nodeId);
        }

        if (parent) {
            const edgeId = `${parent}-${nodeId}`;
            if (!edgeIds.has(edgeId)) {
                edges.push({
                    id: edgeId,
                    source: nodeId,
                    target: parent,
                    type: 'smoothstep',
                    animated: true,
                    style: { stroke: '#747683', strokeWidth: 2 },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#747683' },
                });
                edgeIds.add(edgeId);
            }
        }

        if (node.prerequisites?.length) {
            for (const child of node.prerequisites) {
                traverse(child, nodeId);
            }
        }
    };

    for (const courseTree of dataArray) {
        traverse(courseTree);
    }

    return { nodes, edges };
}

function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({
        rankdir: 'TB',
        nodesep: 80,
        ranksep: 120,
    });

    for (const node of nodes) {
        dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    }

    for (const edge of edges) {
        dagreGraph.setEdge(edge.source, edge.target);
    }

    dagre.layout(dagreGraph);

    return nodes.map((node) => {
        const positioned = dagreGraph.node(node.id);
        return {
            ...node,
            position: {
                x: positioned.x - NODE_WIDTH / 2,
                y: positioned.y - NODE_HEIGHT / 2,
            },
        };
    });
}

export function layoutCourseGraph(dataArray: CourseTree[]): { nodes: Node[]; edges: Edge[] } {
    const { nodes, edges } = buildGraphElements(dataArray);
    const layoutedNodes = applyDagreLayout(nodes, edges);
    return { nodes: layoutedNodes, edges };
}
