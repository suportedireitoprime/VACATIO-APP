import { useEffect, useMemo, useState } from 'react';
import { LEIS_SUPABASE_URL } from "@/lib/legislacaoBackend";
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Copy, ExternalLink, FileText, Heart, Loader2, RefreshCw, Scale, Search, Mic, MicOff, Download, Brain } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import GeracaoAnimacaoOverlay from '@/components/vademecum/GeracaoAnimacaoOverlay';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { X } from 'lucide-react';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { gerarJurisprudenciaPDF } from '@/lib/jurisPdf';
import {
  readJurisCache,
  writeJurisCache,
  type JurisCategoriaCache,
} from '@/lib/jurisprudenciaCache';

interface JurisItem {
  id: number | string;
  titulo?: string;
  numero_processo?: string;
  conteudo?: string;
  teses?: string[];
  tese?: string;
  ementa?: string;
  descricao?: string;
  situacao?: string | null;
  data_publicacao?: string | null;
  url_origem?: string;
}
interface JurisCategoria {
  codigo: string;
  label: string;
  tribunal: string;
  itens: JurisItem[];
}

function tribunalClasses(tribunal: string, active = false) {
  if (tribunal === 'STF') {
    return active
      ? 'bg-blue-600 text-white border-blue-600'
      : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
  }
  if (tribunal === 'STJ') {
    return active
      ? 'bg-emerald-600 text-white border-emerald-600'
      : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
  }
  return active
    ? 'bg-primary text-primary-foreground border-primary'
    : 'bg-muted text-muted-foreground border-border';
}

function prettyLeiName(raw: string): string {
  if (!raw) return '';
  // Se já veio um nome amigável (com espaços/acentos e sem underscores), mantém.
  if (!/_/.test(raw) && /[a-zàáâãéêíóôõúç]/.test(raw)) return raw;
  const tokens = raw.split('_').filter(Boolean);
  if (tokens.length === 0) return raw;
  const isSigla = (t: string) => /^[A-Z0-9]{2,6}$/.test(t);
  const titleCase = (t: string) =>
    t.toLowerCase().replace(/(^|\s|-)([a-zà-ÿ])/g, (_, p, c) => p + c.toUpperCase());
  const stop = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
  const words = tokens.map((t, i) => {
    if (isSigla(t) && i === 0) return t; // sigla no início
    const lower = t.toLowerCase();
    if (stop.has(lower)) return lower;
    return titleCase(t);
  });
  if (isSigla(words[0]) && words.length > 1) {
    return `${words[0]} — ${words.slice(1).join(' ')}`;
  }
  return words.join(' ');
}

const SB_URL = LEIS_SUPABASE_URL;

export default function JurisprudenciaArtigo() {
  const navigate = useNavigate();
  const { slugLei, numeroArtigo } = useParams<{ slugLei: string; numeroArtigo: string }>();
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else if (slugLei) {
      navigate(`/vademecum/${slugLei}`);
    } else {
      navigate('/');
    }
  };
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leiInfo, setLeiInfo] = useState<{ corpus_lei_id: number; nome_exibicao: string } | null>(null);
  const [categorias, setCategorias] = useState<JurisCategoria[]>([]);
  const [totalItens, setTotalItens] = useState(0);
  const [tab, setTab] = useState<'todos' | 'favoritos'>('todos');
  const [tribunalFiltro, setTribunalFiltro] = useState<string>('todos');
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState('');
  const [descobrindo, setDescobrindo] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [detalhe, setDetalhe] = useState<{ item: JurisItem; cat: JurisCategoria; mode?: 'tese' | 'ementa' | 'ambos' } | null>(null);
  const [catAberta, setCatAberta] = useState<JurisCategoria | null>(null);
  const [explicacao, setExplicacao] = useState<string | null>(null);
  const [explicandoLoading, setExplicandoLoading] = useState(false);
  const voice = useVoiceInput((text) => setBusca((prev) => (prev ? prev + ' ' : '') + text));
  const [revalidating, setRevalidating] = useState(false);

  const OVERLAY_STEPS = [
    'Procurando lei no Corpus927',
    'Vinculando automaticamente',
    'Buscando jurisprudência',
    'Pronto',
  ];

  const numeroLabel = useMemo(() => {
    if (!numeroArtigo) return '';
    const raw = decodeURIComponent(numeroArtigo);
    return `Art. ${raw}`;
  }, [numeroArtigo]);

  const descobrirLei = async (): Promise<{ corpus_lei_id: number; nome_exibicao: string } | null> => {
    if (!slugLei) return null;
    const { data: lei } = await supabase
      .from('vade_mecum_leis')
      .select('slug, nome, numero_lei, ano_lei')
      .eq('slug', slugLei)
      .maybeSingle();
    const resp = await fetch(`${SB_URL}/functions/v1/corpus927-descobrir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug_local: slugLei,
        nome: lei?.nome || slugLei,
        numero_lei: lei?.numero_lei || null,
        ano_lei: lei?.ano_lei || null,
        apply: true,
      }),
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.error || 'Falha na descoberta');
    if (!json.confident || !json.matched) return null;
    return { corpus_lei_id: json.matched.corpus_lei_id, nome_exibicao: lei?.nome || json.matched.nome };
  };

  const buscarJurisprudencia = async (corpus_lei_id: number, force: boolean) => {
    // Sentinel: lei não indexada pelo Corpus927 (ex.: Constituição). Não chama a API,
    // apenas monta categorias com links de busca direta em STF e STJ.
    if (corpus_lei_id === -1) {
      setCategorias([]);
      setTotalItens(0);
      return;
    }
    const resp = await fetch(`${SB_URL}/functions/v1/corpus927-fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        corpus_lei_id,
        numero_artigo: decodeURIComponent(numeroArtigo!),
        force,
      }),
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.error || 'Erro ao consultar jurisprudência');
    setCategorias(json.categorias || []);
    setTotalItens(json.total_itens || 0);
  };

  const carregar = async (force = false) => {
    if (!slugLei || !numeroArtigo) return;
    setError(null);
    const numeroDec = decodeURIComponent(numeroArtigo);
    const cache = !force ? readJurisCache(slugLei, numeroDec) : null;
    if (cache) {
      // Hidrata instantaneamente e revalida em background
      if (cache.leiInfo) setLeiInfo(cache.leiInfo);
      setCategorias(cache.categorias);
      setTotalItens(cache.totalItens);
      setLoading(false);
      setRevalidating(true);
    } else {
      force ? setRefreshing(true) : setLoading(true);
    }
    try {
      let usouDescoberta = false;
      const mapaPromise = supabase
        .from('jurisprudencia_leis_map')
        .select('corpus_lei_id, nome_exibicao, ativo')
        .eq('slug_local', slugLei)
        .maybeSingle();
      const favPromise = supabase
        .from('jurisprudencia_favoritos')
        .select('corpus_item_id')
        .eq('slug_local', slugLei)
        .eq('numero_artigo', numeroDec);

      let { data: mapa, error: errMapa } = await mapaPromise;
      if (errMapa) throw errMapa;

      // Auto-descoberta se não mapeada ou inativa — só mostra overlay se não há cache
      if (!mapa || !mapa.ativo) {
        usouDescoberta = true;
        if (!cache) {
          setLoading(false);
          setDescobrindo(true);
          setStepIdx(0);
        }
        try {
          const descoberta = await descobrirLei();
          if (!descoberta) {
            if (!cache) setError('Não foi possível localizar esta lei automaticamente no Corpus927. Peça ao admin para mapear.');
            setDescobrindo(false);
            setRevalidating(false);
            return;
          }
          setStepIdx(1);
          mapa = { corpus_lei_id: descoberta.corpus_lei_id, nome_exibicao: descoberta.nome_exibicao, ativo: true };
        } catch (e: any) {
          if (!cache) setError(String(e?.message || e));
          setDescobrindo(false);
          setRevalidating(false);
          return;
        }
      }

      setLeiInfo({ corpus_lei_id: mapa.corpus_lei_id, nome_exibicao: mapa.nome_exibicao });
      if (usouDescoberta && !cache) setStepIdx(2);

      await buscarJurisprudencia(mapa.corpus_lei_id, force);

      const { data: fav } = await favPromise;
      setFavoritos(new Set((fav || []).map((f: any) => String(f.corpus_item_id))));

      // Persiste no cache local
      try {
        // Snapshot state values we just set
        setCategorias((cs) => {
          setTotalItens((t) => {
            writeJurisCache(slugLei, numeroDec, {
              leiInfo: { corpus_lei_id: mapa!.corpus_lei_id, nome_exibicao: mapa!.nome_exibicao },
              categorias: cs as JurisCategoriaCache[],
              totalItens: t,
              savedAt: Date.now(),
            });
            return t;
          });
          return cs;
        });
      } catch {}

      if (usouDescoberta && !cache) {
        setStepIdx(3);
        setDescobrindo(false);
      }
    } catch (e: any) {
      if (!cache) {
        setError(String(e?.message || e));
        setCategorias([]); setTotalItens(0);
      }
      setDescobrindo(false);
    } finally {
      setLoading(false); setRefreshing(false); setRevalidating(false);
    }
  };

  useEffect(() => { carregar(false);   }, [slugLei, numeroArtigo]);

  const toggleFav = async (cat: JurisCategoria, item: JurisItem) => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) { toast.error('Faça login para favoritar'); return; }
    const key = String(item.id);
    if (favoritos.has(key)) {
      await supabase.from('jurisprudencia_favoritos').delete().eq('user_id', uid).eq('corpus_item_id', Number(item.id));
      setFavoritos((s) => { const n = new Set(s); n.delete(key); return n; });
    } else {
      await supabase.from('jurisprudencia_favoritos').insert({
        user_id: uid,
        corpus_item_id: Number(item.id),
        categoria: cat.label,
        titulo: item.titulo || '',
        conteudo: item.conteudo || '',
        url_origem: item.url_origem || '',
        slug_local: slugLei!,
        numero_artigo: decodeURIComponent(numeroArtigo!),
      });
      setFavoritos((s) => new Set(s).add(key));
      toast.success('Adicionado aos favoritos');
    }
  };

  const filtroBusca = (item: JurisItem) => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return (
      (item.titulo || '').toLowerCase().includes(q) ||
      (item.numero_processo || '').toLowerCase().includes(q) ||
      (item.conteudo || '').toLowerCase().includes(q)
    );
  };

  const tribunaisDisponiveis = useMemo(() => {
    const map = new Map<string, number>();
    categorias.forEach((c) => {
      map.set(c.tribunal, (map.get(c.tribunal) || 0) + c.itens.length);
    });
    return Array.from(map.entries()).map(([tribunal, count]) => ({ tribunal, count }));
  }, [categorias]);

  const categoriasVisiveis = useMemo(() => {
    const base = tab === 'favoritos'
      ? categorias.map((c) => ({ ...c, itens: c.itens.filter((i) => favoritos.has(String(i.id)) && filtroBusca(i)) }))
      : categorias.map((c) => ({ ...c, itens: c.itens.filter(filtroBusca) }));
    const porTribunal = tribunalFiltro === 'todos'
      ? base
      : base.filter((c) => c.tribunal === tribunalFiltro);
    return porTribunal.filter((c) => c.itens.length > 0);
  }, [categorias, tab, favoritos, busca, tribunalFiltro]);

  const isUnsupported = leiInfo?.corpus_lei_id === -1;
  const artigoNumero = numeroArtigo ? decodeURIComponent(numeroArtigo) : '';
  const leiNomeBusca = leiInfo?.nome_exibicao || slugLei || '';
  const buildBuscaExterna = (base: 'stf' | 'stj') => {
    const q = `"art. ${artigoNumero}" ${leiNomeBusca}`.trim();
    if (base === 'stf') {
      return `https://jurisprudencia.stf.jus.br/pages/search?base=acordaos&sinonimo=true&plural=true&page=1&pageSize=10&queryString=${encodeURIComponent(q)}&sort=_score&sortBy=desc`;
    }
    return `https://scon.stj.jus.br/SCON/pesquisar.jsp?b=ACOR&livre=${encodeURIComponent(q)}`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GeracaoAnimacaoOverlay
        open={descobrindo}
        titulo="Localizando jurisprudência"
        steps={OVERLAY_STEPS}
        stepIdx={stepIdx}
        estTotalSec={12}
        onCancel={() => { setDescobrindo(false); handleBack(); }}
      />
      <PageHeader
        title="Jurisprudência"
        subtitle={leiInfo ? `${prettyLeiName(leiInfo.nome_exibicao)} — ${numeroLabel}` : numeroLabel}
        onBack={handleBack}
        rightAction={
          <Button variant="ghost" size="icon" onClick={() => carregar(true)} disabled={refreshing} title="Atualizar cache">
            {refreshing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
          </Button>
        }
      />

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 pb-24 pt-4">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Consultando Corpus927…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : isUnsupported ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <Scale className="w-5 h-5 text-primary" />
                <span className="font-semibold text-foreground">
                  {leiInfo?.nome_exibicao} — {numeroLabel}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                A jurisprudência da Constituição Federal (e de algumas leis) não é indexada pelo
                Corpus927. Consulte diretamente os portais oficiais do STF e STJ para este artigo:
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <a
                  href={buildBuscaExterna('stf')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between gap-3 rounded-xl border p-4 transition-colors ${tribunalClasses('STF')} hover:opacity-90`}
                >
                  <div>
                    <div className="font-bold text-base">STF</div>
                    <div className="text-xs opacity-80">Buscar acórdãos sobre este artigo</div>
                  </div>
                  <ExternalLink className="w-5 h-5" />
                </a>
                <a
                  href={buildBuscaExterna('stj')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between gap-3 rounded-xl border p-4 transition-colors ${tribunalClasses('STJ')} hover:opacity-90`}
                >
                  <div>
                    <div className="font-bold text-base">STJ</div>
                    <div className="text-xs opacity-80">Buscar acórdãos sobre este artigo</div>
                  </div>
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Resumo */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Scale className="w-4 h-4 text-primary" />
                <span>
                  <strong className="text-foreground font-semibold">{totalItens}</strong>{' '}
                  {totalItens === 1 ? 'resultado' : 'resultados'}
                </span>
                {revalidating && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/80">
                    <Loader2 className="w-3 h-3 animate-spin" /> atualizando
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" /> {favoritos.size}
              </div>
            </div>

            {/* Segmented control único: Todos · STF · STJ · ♥ */}
            {(tribunaisDisponiveis.length > 0 || favoritos.size > 0) && (
              <div className="mb-3 flex items-center gap-1.5 p-1 rounded-full bg-muted/60 border border-border/60 overflow-x-auto no-scrollbar">
                {(() => {
                  const isFavActive = tab === 'favoritos';
                  const isTodos = !isFavActive && tribunalFiltro === 'todos';
                  const setSeg = (kind: 'todos' | 'trib' | 'fav', trib?: string) => {
                    if (kind === 'fav') { setTab('favoritos'); return; }
                    setTab('todos');
                    setTribunalFiltro(kind === 'todos' ? 'todos' : trib!);
                  };
                  const base = 'h-9 px-3.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors flex items-center gap-1.5';
                  return (
                    <>
                      <button
                        onClick={() => setSeg('todos')}
                        className={`${base} ${isTodos ? 'bg-hero-yellow text-black shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        Todos <span className="opacity-70">· {totalItens}</span>
                      </button>
                      {tribunaisDisponiveis.map(({ tribunal, count }) => {
                        const active = !isFavActive && tribunalFiltro === tribunal;
                        return (
                          <button
                            key={tribunal}
                            onClick={() => setSeg('trib', tribunal)}
                            className={`${base} ${active ? tribunalClasses(tribunal, true) + ' shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                          >
                            {tribunal} <span className="opacity-70">· {count}</span>
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setSeg('fav')}
                        className={`${base} ${isFavActive ? 'bg-hero-yellow text-black shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        aria-label="Favoritos"
                      >
                        <Heart className={`w-3.5 h-3.5 ${isFavActive ? 'fill-current' : ''}`} />
                        {favoritos.size}
                      </button>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Search compacta */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  value={voice.listening && voice.partial ? voice.partial : busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por ementa, processo…"
                  className="w-full h-11 pl-10 pr-3 rounded-full bg-muted/60 border border-border/60 text-sm outline-none focus:ring-2 focus:ring-[#EFE039]/50 focus:border-transparent placeholder:text-muted-foreground/70"
                  aria-label="Buscar jurisprudência"
                />
              </div>
              <button
                type="button"
                onClick={voice.toggle}
                aria-label={voice.listening ? 'Parar gravação' : 'Buscar por voz'}
                className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  voice.listening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-hero-yellow text-black'
                }`}
              >
                {voice.listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>

            {/* Lista agrupada por tribunal */}
            {categoriasVisiveis.length === 0 ? (
              <div className="text-center py-16">
                <Scale className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {tab === 'favoritos' ? 'Nenhum favorito ainda.' : 'Nenhuma jurisprudência encontrada para este artigo.'}
                </p>
              </div>
            ) : (() => {
              const grupos = new Map<string, typeof categoriasVisiveis>();
              categoriasVisiveis.forEach((c) => {
                const arr = grupos.get(c.tribunal) || [];
                arr.push(c);
                grupos.set(c.tribunal, arr);
              });
              const ordem = ['STF', 'STJ'];
              const chaves = Array.from(grupos.keys()).sort(
                (a, b) => (ordem.indexOf(a) + 999) % 999 - (ordem.indexOf(b) + 999) % 999
              );
              return (
                <div className="space-y-5">
                  {chaves.map((trib) => {
                    const items = grupos.get(trib)!;
                    const totalTrib = items.reduce((acc, c) => acc + c.itens.length, 0);
                    return (
                      <section key={trib}>
                        <div className="flex items-center gap-2 mb-2 px-1">
                          <span className={`inline-flex items-center h-5 px-2 rounded-md border text-[10px] font-bold tracking-wider ${tribunalClasses(trib)}`}>
                            {trib}
                          </span>
                          <div className="h-px flex-1 bg-border/50" />
                          <span className="text-[11px] text-muted-foreground font-medium">
                            {totalTrib} {totalTrib === 1 ? 'item' : 'itens'}
                          </span>
                        </div>
                        <ul className="space-y-2">
                          {items.map((cat) => {
                            const preview = cat.itens
                              .map((i) => (i.titulo || '').trim())
                              .filter(Boolean)
                              .slice(0, 4)
                              .join(' · ');
                            return (
                              <li key={cat.codigo}>
                                <button
                                  onClick={() => setCatAberta(cat)}
                                  className="w-full text-left rounded-2xl border border-border/60 bg-card hover:bg-card/80 hover:border-border transition-all p-3.5 flex items-center gap-3 active:scale-[0.99]"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="font-body text-[15px] font-semibold text-foreground leading-snug line-clamp-1">
                                      {cat.label}
                                    </div>
                                    {preview && (
                                      <div className="text-[12px] text-muted-foreground line-clamp-1 mt-0.5">
                                        {preview}
                                      </div>
                                    )}
                                  </div>
                                  <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 rounded-full bg-hero-yellow text-[11px] font-bold text-black shrink-0">
                                    {cat.itens.length}
                                  </span>
                                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* Sheet: itens de uma categoria */}
      <Sheet open={!!catAberta} onOpenChange={(o) => !o && setCatAberta(null)}>
        <SheetContent
          side="bottom"
          className="h-[90dvh] p-0 rounded-t-3xl flex flex-col overflow-hidden [&>button.absolute]:hidden"
        >
          {catAberta && (
            <>
              <SheetHeader className="px-5 sm:px-6 pt-4 pb-4 border-b border-border/60 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-flex items-center h-6 px-2 rounded-md border text-xs font-semibold ${tribunalClasses(catAberta.tribunal)}`}>
                        {catAberta.tribunal}
                      </span>
                      <Badge variant="secondary" className="text-xs font-medium h-6 px-2">
                        {catAberta.itens.length} {catAberta.itens.length === 1 ? 'item' : 'itens'}
                      </Badge>
                    </div>
                    <SheetTitle className="text-xl sm:text-2xl font-heading mt-3 leading-tight tracking-tight">
                      {catAberta.label}
                    </SheetTitle>
                  </div>
                  <SheetClose
                    aria-label="Fechar"
                    className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center bg-muted hover:bg-muted/70 text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <X className="w-5 h-5" />
                  </SheetClose>
                </div>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 space-y-3">
                  {catAberta.itens.map((item) => {
                    const key = String(item.id);
                    const isFav = favoritos.has(key);
                    const tese = item.tese || (item.teses && item.teses[0]) || '';
                    const ementa = item.ementa || item.conteudo || '';
                    const descricao =
                      item.descricao ||
                      (item.teses && item.teses.length > 1 ? item.teses[1] : '') ||
                      '';
                    return (
                      <div key={key} className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                              {item.titulo && (
                                <div className="font-heading text-base sm:text-lg font-semibold text-foreground leading-snug">
                                  {item.titulo}
                                </div>
                              )}
                              {item.situacao && (
                                <span className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                  {item.situacao}
                                </span>
                              )}
                            </div>
                            {item.numero_processo && (
                              <div className="text-xs sm:text-sm text-muted-foreground font-mono">
                                {item.numero_processo}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => toggleFav(catAberta, item)}
                            className={`shrink-0 w-11 h-11 flex items-center justify-center rounded-full ${isFav ? 'text-red-500 bg-red-500/10' : 'text-muted-foreground hover:text-red-500 hover:bg-muted'}`}
                            aria-label={isFav ? 'Remover favorito' : 'Favoritar'}
                          >
                            <Heart className="w-5 h-5" fill={isFav ? 'currentColor' : 'none'} />
                          </button>
                        </div>
                        {descricao && (
                          <p className="text-sm sm:text-[15px] text-foreground/85 leading-relaxed mb-3">
                            {descricao}
                          </p>
                        )}
                        <div className="grid grid-cols-3 gap-2">
                          {tese && (
                            <Button
                              size="sm"
                              className="h-11 gap-1.5 px-2 w-full rounded-full text-xs sm:text-sm font-medium bg-hero-yellow hover:opacity-90"
                              onClick={() => setDetalhe({ item, cat: catAberta, mode: 'tese' })}
                            >
                              <Scale className="w-4 h-4 shrink-0" /> <span className="truncate">Ver tese</span>
                            </Button>
                          )}
                          {ementa && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-11 gap-1.5 px-2 w-full rounded-full text-xs sm:text-sm font-medium"
                              onClick={() => setDetalhe({ item, cat: catAberta, mode: 'ementa' })}
                            >
                              <FileText className="w-4 h-4 shrink-0" /> <span className="truncate">Ver ementa</span>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-11 gap-1.5 px-2 w-full rounded-full text-xs sm:text-sm font-medium border border-border/60"
                            onClick={() => {
                              const txt = [
                                item.titulo,
                                item.situacao,
                                item.numero_processo,
                                descricao,
                                tese && `TESE:\n${tese}`,
                                ementa && `EMENTA:\n${ementa}`,
                              ].filter(Boolean).join('\n\n');
                              navigator.clipboard.writeText(txt);
                              toast.success('Copiado');
                            }}
                          >
                            <Copy className="w-4 h-4 shrink-0" /> <span className="truncate">Copiar</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={!!detalhe} onOpenChange={(o) => { if (!o) { setDetalhe(null); setExplicacao(null); setExplicandoLoading(false); } }}>
        <SheetContent
          side="bottom"
          className="h-[90dvh] p-0 rounded-t-3xl flex flex-col overflow-hidden [&>button.absolute]:hidden"
        >
          {(() => {
            if (!detalhe) return null;
            const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
            const mode = detalhe.mode || 'ambos';
            const teseStr =
              detalhe.item.tese ||
              (detalhe.item.teses && detalhe.item.teses[0]) ||
              '';
            const ementaStr = detalhe.item.ementa || detalhe.item.conteudo || '';
            const descricao =
              detalhe.item.descricao ||
              (detalhe.item.teses && detalhe.item.teses.length > 1 ? detalhe.item.teses[1] : '') ||
              '';
            const showTese = (mode === 'tese' || mode === 'ambos') && !!teseStr;
            const showEmenta =
              (mode === 'ementa' || mode === 'ambos') &&
              !!ementaStr &&
              norm(ementaStr).toLowerCase() !== norm(teseStr).toLowerCase();
            const sheetLabel =
              mode === 'tese' ? 'Tese' : mode === 'ementa' ? 'Ementa' : 'Inteiro teor';

            return (
              <>
                <SheetHeader className="px-5 sm:px-6 pt-4 pb-4 border-b border-border/60 text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`inline-flex items-center h-6 px-2 rounded-md border text-xs font-semibold ${tribunalClasses(detalhe.cat.tribunal)}`}>
                          {detalhe.cat.tribunal}
                        </span>
                        <Badge variant="secondary" className="text-xs font-medium h-6 px-2">{detalhe.cat.label}</Badge>
                        {detalhe.item.situacao && (
                          <span className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            {detalhe.item.situacao}
                          </span>
                        )}
                      </div>
                      <SheetTitle className="text-xl sm:text-2xl font-heading mt-3 leading-tight tracking-tight">
                        {detalhe.item.titulo ? `${detalhe.item.titulo} — ${sheetLabel}` : sheetLabel}
                      </SheetTitle>
                      {descricao && (
                        <p className="text-sm sm:text-[15px] text-foreground/80 leading-relaxed mt-2">
                          {descricao}
                        </p>
                      )}
                      {detalhe.item.numero_processo && (
                        <div className="text-xs sm:text-sm text-muted-foreground mt-1.5 font-mono">
                          {detalhe.item.numero_processo}
                        </div>
                      )}
                    </div>
                    <SheetClose
                      aria-label="Fechar"
                      className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center bg-muted hover:bg-muted/70 text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <X className="w-5 h-5" />
                    </SheetClose>
                  </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto">
                  <div className="max-w-2xl mx-auto px-5 py-6 space-y-6">
                    {showTese && (
                      <section className="space-y-3">
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                            Tese
                          </h3>
                          <div className="h-px flex-1 bg-border/60" />
                        </div>
                        <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                          <p className="text-[15px] leading-[1.65] text-foreground/90 whitespace-pre-line">
                            {teseStr}
                          </p>
                        </div>
                      </section>
                    )}

                    {showEmenta && (
                      <section className="space-y-3">
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                            Ementa
                          </h3>
                          <div className="h-px flex-1 bg-border/60" />
                        </div>
                        <p className="text-[15px] leading-[1.65] text-foreground/90 whitespace-pre-line">
                          {ementaStr}
                        </p>
                      </section>
                    )}

                    {!showTese && !showEmenta && (
                      <div className="text-sm text-muted-foreground text-center py-12">
                        Sem conteúdo detalhado disponível.
                      </div>
                    )}

                    {(explicandoLoading || explicacao) && (
                      <section className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Brain className="w-4 h-4 text-amber-500" />
                          <h3 className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-600 dark:text-amber-400">
                            Explicação da IA
                          </h3>
                          <div className="h-px flex-1 bg-amber-500/30" />
                        </div>
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                          {explicandoLoading && !explicacao ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                              <Loader2 className="w-4 h-4 animate-spin" /> A IA está preparando a explicação…
                            </div>
                          ) : (
                            <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-heading prose-headings:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90">
                              <ReactMarkdown>{explicacao || ''}</ReactMarkdown>
                            </div>
                          )}
                        </div>
                      </section>
                    )}
                  </div>
                </div>

                <div className="border-t border-border/60 p-3 flex flex-wrap gap-2 bg-background/95 backdrop-blur">
                  {detalhe.item.url_origem && (
                    <a href={detalhe.item.url_origem} target="_blank" rel="noreferrer" className="flex-1 min-w-[120px]">
                      <Button variant="outline" className="w-full h-11 gap-1.5">
                        <ExternalLink className="w-4 h-4" /> Abrir no site
                      </Button>
                    </a>
                  )}
                  <Button
                    variant="outline"
                    className="flex-1 min-w-[120px] h-11 gap-1.5"
                    onClick={async () => {
                      try {
                        toast.loading('Gerando PDF...', { id: 'juris-pdf' });
                        await gerarJurisprudenciaPDF({
                          tribunal: detalhe.cat.tribunal,
                          categoria: detalhe.cat.label,
                          situacao: detalhe.item.situacao,
                          titulo: detalhe.item.titulo || sheetLabel,
                          descricao,
                          numeroProcesso: detalhe.item.numero_processo,
                          tese: showTese ? teseStr : undefined,
                          ementa: showEmenta ? ementaStr : undefined,
                          urlOrigem: detalhe.item.url_origem,
                          leiLabel: leiInfo ? `${prettyLeiName(leiInfo.nome_exibicao)} — ${numeroLabel}` : undefined,
                          modo: mode,
                        });
                        toast.success('PDF baixado', { id: 'juris-pdf' });
                      } catch (e) {
                        console.error(e);
                        toast.error('Falha ao gerar PDF', { id: 'juris-pdf' });
                      }
                    }}
                  >
                    <Download className="w-4 h-4" /> Baixar PDF
                  </Button>
                  <Button
                    className="flex-1 min-w-[120px] h-11 gap-1.5 bg-amber-400 hover:bg-amber-500 text-amber-950 border-amber-500"
                    disabled={explicandoLoading}
                    onClick={async () => {
                      try {
                        setExplicandoLoading(true);
                        setExplicacao(null);
                        const { data, error } = await supabase.functions.invoke('jurisprudencia-explicar', {
                          body: {
                            titulo: detalhe.item.titulo,
                            categoria: detalhe.cat.label,
                            tribunal: detalhe.cat.tribunal,
                            numero_processo: detalhe.item.numero_processo,
                            situacao: detalhe.item.situacao,
                            tese: showTese ? teseStr : undefined,
                            ementa: showEmenta ? ementaStr : undefined,
                            descricao,
                            lei: leiInfo ? prettyLeiName(leiInfo.nome_exibicao) : undefined,
                            artigo: numeroLabel,
                          },
                        });
                        if (error) throw error;
                        if ((data as any)?.error) throw new Error((data as any).error);
                        setExplicacao((data as any)?.explicacao || 'Sem explicação disponível.');
                      } catch (e: any) {
                        console.error(e);
                        toast.error(e?.message || 'Falha ao gerar explicação');
                        setExplicacao(null);
                      } finally {
                        setExplicandoLoading(false);
                      }
                    }}
                  >
                    {explicandoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                    Explicar
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1 min-w-[120px] h-11 gap-1.5"
                    onClick={() => {
                      const txt = [
                        detalhe.item.titulo,
                        detalhe.item.situacao,
                        detalhe.item.numero_processo,
                        descricao,
                        showTese && teseStr ? `TESE:\n${teseStr}` : '',
                        showEmenta && ementaStr ? `EMENTA:\n${ementaStr}` : '',
                      ].filter(Boolean).join('\n\n');
                      navigator.clipboard.writeText(txt);
                      toast.success('Copiado');
                    }}
                  >
                    <Copy className="w-4 h-4" /> Copiar tudo
                  </Button>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
