import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, X, ArrowRight, Link2, Info, ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  MarkerType,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { supabase } from '@/integrations/supabase/client';

const ART_REF_REGEX = /art(?:igo)?\.?\s*(\d+[\.\d]*(?:-[A-Z])?(?:º|°)?)/gi;

function normalizeNumero(num: string): string {
  return num.replace(/^art\.?\s*/i, '').replace(/[º°]/g, '').trim();
}

function extractArticleRefs(text: string): string[] {
  const refs: string[] = [];
  let m: RegExpExecArray | null;
  ART_REF_REGEX.lastIndex = 0;
  while ((m = ART_REF_REGEX.exec(text)) !== null) {
    const clean = m[1].replace(/[º°]/g, '');
    if (!refs.includes(clean)) refs.push(clean);
  }
  return refs;
}

function extractSnippet(text: string, refNum: string): string {
  const regex = new RegExp(`art(?:igo)?\\.?\\s*${refNum.replace('.', '\\.')}[º°]?`, 'i');
  const match = regex.exec(text);
  if (!match) return '';
  const start = Math.max(0, match.index - 60);
  const end = Math.min(text.length, match.index + match[0].length + 60);
  const snippet = text.substring(start, end);
  return (start > 0 ? '…' : '') + snippet + (end < text.length ? '…' : '');
}

function highlightRef(snippet: string, refNum: string): React.ReactNode {
  if (!snippet) return null;
  const regex = new RegExp(`(art(?:igo)?\\.?\\s*${refNum.replace('.', '\\.')}[º°]?)`, 'i');
  const parts = snippet.split(regex);
  if (parts.length === 1) return <span className="text-xs text-foreground/60 italic">{snippet}</span>;
  return (
    <span className="text-xs text-foreground/60 italic">
      {parts.map((p, i) =>
        regex.test(p) ? <mark key={i} className="bg-yellow-300/60 dark:bg-yellow-500/30 text-foreground rounded px-0.5">{p}</mark> : p
      )}
    </span>
  );
}

interface ConnectionInfo {
  nodeId: string;
  label: string;
  caput: string;
  fullText: string;
  paragrafos: string[];
  incisos: string[];
  outgoing: { target: string; targetLabel: string; targetCaput: string; snippet: string }[];
  incoming: { source: string; sourceLabel: string; sourceCaput: string; snippet: string }[];
}

type DetailTab = 'citado-por' | 'cita';

const BANNER_KEY = 'grafo-banner-dismissed';

export interface GrafoArtigosProps {
  tabelaNome?: string;
  leiNome?: string;
  artigoNumero?: string;
  onClose?: () => void;
  embedded?: boolean;
}

const GrafoArtigos = (props: GrafoArtigosProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const tabelaNome = props.tabelaNome ?? (location.state as any)?.tabelaNome;
  const leiNome = props.leiNome ?? (location.state as any)?.leiNome;
  const artigoNumero = props.artigoNumero ?? (location.state as any)?.artigoNumero;
  const onClose = props.onClose;
  const embedded = props.embedded ?? false;
  const [loading, setLoading] = useState(true);
  const [artigos, setArtigos] = useState<any[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<ConnectionInfo | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('citado-por');
  const [bannerDismissed, setBannerDismissed] = useState(() => localStorage.getItem(BANNER_KEY) === '1');

  const dismissBanner = () => {
    setBannerDismissed(true);
    localStorage.setItem(BANNER_KEY, '1');
  };

  useEffect(() => {
    if (!tabelaNome) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from(tabelaNome as any)
        .select('numero, caput, texto, paragrafos, incisos')
        .order('ordem_numero', { ascending: true });
      setArtigos(data || []);
      setLoading(false);
    })();
  }, [tabelaNome]);

  const { nodes, edges, artMap, numToOriginal, edgeList } = useMemo(() => {
    if (artigos.length === 0) return { nodes: [], edges: [], artMap: new Map(), numToOriginal: new Map(), edgeList: [] as { source: string; target: string }[] };

    const artMap = new Map<string, any>();
    const numToOriginal = new Map<string, string>();
    for (const a of artigos) {
      const norm = normalizeNumero(a.numero);
      artMap.set(norm, a);
      numToOriginal.set(norm, a.numero);
    }

    const focusedNorm = artigoNumero ? normalizeNumero(artigoNumero) : null;
    const allEdges: Edge[] = [];
    const edgeList: { source: string; target: string }[] = [];
    const connectedNorms = new Set<string>();

    for (const art of artigos) {
      const srcNorm = normalizeNumero(art.numero);
      const textoBase = [art.texto, art.caput].filter(Boolean).join('\n');
      const refs = extractArticleRefs(textoBase);
      for (const ref of refs) {
        if (ref !== srcNorm && artMap.has(ref)) {
          allEdges.push({
            id: `${srcNorm}->${ref}`,
            source: srcNorm,
            target: ref,
            markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' },
            style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
            animated: true,
          });
          edgeList.push({ source: srcNorm, target: ref });
          connectedNorms.add(srcNorm);
          connectedNorms.add(ref);
        }
      }
    }

    // When opened from a specific article, only show that article's direct connections
    let relevantNorms: Set<string>;
    if (focusedNorm) {
      relevantNorms = new Set<string>([focusedNorm]);
      for (const e of edgeList) {
        if (e.source === focusedNorm) relevantNorms.add(e.target);
        if (e.target === focusedNorm) relevantNorms.add(e.source);
      }
    } else {
      relevantNorms = connectedNorms;
    }
    const filteredNorms = [...relevantNorms].filter(n => artMap.has(n));
    const cols = Math.max(1, Math.min(3, Math.ceil(Math.sqrt(filteredNorms.length))));
    const xGap = 160;
    const yGap = 80;

    const allNodes: Node[] = filteredNorms.map((norm, i) => ({
      id: norm,
      position: { x: (i % cols) * xGap + 20, y: Math.floor(i / cols) * yGap + 20 },
      data: { label: numToOriginal.get(norm) || `Art. ${norm}` },
      style: {
        background: norm === focusedNorm ? 'hsl(var(--primary))' : 'hsl(var(--card))',
        color: norm === focusedNorm ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
        border: norm === focusedNorm ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
        borderRadius: '12px',
        padding: '6px 14px',
        fontSize: '11px',
        fontWeight: 700,
        cursor: 'pointer',
      },
    }));

    const filteredEdges = focusedNorm
      ? allEdges.filter(e => e.source === focusedNorm || e.target === focusedNorm)
      : allEdges;

    return { nodes: allNodes, edges: filteredEdges, artMap, numToOriginal, edgeList };
  }, [artigos, artigoNumero]);

  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    const nodeId = String(node.id);
    const art = artMap.get(nodeId);
    if (!art) return;

    const fullText = [art.caput, art.texto].filter(Boolean).join('\n');

    const outgoing = edgeList
      .filter(e => e.source === nodeId)
      .map(e => {
        const targetArt = artMap.get(e.target);
        const srcText = [art.texto, art.caput].filter(Boolean).join('\n');
        return {
          target: e.target,
          targetLabel: numToOriginal.get(e.target) || `Art. ${e.target}`,
          targetCaput: targetArt?.caput || '',
          snippet: extractSnippet(srcText, e.target),
        };
      });

    const incoming = edgeList
      .filter(e => e.target === nodeId)
      .map(e => {
        const srcArt = artMap.get(e.source);
        const srcText = [srcArt?.texto, srcArt?.caput].filter(Boolean).join('\n');
        return {
          source: e.source,
          sourceLabel: numToOriginal.get(e.source) || `Art. ${e.source}`,
          sourceCaput: srcArt?.caput || '',
          snippet: extractSnippet(srcText, nodeId),
        };
      });

    setSelectedConnection({
      nodeId,
      label: numToOriginal.get(nodeId) || `Art. ${nodeId}`,
      caput: art.caput || '',
      fullText,
      paragrafos: art.paragrafos || [],
      incisos: art.incisos || [],
      outgoing,
      incoming,
    });
    setDetailTab('citado-por');
  }, [artMap, numToOriginal, edgeList]);

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <PageHeader
        title="Grafo de Conexões"
        subtitle={leiNome || 'Artigos conectados'}
        onBack={() => (embedded && onClose ? onClose() : navigate(-1))}
        rightAction={nodes.length > 0 ? (
          <span className="text-xs text-muted-foreground bg-secondary/60 px-2.5 py-1 rounded-full shrink-0">
            {nodes.length} arts · {edges.length} conexões
          </span>
        ) : undefined}
      />


      {/* Explanatory Banner */}
      {!bannerDismissed && !loading && nodes.length > 0 && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-primary/10 border border-primary/20 flex gap-3 items-start shrink-0">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground/80 leading-relaxed">
              Este mapa mostra como os artigos desta lei <strong>se citam entre si</strong>. Cada ponto é um artigo e as setas mostram referências cruzadas. Toque em qualquer artigo para ver os detalhes da conexão.
            </p>
          </div>
          <button onClick={dismissBanner} className="w-6 h-6 rounded-full bg-secondary/60 flex items-center justify-center shrink-0">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Graph */}
      <div className="flex-1 min-h-0 relative">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center">
            <Link2 className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-foreground/80 text-sm font-medium">Nenhuma conexão encontrada</p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Este artigo não cita outros dispositivos, ou a lei não possui referências cruzadas detectadas.
            </p>
          </div>
        ) : (
          <>
            <ReactFlow
              className="bg-background touch-none"
              nodes={nodes}
              edges={edges}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              onNodeClick={handleNodeClick}
              proOptions={{ hideAttribution: true }}
              minZoom={0.3}
              maxZoom={3}
              panOnDrag
              zoomOnPinch
              preventScrolling
            >
              <Background gap={20} size={1} />
            </ReactFlow>

            {!selectedConnection && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm border border-border/50 rounded-full px-4 py-1.5 pointer-events-none">
                <p className="text-xs text-muted-foreground">Toque em um artigo para ver suas conexões</p>
              </div>
            )}
          </>
        )}

        {/* Connection Detail Bottom Sheet */}
        <AnimatePresence>
          {selectedConnection && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/30 backdrop-blur-[2px] z-10"
                onClick={() => setSelectedConnection(null)}
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                className="absolute bottom-0 left-0 right-0 z-20 bg-card rounded-t-[1.5rem] border-t border-border/50 shadow-[0_-8px_30px_rgba(0,0,0,0.4)] h-[80%] flex flex-col"
              >
                <div className="w-10 h-1 rounded-full bg-muted-foreground/20 mx-auto mt-3 mb-1" />

                {/* Card Header */}
                <div className="px-5 py-3 flex items-start justify-between gap-3 shrink-0">
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-bold text-primary truncate">
                      {selectedConnection.label}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedConnection(null)}
                    className="w-8 h-8 rounded-full bg-secondary/60 flex items-center justify-center shrink-0"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-1 px-5 pb-3 shrink-0">
                {([
                    { key: 'citado-por' as DetailTab, label: 'É citado por', count: selectedConnection.incoming.length },
                    { key: 'cita' as DetailTab, label: 'Cita', count: selectedConnection.outgoing.length },
                  ]).map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setDetailTab(tab.key)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                        detailTab === tab.key
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-secondary/50 text-muted-foreground'
                      }`}
                    >
                      {tab.label}{tab.count > 0 ? ` (${tab.count})` : ''}
                    </button>
                  ))}
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-3">
                  {/* Tab: É citado por */}
                  {detailTab === 'citado-por' && (
                    selectedConnection.incoming.length > 0 ? (
                      selectedConnection.incoming.map((conn) => (
                        <div key={conn.source} className="p-3 rounded-xl bg-secondary/40 border border-border/50 space-y-3">
                          <div className="flex items-center gap-2">
                            <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm font-bold text-foreground">{conn.sourceLabel}</span>
                          </div>
                          {conn.snippet && (
                            <div className="pl-5 py-1.5 px-2 rounded-lg bg-background/60 border border-border/30">
                              <p className="text-[10px] text-muted-foreground mb-1">Trecho da menção:</p>
                              {highlightRef(conn.snippet, selectedConnection.nodeId)}
                            </div>
                          )}
                          <div className="pl-5 py-2 px-3 rounded-lg bg-primary/5 border border-primary/10">
                            <p className="text-[10px] font-semibold text-primary mb-1">💡 O que isso significa?</p>
                            <p className="text-xs text-foreground/70 leading-relaxed">
                              O <strong>{conn.sourceLabel}</strong> faz referência direta ao <strong>{selectedConnection.label}</strong>. Isso significa que o conteúdo do {conn.sourceLabel} depende ou complementa o que está disposto no {selectedConnection.label}. Para compreensão completa, ambos devem ser lidos em conjunto.
                            </p>
                          </div>
                          <p className="text-xs text-foreground/60 leading-relaxed pl-5">
                            {conn.sourceCaput || 'Sem texto disponível'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-6">Nenhum artigo cita este dispositivo.</p>
                    )
                  )}

                  {/* Tab: Cita */}
                  {detailTab === 'cita' && (
                    selectedConnection.outgoing.length > 0 ? (
                      selectedConnection.outgoing.map((conn) => (
                        <div key={conn.target} className="p-3 rounded-xl bg-primary/10 border border-primary/20 space-y-3">
                          <div className="flex items-center gap-2">
                            <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="text-sm font-bold text-foreground">{conn.targetLabel}</span>
                          </div>
                          {conn.snippet && (
                            <div className="pl-5 py-1.5 px-2 rounded-lg bg-background/60 border border-border/30">
                              <p className="text-[10px] text-muted-foreground mb-1">Trecho da menção:</p>
                              {highlightRef(conn.snippet, conn.target)}
                            </div>
                          )}
                          <div className="pl-5 py-2 px-3 rounded-lg bg-primary/5 border border-primary/10">
                            <p className="text-[10px] font-semibold text-primary mb-1">💡 O que isso significa?</p>
                            <p className="text-xs text-foreground/70 leading-relaxed">
                              O <strong>{selectedConnection.label}</strong> menciona o <strong>{conn.targetLabel}</strong> em seu texto. Isso indica que o conteúdo do {selectedConnection.label} se baseia, remete ou condiciona algo ao que está previsto no {conn.targetLabel}.
                            </p>
                          </div>
                          <p className="text-xs text-foreground/60 leading-relaxed pl-5">
                            {conn.targetCaput || 'Sem texto disponível'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-6">Este artigo não cita outros dispositivos.</p>
                    )
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GrafoArtigos;
