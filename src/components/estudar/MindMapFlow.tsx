import { useMemo, useState, useCallback } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  NodeProps,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface MindMapNode {
  label: string;
  explicacao?: string;
  exemplo?: string;
  children?: MindMapNode[];
}

interface MindMapFlowProps {
  data: MindMapNode;
}

const NODE_WIDTH = 300;
const ROOT_HEIGHT = 100;
const BRANCH_HEIGHT = 60;
const EXPANDED_HEIGHT = 160;

const LEVEL_COLORS = [
  'hsl(43, 74%, 49%)',
  'hsl(260, 50%, 55%)',
  'hsl(200, 60%, 50%)',
  'hsl(160, 50%, 45%)',
  'hsl(30, 60%, 50%)',
];

// Custom node component
function MindMapNodeComponent({ data, id }: NodeProps) {
  const [expanded, setExpanded] = useState(false);
  const level = (data as any).level ?? 0;
  const isRoot = level === 0;
  const color = LEVEL_COLORS[Math.min(level, LEVEL_COLORS.length - 1)];
  const explicacao = (data as any).explicacao;
  const exemplo = (data as any).exemplo;
  const hasExtra = explicacao || exemplo;

  return (
    <div
      className="relative"
      style={{
        background: isRoot ? 'hsl(43, 74%, 49%)' : 'hsl(240, 6%, 14%)',
        border: `2px solid ${color}`,
        borderRadius: isRoot ? '16px' : '12px',
        padding: isRoot ? '14px 20px' : '10px 14px',
        width: `${NODE_WIDTH}px`,
        boxShadow: isRoot
          ? '0 4px 24px hsla(43, 74%, 49%, 0.35)'
          : '0 2px 10px hsla(0, 0%, 0%, 0.3)',
        cursor: hasExtra ? 'pointer' : 'default',
      }}
      onClick={() => hasExtra && setExpanded(!expanded)}
    >
      <Handle type="target" position={Position.Top} style={{ background: color, border: 'none', width: 8, height: 8 }} />

      <div className="flex items-center justify-between gap-2">
        <p
          style={{
            color: isRoot ? '#1a1a1a' : 'hsl(0, 0%, 92%)',
            fontSize: isRoot ? '14px' : level === 1 ? '13px' : '12px',
            fontWeight: level <= 1 ? 700 : 600,
            lineHeight: '1.3',
            margin: 0,
          }}
        >
          {(data as any).label ?? ''}
        </p>
        {hasExtra && (
          <span style={{ color: isRoot ? '#1a1a1a80' : 'hsl(0,0%,60%)', flexShrink: 0 }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        )}
      </div>

      {expanded && (
        <div style={{ marginTop: '8px', borderTop: `1px solid ${color}40`, paddingTop: '8px' }}>
          {explicacao && (
            <p style={{ fontSize: '11px', color: isRoot ? '#1a1a1acc' : 'hsl(0,0%,75%)', margin: '0 0 6px 0', lineHeight: '1.4' }}>
              💡 {explicacao}
            </p>
          )}
          {exemplo && (
            <p style={{ fontSize: '11px', color: 'hsl(43, 74%, 55%)', margin: 0, lineHeight: '1.4', fontStyle: 'italic' }}>
              📋 {exemplo}
            </p>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ background: color, border: 'none', width: 8, height: 8 }} />
    </div>
  );
}

const nodeTypes = { mindmap: MindMapNodeComponent };

function flattenTree(
  node: MindMapNode,
  parentId: string | null,
  nodes: Node[],
  edges: Edge[],
  level = 0,
  index = 0
): void {
  const id = parentId ? `${parentId}-${index}` : 'root';

  nodes.push({
    id,
    type: 'mindmap',
    data: {
      label: node.label,
      explicacao: node.explicacao,
      exemplo: node.exemplo,
      level,
    },
    position: { x: 0, y: 0 },
  });

  if (parentId) {
    const color = LEVEL_COLORS[Math.min(level, LEVEL_COLORS.length - 1)];
    edges.push({
      id: `e-${parentId}-${id}`,
      source: parentId,
      target: id,
      style: {
        stroke: color,
        strokeWidth: level <= 1 ? 2.5 : 1.5,
      },
      type: 'smoothstep',
    });
  }

  node.children?.forEach((child, i) => {
    flattenTree(child, id, nodes, edges, level + 1, i);
  });
}

function layoutWithDagre(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 100 });

  nodes.forEach((node) => {
    const level = (node.data as any).level ?? 0;
    const h = level === 0 ? ROOT_HEIGHT : BRANCH_HEIGHT;
    g.setNode(node.id, { width: NODE_WIDTH + 20, height: h });
  });
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return { ...node, position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - 30 } };
  });
}

const MindMapFlow = ({ data }: MindMapFlowProps) => {
  const { initialNodes, initialEdges } = useMemo(() => {
    const n: Node[] = [];
    const e: Edge[] = [];
    flattenTree(data, null, n, e);
    const laid = layoutWithDagre(n, e);
    return { initialNodes: laid, initialEdges: e };
  }, [data]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="w-full h-[75vh] rounded-xl overflow-hidden border border-border bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.4 }}
        minZoom={0.15}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--muted-foreground) / 0.15)" />
        <Controls className="!bg-card !border-border !rounded-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground" />
        <MiniMap
          nodeColor={(n) => n.id === 'root' ? 'hsl(43, 74%, 49%)' : 'hsl(var(--muted))'}
          maskColor="hsl(var(--background) / 0.8)"
          className="!bg-card !border-border !rounded-lg"
        />
      </ReactFlow>
    </div>
  );
};

export default MindMapFlow;
