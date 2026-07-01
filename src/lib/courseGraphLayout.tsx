import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';
import type { ReactNode } from 'react';

export interface CourseTree {
    course_id: string;
    name: string;
    prerequisites?: CourseTree[];
}

const NODE_WIDTH = 150;
const NODE_HEIGHT = 70;

interface SubjectPalette {
    bg: string;
    border: string;
    courseId: string;
    name: string;
}

const SUBJECT_PALETTES: SubjectPalette[] = [
    { bg: '#EFF6FF', border: '#3B82F6', courseId: '#1E40AF', name: '#334155' },
    { bg: '#F0FDF4', border: '#16A34A', courseId: '#166534', name: '#334155' },
    { bg: '#FFF7ED', border: '#EA580C', courseId: '#9A3412', name: '#334155' },
    { bg: '#FDF4FF', border: '#A855F7', courseId: '#6B21A8', name: '#334155' },
    { bg: '#FEF2F2', border: '#DC2626', courseId: '#991B1B', name: '#334155' },
    { bg: '#ECFEFF', border: '#0891B2', courseId: '#155E75', name: '#334155' },
    { bg: '#FEFCE8', border: '#CA8A04', courseId: '#854D0E', name: '#334155' },
    { bg: '#F8FAFC', border: '#64748B', courseId: '#1E293B', name: '#475569' },
];

function buildCourseLabel(courseId: string, name: string, palette: SubjectPalette): ReactNode {
    return (
        <div className="text-center font-bold">
            <div className="text-sm" style={{ color: palette.courseId }}>{courseId}</div>
            <div className="text-xs font-normal leading-snug" style={{ color: palette.name }}>{name}</div>
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
                    source: parent,
                    target: nodeId,
                    type: 'smoothstep',
                    animated: true,
                    style: { stroke: '#64748B', strokeWidth: 2 },
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
