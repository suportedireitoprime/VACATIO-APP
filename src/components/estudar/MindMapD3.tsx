import { useRef, useMemo } from 'react';
import { hierarchy, tree } from 'd3-hierarchy';

interface MindMapNode {
  label: string;
  explicacao?: string;
  exemplo?: string;
  children?: MindMapNode[];
}

interface MindMapD3Props {
  data: MindMapNode;
}

const LEVEL_COLORS = ['hsl(43,74%,49%)', 'hsl(260,50%,55%)', 'hsl(200,60%,50%)', 'hsl(160,50%,45%)', 'hsl(30,60%,50%)'];

const MindMapD3 = ({ data }: MindMapD3Props) => {
  const { root, width, height } = useMemo(() => {
    const r = hierarchy(data);
    const leaves = r.leaves().length;
    const w = Math.max(700, leaves * 55);
    const h = Math.max(600, (r.height + 1) * 200);
    const layout = tree<MindMapNode>().size([w - 100, h - 120]);
    layout(r);
    return { root: r, width: w, height: h };
  }, [data]);

  return (
    <div className="w-full overflow-auto rounded-xl border border-border bg-background">
      <svg width={width} height={height} className="mx-auto">
        <g transform="translate(50, 40)">
          {/* Edges */}
          {root.links().map((link, i) => {
            const sx = link.source.x ?? 0;
            const sy = link.source.y ?? 0;
            const tx = link.target.x ?? 0;
            const ty = link.target.y ?? 0;
            const my = (sy + ty) / 2;
            return (
              <path
                key={i}
                d={`M${sx},${sy} C${sx},${my} ${tx},${my} ${tx},${ty}`}
                fill="none"
                stroke={LEVEL_COLORS[Math.min(link.target.depth, LEVEL_COLORS.length - 1)]}
                strokeWidth={link.target.depth <= 1 ? 2.5 : 1.5}
                opacity={0.7}
              />
            );
          })}
          {/* Nodes */}
          {root.descendants().map((node, i) => {
            const x = node.x ?? 0;
            const y = node.y ?? 0;
            const isRoot = node.depth === 0;
            const color = LEVEL_COLORS[Math.min(node.depth, LEVEL_COLORS.length - 1)];
            const hasExplicacao = !!node.data.explicacao;
            const boxH = hasExplicacao ? 52 : 32;

            return (
              <g key={i} transform={`translate(${x},${y})`}>
                <rect
                  x={-75}
                  y={-boxH / 2}
                  width={150}
                  height={boxH}
                  rx={isRoot ? 14 : 10}
                  fill={isRoot ? color : 'hsl(240, 6%, 14%)'}
                  stroke={color}
                  strokeWidth={isRoot ? 2.5 : 1.5}
                />
                <text
                  textAnchor="middle"
                  dy={hasExplicacao ? '-0.4em' : '0.35em'}
                  fill={isRoot ? '#1a1a1a' : 'hsl(0,0%,92%)'}
                  fontSize={isRoot ? 11 : node.depth === 1 ? 10 : 9}
                  fontWeight={node.depth <= 1 ? 700 : 500}
                >
                  {node.data.label.length > 20 ? node.data.label.slice(0, 18) + '…' : node.data.label}
                </text>
                {hasExplicacao && (
                  <text
                    textAnchor="middle"
                    dy="1.2em"
                    fill={isRoot ? '#1a1a1a99' : 'hsl(0,0%,60%)'}
                    fontSize={8}
                  >
                    {(node.data.explicacao || '').slice(0, 28)}{(node.data.explicacao || '').length > 28 ? '…' : ''}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default MindMapD3;
