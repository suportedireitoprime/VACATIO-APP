import { useMemo } from 'react';

type No = { id: string; rotulo: string; definicao?: string };
type Aresta = { de: string; para: string; relacao: string };

export function MapaConceitualBlock({ payload }: { payload: any }) {
  const titulo: string | undefined = payload?.titulo;
  const nos: No[] = Array.isArray(payload?.nos) ? payload.nos : [];
  const arestas: Aresta[] = Array.isArray(payload?.arestas) ? payload.arestas : [];

  const posicoes = useMemo(() => {
    const n = nos.length || 1;
    const radius = 130;
    const cx = 200;
    const cy = 160;
    const map: Record<string, { x: number; y: number }> = {};
    nos.forEach((no, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      map[no.id] = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
    });
    return map;
  }, [nos]);

  if (!nos.length) return null;

  return (
    <article>
      {titulo && <h3 className="mb-3 font-display text-lg font-bold text-foreground">{titulo}</h3>}
      <div className="rounded-xl border border-border bg-card p-3">
        <svg viewBox="0 0 400 320" className="w-full h-auto">
          {arestas.map((a, i) => {
            const p1 = posicoes[a.de];
            const p2 = posicoes[a.para];
            if (!p1 || !p2) return null;
            const mx = (p1.x + p2.x) / 2;
            const my = (p1.y + p2.y) / 2;
            return (
              <g key={i}>
                <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                  stroke="hsl(var(--primary))" strokeOpacity="0.4" strokeWidth="1.5" />
                <rect x={mx - 34} y={my - 8} width="68" height="16" rx="8"
                  fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeOpacity="0.5" />
                <text x={mx} y={my + 3} textAnchor="middle" fontSize="9"
                  fill="hsl(var(--primary))" fontWeight="600">{a.relacao}</text>
              </g>
            );
          })}
          {nos.map((no) => {
            const p = posicoes[no.id];
            if (!p) return null;
            return (
              <g key={no.id}>
                <circle cx={p.x} cy={p.y} r="34" fill="hsl(var(--primary))" fillOpacity="0.12"
                  stroke="hsl(var(--primary))" strokeWidth="1.5" />
                <text x={p.x} y={p.y + 3} textAnchor="middle" fontSize="10"
                  fill="hsl(var(--foreground))" fontWeight="700">
                  {no.rotulo.length > 14 ? no.rotulo.slice(0, 13) + '…' : no.rotulo}
                </text>
              </g>
            );
          })}
        </svg>
        <ul className="mt-3 space-y-1.5">
          {nos.filter((n) => n.definicao).map((n) => (
            <li key={n.id} className="text-sm">
              <span className="font-semibold text-foreground">{n.rotulo}: </span>
              <span className="text-muted-foreground">{n.definicao}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
