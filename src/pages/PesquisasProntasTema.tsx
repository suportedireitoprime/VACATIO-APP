import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Loader2, Sparkles, Scale, RefreshCw, FileText, FileDown, Calendar, User2, Building2, ChevronDown, Wand2, Copy, Check } from 'lucide-react';
import { fetchPesquisaProntaBySlug, type PesquisaPronta } from '@/services/pesquisasProntasService';
import { supabaseCloud } from '@/integrations/supabase/cloudClient';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';

interface Acordao {
  id?: string;
  ordem: number;
  titulo: string;
  orgao: string | null;
  relator: string | null;
  data_julgamento: string | null;
  data_publicacao: string | null;
  ementa: string | null;
  url_inteiro_teor: string | null;
  observacao: string | null;
  url_pdf: string | null;
  ementa_refinada?: string | null;
  observacao_refinada?: string | null;
  refinado_em?: string | null;
}

// Renderiza texto com **negrito** como spans destacados (vermelho, como no STF).
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) {
          return (
            <strong key={i} className="font-bold text-red-500">
              {p.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

// Remove marcadores **negrito** para copiar como texto puro.
function stripBold(t: string): string {
  return t.replace(/\*\*([^*]+)\*\*/g, '$1').trim();
}

// Extrai as seções Ementa / Tema / Tese do texto refinado (ou do bruto).
function extractSections(a: Acordao | null): { ementa: string; tema: string; tese: string } {
  const src = (a?.ementa_refinada || a?.ementa || '').trim();
  const result = { ementa: '', tema: '', tese: '' };
  if (!src) return result;
  // Match sections delimited by **Ementa**, **Tema**, **Tese** headers.
  const re = /\*\*(Ementa|Tema|Tese)\*\*\s*([\s\S]*?)(?=\n\s*\*\*(?:Ementa|Tema|Tese)\*\*|$)/gi;
  let m: RegExpExecArray | null;
  let matched = false;
  while ((m = re.exec(src)) !== null) {
    matched = true;
    const key = m[1].toLowerCase() as 'ementa' | 'tema' | 'tese';
    result[key] = stripBold(m[2]);
  }
  if (!matched) {
    result.ementa = stripBold(src);
  }
  return result;
}

export default function PesquisasProntasTema() {
  const navigate = useNavigate();
  const { tribunal, slug } = useParams<{ tribunal: string; slug: string }>();
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<PesquisaPronta | null>(null);
  const [acordaos, setAcordaos] = useState<Acordao[] | null>(null);
  const [loadingAc, setLoadingAc] = useState(false);
  const [errorAc, setErrorAc] = useState<string | null>(null);
  const [selected, setSelected] = useState<Acordao | null>(null);
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copySel, setCopySel] = useState<Record<'ementa' | 'tema' | 'tese', boolean>>({
    ementa: false,
    tema: false,
    tese: false,
  });

  async function doCopy(parts: Array<'ementa' | 'tema' | 'tese'>) {
    const s = extractSections(selected);
    const labels: Record<string, string> = { ementa: 'EMENTA', tema: 'TEMA', tese: 'TESE' };
    const chunks = parts
      .filter((k) => s[k])
      .map((k) => `${labels[k]}\n\n${s[k]}`);
    const text = chunks.join('\n\n---\n\n');
    if (!text) {
      toast.error('Nada disponível para copiar');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copiado para a área de transferência');
      setCopyOpen(false);
      setCopySel({ ementa: false, tema: false, tese: false });
    } catch {
      toast.error('Falha ao copiar');
    }
  }

  function pdfHref(a: Acordao | null): string | null {
    if (!a) return null;
    return a.url_pdf || a.url_inteiro_teor || null;
  }

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    setLoading(true);
    fetchPesquisaProntaBySlug(decodeURIComponent(slug)).then((data) => {
      if (!alive) return;
      setItem(data);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!item) return;
    loadAcordaos(item.id, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  async function loadAcordaos(pesquisa_id: string, force: boolean) {
    setLoadingAc(true);
    setErrorAc(null);
    try {
      const { data, error } = await supabaseCloud.functions.invoke('jurisprudencia-prontas-scrape', {
        body: { pesquisa_id, force },
      });
      if (error) throw error;
      setAcordaos((data?.acordaos as Acordao[]) ?? []);
    } catch (e: any) {
      console.error(e);
      setErrorAc(e?.message || 'Falha ao carregar acórdãos');
      setAcordaos([]);
    } finally {
      setLoadingAc(false);
    }
  }

  // Ao abrir um acórdão, dispara a refinação por IA se ainda não houver.
  useEffect(() => {
    if (!selected?.id) return;
    if (selected.ementa_refinada) return;
    let alive = true;
    setRefining(true);
    setRefineError(null);
    (async () => {
      try {
        const { data, error } = await supabaseCloud.functions.invoke('jurisprudencia-refinar', {
          body: { resultado_id: selected.id },
        });
        if (!alive) return;
        if (error) throw error;
        setSelected((cur) =>
          cur && cur.id === selected.id
            ? {
                ...cur,
                ementa_refinada: data?.ementa_refinada ?? cur.ementa_refinada ?? null,
                observacao_refinada: data?.observacao_refinada ?? cur.observacao_refinada ?? null,
                refinado_em: data?.refinado_em ?? cur.refinado_em ?? null,
              }
            : cur,
        );
        // Atualiza também na lista para cache local.
        setAcordaos((list) =>
          list?.map((a) =>
            a.id === selected.id
              ? {
                  ...a,
                  ementa_refinada: data?.ementa_refinada ?? null,
                  observacao_refinada: data?.observacao_refinada ?? null,
                  refinado_em: data?.refinado_em ?? null,
                }
              : a,
          ) ?? null,
        );
      } catch (e: any) {
        if (!alive) return;
        console.error('refinar', e);
        setRefineError(e?.message || 'Falha ao refinar');
      } finally {
        if (alive) setRefining(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selected?.id, selected?.ementa_refinada]);

  const trib = (tribunal || '').toUpperCase();

  return (
    <div className="min-h-dvh bg-background pb-16">
      <div
        className="relative overflow-hidden rounded-b-[32px] border-b border-emerald-500/30 shadow-xl shadow-black/40"
        style={{
          background:
            'linear-gradient(160deg, hsl(158 72% 32%) 0%, hsl(150 65% 22%) 55%, hsl(148 55% 14%) 100%)',
        }}
      >
        <div className="relative flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-2">
          <button
            onClick={() => navigate(-1)}
            aria-label="Voltar"
            className="w-11 h-11 rounded-full bg-black/25 hover:bg-black/35 backdrop-blur-sm flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="text-center">
            <p className="font-display uppercase tracking-[0.22em] text-[10px] text-white/70">
              Pesquisa Pronta
            </p>
            <h1 className="font-display uppercase tracking-wider text-white text-lg font-bold leading-tight">
              {trib}
            </h1>
          </div>
          <button
            onClick={() => item && loadAcordaos(item.id, true)}
            disabled={loadingAc || !item}
            aria-label="Recarregar"
            className="w-11 h-11 rounded-full bg-black/25 hover:bg-black/35 backdrop-blur-sm flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-white ${loadingAc ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="relative px-6 pb-8 pt-2 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-sm flex items-center justify-center shadow-xl shadow-emerald-900/40">
            <Sparkles className="w-7 h-7 text-white" strokeWidth={2.2} />
          </div>
          {item && (
            <>
              <p className="mt-3 font-body text-[11px] uppercase tracking-wider text-white/70">
                {item.ramo}
                {item.assunto ? ` · ${item.assunto}` : ''}
              </p>
              <h2 className="mt-1 font-display text-white text-xl font-bold leading-tight drop-shadow px-2">
                {item.titulo}
              </h2>
            </>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando tema…
          </div>
        ) : !item ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-background/40 p-6 text-center">
            <p className="font-display text-[14px] font-bold text-foreground">
              Tema não encontrado
            </p>
            <p className="mt-1 font-body text-[12.5px] text-muted-foreground">
              Talvez o link esteja quebrado ou a coletânea tenha sido reimportada.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                <Scale className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-body">
                  {item.ramo}{item.assunto ? ` · ${item.assunto}` : ''}
                </span>
              </div>
              {acordaos && (
                <span className="font-display uppercase tracking-wider text-[10px] font-bold text-emerald-500">
                  {acordaos.length} acórdão{acordaos.length === 1 ? '' : 's'}
                </span>
              )}
            </div>

            {!acordaos || (loadingAc && acordaos.length === 0) ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="font-body text-[13px]">Buscando acórdãos no {trib}…</span>
              </div>
            ) : errorAc ? (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
                <p className="font-display text-[13px] font-bold text-destructive">
                  Erro ao carregar acórdãos
                </p>
                <p className="mt-1 font-body text-[12px] text-muted-foreground">{errorAc}</p>
                <button
                  onClick={() => loadAcordaos(item.id, true)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-display uppercase tracking-wider text-[11px] font-bold px-3 py-1.5"
                >
                  <RefreshCw className="w-3 h-3" /> Tentar novamente
                </button>
              </div>
            ) : acordaos && acordaos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-background/40 p-6 text-center">
                <p className="font-display text-[13px] font-bold text-foreground">
                  Nenhum acórdão extraído
                </p>
                <p className="mt-1 font-body text-[12px] text-muted-foreground">
                  Você ainda pode consultar diretamente no portal oficial.
                </p>
                <a
                  href={item.query_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-display uppercase tracking-wider text-[11px] font-bold px-3 py-1.5"
                >
                  <ExternalLink className="w-3 h-3" /> Abrir no {trib}
                </a>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-border/70 bg-secondary/20 overflow-hidden divide-y divide-border/50">
                  {acordaos!.map((a) => {
                    return (
                      <div key={a.ordem}>
                        <button
                          onClick={() => setSelected(a)}
                          className="w-full flex items-start gap-3 px-3.5 py-3 text-left hover:bg-background/40 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-display text-[13px] font-bold text-foreground leading-tight truncate">
                              {a.titulo}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[10.5px] text-muted-foreground font-body">
                              {a.relator && (
                                <span className="inline-flex items-center gap-1">
                                  <User2 className="w-2.5 h-2.5" /> {a.relator}
                                </span>
                              )}
                              {a.data_julgamento && (
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="w-2.5 h-2.5" /> {a.data_julgamento}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronDown className="shrink-0 w-4 h-4 mt-0.5 text-muted-foreground -rotate-90" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <a
                  href={item.query_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center justify-center gap-2 rounded-2xl border border-border/70 bg-background/50 text-muted-foreground hover:text-foreground hover:border-emerald-500/40 font-display uppercase tracking-wider text-[11px] font-bold py-3 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ver tudo no portal oficial do {trib}
                </a>
              </>
            )}
          </>
        )}
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent
          side="bottom"
          className="h-[85vh] rounded-t-3xl border-t border-emerald-500/30 bg-background p-0 flex flex-col"
        >
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/50 text-left">
            <SheetTitle className="font-display text-[15px] font-bold text-foreground leading-tight pr-8">
              {selected?.titulo}
            </SheetTitle>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground font-body">
              {selected?.orgao && (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> {selected.orgao}
                </span>
              )}
              {selected?.relator && (
                <span className="inline-flex items-center gap-1">
                  <User2 className="w-3 h-3" /> {selected.relator}
                </span>
              )}
              {selected?.data_julgamento && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {selected.data_julgamento}
                </span>
              )}
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {refining && !selected?.ementa_refinada && (
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span className="font-body text-[12.5px] text-emerald-200">
                  Refinando com IA para melhor leitura…
                </span>
              </div>
            )}
            {refineError && (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-2 font-body text-[12px] text-destructive">
                {refineError}
              </div>
            )}
            {(selected?.ementa_refinada || selected?.ementa) && (
              <div className="rounded-2xl bg-secondary/40 border border-border/40 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-display uppercase tracking-wider text-[10px] font-bold text-emerald-500">
                    Ementa
                  </p>
                  {selected.ementa_refinada && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-display uppercase tracking-wider font-bold text-emerald-400">
                      <Wand2 className="w-2.5 h-2.5" /> Refinado por IA
                    </span>
                  )}
                </div>
                <p className="font-body text-[12.5px] text-foreground/90 leading-relaxed whitespace-pre-line">
                  <RichText text={selected.ementa_refinada || selected.ementa || ''} />
                </p>
              </div>
            )}
            {(selected?.observacao_refinada || selected?.observacao) && (
              <div className="rounded-2xl bg-secondary/40 border border-border/40 p-4">
                <p className="font-display uppercase tracking-wider text-[10px] font-bold text-emerald-500 mb-2">
                  Observação
                </p>
                <p className="font-body text-[12.5px] text-foreground/90 leading-relaxed whitespace-pre-line">
                  <RichText text={selected.observacao_refinada || selected.observacao || ''} />
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-border/50 bg-background/95 backdrop-blur px-4 py-3 grid grid-cols-3 gap-2">
            <a
              href={selected?.url_inteiro_teor || '#'}
              onClick={(e) => {
                if (!selected?.url_inteiro_teor) e.preventDefault();
              }}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!selected?.url_inteiro_teor}
              className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-2.5 font-display uppercase tracking-wider text-[10px] font-bold transition-colors ${
                selected?.url_inteiro_teor
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-secondary/40 text-muted-foreground pointer-events-none'
              }`}
            >
              <FileText className="w-4 h-4" />
              Inteiro teor
            </a>
            <a
              href={pdfHref(selected) || '#'}
              onClick={(e) => {
                if (!pdfHref(selected)) e.preventDefault();
              }}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!pdfHref(selected)}
              className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-2.5 font-display uppercase tracking-wider text-[10px] font-bold transition-colors ${
                pdfHref(selected)
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-secondary/40 text-muted-foreground pointer-events-none'
              }`}
            >
              <FileDown className="w-4 h-4" />
              Baixar PDF
            </a>
            <button
              onClick={() => {
                setCopySel({ ementa: false, tema: false, tese: false });
                setCopyOpen(true);
              }}
              className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black py-2.5 font-display uppercase tracking-wider text-[10px] font-bold transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copiar
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sheet de copiar */}
      <Sheet open={copyOpen} onOpenChange={setCopyOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-t border-emerald-500/30 bg-background p-0"
        >
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/50 text-left">
            <SheetTitle className="font-display text-[15px] font-bold text-foreground">
              Copiar acórdão
            </SheetTitle>
            <p className="mt-1 font-body text-[12px] text-muted-foreground">
              Escolha uma opção rápida ou marque as partes que deseja copiar.
            </p>
          </SheetHeader>
          <div className="p-4 space-y-4">
            {(() => {
              const s = extractSections(selected);
              const has = { ementa: !!s.ementa, tema: !!s.tema, tese: !!s.tese };
              const quick: Array<{ key: 'ementa' | 'tema' | 'tese' | 'all'; label: string }> = [
                { key: 'ementa', label: 'Só a Ementa' },
                { key: 'tema', label: 'Só o Tema' },
                { key: 'tese', label: 'Só a Tese' },
                { key: 'all', label: 'Os três (Ementa + Tema + Tese)' },
              ];
              return (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {quick.map((q) => {
                      const enabled =
                        q.key === 'all'
                          ? has.ementa || has.tema || has.tese
                          : has[q.key];
                      return (
                        <button
                          key={q.key}
                          disabled={!enabled}
                          onClick={() =>
                            doCopy(
                              q.key === 'all'
                                ? (['ementa', 'tema', 'tese'] as const).filter((k) => has[k])
                                : [q.key],
                            )
                          }
                          className="flex items-center justify-center gap-1.5 rounded-2xl border border-border/60 bg-secondary/30 hover:bg-secondary/60 text-foreground font-display uppercase tracking-wider text-[11px] font-bold py-3 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          {q.label}
                        </button>
                      );
                    })}
                  </div>

                  <div>
                    <p className="font-display uppercase tracking-wider text-[10px] font-bold text-emerald-500 mb-2">
                      Ou selecione o que quiser
                    </p>
                    <div className="space-y-1.5">
                      {(['ementa', 'tema', 'tese'] as const).map((k) => (
                        <label
                          key={k}
                          className={`flex items-center gap-3 rounded-2xl border border-border/60 bg-secondary/20 px-3.5 py-2.5 ${
                            has[k] ? 'cursor-pointer hover:bg-secondary/40' : 'opacity-40'
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={!has[k]}
                            checked={copySel[k]}
                            onChange={(e) =>
                              setCopySel((cur) => ({ ...cur, [k]: e.target.checked }))
                            }
                            className="w-4 h-4 accent-emerald-500"
                          />
                          <span className="font-display uppercase tracking-wider text-[11px] font-bold text-foreground capitalize">
                            {k}
                          </span>
                          {!has[k] && (
                            <span className="ml-auto font-body text-[10px] text-muted-foreground">
                              indisponível
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                    <button
                      onClick={() =>
                        doCopy(
                          (['ementa', 'tema', 'tese'] as const).filter(
                            (k) => copySel[k] && has[k],
                          ),
                        )
                      }
                      disabled={!(copySel.ementa || copySel.tema || copySel.tese)}
                      className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-display uppercase tracking-wider text-[12px] font-bold py-3 transition-colors disabled:opacity-40"
                    >
                      <Check className="w-4 h-4" /> Copiar seleção
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}