import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Play, Pause, Loader2, Mic, RefreshCw, ListMusic, Trash2, Square, BookOpen, Star, Ban, RotateCcw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

type Voz = { id: string; descricao: string; genero: 'masculina' | 'feminina'; ativa: boolean; padrao: boolean };
type Livro = {
  livro_tabela: string; livro_id: string; titulo: string; autor: string | null;
  total_paginas: number; narradas: number; segundos_narrados: number;
};
type Pagina = {
  index: number; label: string; caracteres: number; preview_texto: string;
  narracao: { voz: string; audio_url: string | null; duracao_segundos: number | null } | null;
};

const TEXTO_PREVIA_PADRAO =
  'A lei não nasce pronta: ela é fruto de disputa, de tempo e de gente. — E quem decide o que vale? — perguntou o aprendiz. O velho jurista sorriu: — Decide quem sustenta o argumento até o fim.';

const fmtDur = (s?: number | null) => {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
};

const AdminNarracaoBiblioteca = () => {
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const filaAbortRef = useRef(false);

  const [vozes, setVozes] = useState<Voz[]>([]);
  const [vozBusy, setVozBusy] = useState<string | null>(null);
  const [estiloPadrao, setEstiloPadrao] = useState('');
  const [voz, setVoz] = useState('Charon');
  const [estilo, setEstilo] = useState('');
  const [textoPrevia, setTextoPrevia] = useState(TEXTO_PREVIA_PADRAO);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [livros, setLivros] = useState<Livro[]>([]);
  const [loadingLivros, setLoadingLivros] = useState(true);
  const [livroSel, setLivroSel] = useState<Livro | null>(null);

  const [paginas, setPaginas] = useState<Pagina[]>([]);
  const [loadingPaginas, setLoadingPaginas] = useState(false);
  const [narrando, setNarrando] = useState<number | null>(null);
  const [fila, setFila] = useState<{ ativo: boolean; feitas: number; total: number; atual: string | null }>({ ativo: false, feitas: 0, total: 0, atual: null });
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set());
  const [tocando, setTocando] = useState<string | null>(null);

  const call = useCallback(async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('blog-narrar-preview', { body: payload });
    if (error) throw new Error(error.message);
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const d = await call({ acao: 'vozes' });
        setVozes(d.vozes || []);
        if (d.voz_padrao) setVoz(d.voz_padrao);
        setEstiloPadrao(d.estilo_padrao || '');
        setEstilo(d.estilo_padrao || '');
      } catch (e) {
        toast.error(`Não foi possível carregar as vozes: ${(e as Error).message}`);
      }
    })();
  }, [call]);

  const atualizarVoz = useCallback(async (id: string, patch: { ativa?: boolean; padrao?: boolean }) => {
    setVozBusy(id);
    try {
      const d = await call({ acao: 'voz-config', voz: id, ...patch });
      setVozes(d.vozes || []);
      if (patch.padrao) {
        setVoz(id);
        toast.success(`${id} agora é a voz padrão`);
      }
      if (patch.ativa === false) {
        toast.success(`${id} desativada`);
        if (voz === id) {
          const proxima = (d.vozes || []).find((v: Voz) => v.ativa);
          if (proxima) setVoz(proxima.id);
        }
      }
      if (patch.ativa === true) toast.success(`${id} reativada`);
    } catch (e) {
      toast.error(`Não foi possível atualizar a voz: ${(e as Error).message}`);
    } finally {
      setVozBusy(null);
    }
  }, [call, voz]);

  const carregarLivros = useCallback(async () => {
    setLoadingLivros(true);
    try {
      const d = await call({ acao: 'livros' });
      setLivros(d.livros || []);
    } catch (e) {
      toast.error(`Erro ao carregar livros: ${(e as Error).message}`);
    } finally {
      setLoadingLivros(false);
    }
  }, [call]);

  useEffect(() => { carregarLivros(); }, [carregarLivros]);

  const carregarPaginas = useCallback(async (livro: Livro) => {
    setLoadingPaginas(true);
    try {
      const d = await call({ acao: 'paginas', livro_tabela: livro.livro_tabela, livro_id: livro.livro_id });
      setPaginas(d.paginas || []);
    } catch (e) {
      toast.error(`Erro ao carregar páginas: ${(e as Error).message}`);
      setPaginas([]);
    } finally {
      setLoadingPaginas(false);
    }
  }, [call]);

  const selecionarLivro = (livro: Livro) => {
    setLivroSel(livro);
    setPaginas([]);
    carregarPaginas(livro);
  };

  const tocar = (url: string) => {
    if (!audioRef.current) audioRef.current = new Audio();
    const a = audioRef.current;
    if (tocando === url) { a.pause(); setTocando(null); return; }
    a.src = url;
    a.play().catch(() => toast.error('Não foi possível reproduzir o áudio'));
    setTocando(url);
    a.onended = () => setTocando(null);
  };

  const gerarPrevia = async () => {
    if (textoPrevia.trim().length < 3) { toast.error('Escreva um parágrafo para a prévia'); return; }
    setPreviewLoading(true);
    try {
      const d = await call({ acao: 'preview', texto: textoPrevia.trim(), voz, estilo });
      toast.success(d.cache ? 'Prévia recuperada do Supabase' : 'Prévia gerada e salva');
      if (d.audio_url) tocar(d.audio_url);
    } catch (e) {
      toast.error(`Erro na prévia: ${(e as Error).message}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  const narrarPagina = async (index: number, forcar = false) => {
    if (!livroSel) return;
    setNarrando(index);
    try {
      const d = await call({
        acao: 'narrar-pagina', livro_tabela: livroSel.livro_tabela, livro_id: livroSel.livro_id,
        pagina_index: index, voz, estilo, forcar,
      });
      setPaginas((prev) => prev.map((p) => p.index === index
        ? { ...p, narracao: { voz, audio_url: d.audio_url, duracao_segundos: d.duracao_segundos } }
        : p));
      return true;
    } catch (e) {
      toast.error(`Página ${index + 1}: ${(e as Error).message}`);
      return false;
    } finally {
      setNarrando(null);
    }
  };

  const pendentes = useMemo(() => paginas.filter((p) => !p.narracao?.audio_url), [paginas]);

  const narrarFila = async (lista: Pagina[], forcar = false) => {
    if (!livroSel || !lista.length) return;
    filaAbortRef.current = false;
    setFila({ ativo: true, feitas: 0, total: lista.length, atual: lista[0].label });
    let feitas = 0;
    let erro = false;
    // Processa uma página por vez (sequencial), nunca em paralelo.
    for (const p of lista) {
      if (filaAbortRef.current) break;
      setFila((f) => ({ ...f, atual: p.label }));
       
      const ok = await narrarPagina(p.index, forcar && !!p.narracao?.audio_url);
      feitas += 1;
      setFila((f) => ({ ...f, feitas }));
      if (!ok) { erro = true; break; }
    }
    const abortada = filaAbortRef.current;
    setFila({ ativo: false, feitas: 0, total: 0, atual: null });
    setSelecionadas(new Set());
    if (abortada) toast.info(`Fila interrompida em ${feitas}/${lista.length}`);
    else if (erro) toast.error(`Fila parada por erro em ${feitas}/${lista.length}`);
    else toast.success(`Fila concluída · ${lista.length} páginas narradas`);
    carregarLivros();
  };

  const toggleSelecao = (index: number) => {
    setSelecionadas((prev) => {
      const n = new Set(prev);
      if (n.has(index)) n.delete(index); else n.add(index);
      return n;
    });
  };

  const filaPct = fila.total ? Math.round((fila.feitas / fila.total) * 100) : 0;

  const apagar = async (index: number) => {
    if (!livroSel) return;
    try {
      await call({ acao: 'apagar-pagina', livro_tabela: livroSel.livro_tabela, livro_id: livroSel.livro_id, pagina_index: index });
      setPaginas((prev) => prev.map((p) => p.index === index ? { ...p, narracao: null } : p));
      toast.success('Narração removida');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="min-h-dvh bg-background pb-28">
      <PageHeader
        title="Narração · Biblioteca"
        subtitle="Vozes, prévia e narração por página"
        onBack={() => navigate('/admin-narracao')}
      />

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Vozes */}
        <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-primary" />
              <h2 className="font-heading font-bold text-sm uppercase tracking-wide">Voz do narrador</h2>
            </div>
            {vozes.some((v) => !v.ativa) && (
              <span className="text-[11px] font-semibold text-destructive">
                {vozes.filter((v) => !v.ativa).length} desativada(s)
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {vozes.map((v) => (
              <div
                key={v.id}
                className={`rounded-xl border p-2.5 transition-colors ${
                  !v.ativa
                    ? 'border-destructive/60 bg-destructive/10'
                    : voz === v.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background hover:border-primary/40'
                }`}
              >
                <button
                  onClick={() => v.ativa && setVoz(v.id)}
                  disabled={!v.ativa}
                  className="block w-full text-left disabled:cursor-default"
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`text-sm font-semibold font-body ${!v.ativa ? 'text-destructive line-through' : ''}`}>{v.id}</span>
                    {v.padrao && v.ativa && <Star className="w-3 h-3 text-primary fill-primary" />}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-1">
                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      !v.ativa ? 'bg-destructive/20 text-destructive' : 'bg-primary/15 text-primary'
                    }`}>
                      {v.genero === 'feminina' ? 'Feminina' : 'Masculina'}
                    </span>
                    {!v.ativa && (
                      <span className="inline-flex items-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-destructive-foreground">
                        Desativada
                      </span>
                    )}
                  </span>
                  <span className={`block text-[11px] leading-tight mt-1 ${!v.ativa ? 'text-destructive/70' : 'text-muted-foreground'}`}>{v.descricao}</span>
                </button>
                <div className="mt-2 flex items-center gap-1">
                  {v.ativa ? (
                    <>
                      <button
                        onClick={() => atualizarVoz(v.id, { padrao: true })}
                        disabled={vozBusy === v.id || v.padrao}
                        className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-border py-1 text-[10px] font-semibold disabled:opacity-50"
                      >
                        {vozBusy === v.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />}
                        {v.padrao ? 'Padrão' : 'Definir padrão'}
                      </button>
                      <button
                        onClick={() => atualizarVoz(v.id, { ativa: false })}
                        disabled={vozBusy === v.id}
                        title="Desativar voz"
                        className="inline-flex items-center justify-center rounded-lg border border-border p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-50"
                      >
                        <Ban className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => atualizarVoz(v.id, { ativa: true })}
                      disabled={vozBusy === v.id}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-destructive/50 py-1 text-[10px] font-semibold text-destructive disabled:opacity-50"
                    >
                      {vozBusy === v.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                      Reativar
                    </button>
                  )}
                </div>
              </div>
            ))}
            {!vozes.length && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        </section>

        {/* Prévia */}
        <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <h2 className="font-heading font-bold text-sm uppercase tracking-wide">Prévia da voz</h2>
          <p className="text-xs text-muted-foreground font-body">
            Cole um parágrafo curto para ouvir como {voz} vai narrar. A prévia fica salva no Supabase e é
            reaproveitada quando você repetir o mesmo texto.
          </p>
          <Textarea
            value={textoPrevia}
            onChange={(e) => setTextoPrevia(e.target.value.slice(0, 1500))}
            rows={4}
            className="text-sm"
            placeholder="Parágrafo para a prévia..."
          />
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer font-body">Direção de narração (prompt)</summary>
            <Textarea
              value={estilo}
              onChange={(e) => setEstilo(e.target.value)}
              rows={5}
              className="mt-2 text-xs"
            />
            <button className="mt-2 underline" onClick={() => setEstilo(estiloPadrao)}>Restaurar padrão</button>
          </details>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={gerarPrevia} disabled={previewLoading}>
              {previewLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
              Ouvir prévia
            </Button>
            <span className="text-xs text-muted-foreground">{textoPrevia.length}/1500</span>
          </div>
        </section>

        {/* Livros */}
        <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <h2 className="font-heading font-bold text-sm uppercase tracking-wide">Livro da Leitura Nativa</h2>
            </div>
            <Button size="sm" variant="ghost" onClick={carregarLivros}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          {loadingLivros ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : livros.length === 0 ? (
            <p className="text-sm text-muted-foreground font-body">Nenhum livro com Leitura Nativa processada ainda.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {livros.map((l) => (
                <button
                  key={`${l.livro_tabela}:${l.livro_id}`}
                  onClick={() => selecionarLivro(l)}
                  className={`w-full text-left rounded-xl border p-3 transition-colors ${
                    livroSel?.livro_id === l.livro_id && livroSel?.livro_tabela === l.livro_tabela
                      ? 'border-primary bg-primary/10' : 'border-border bg-background hover:border-primary/40'
                  }`}
                >
                  <span className="block text-sm font-semibold font-body line-clamp-1">{l.titulo}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {l.autor ? `${l.autor} · ` : ''}{l.total_paginas} páginas · {l.narradas} narradas
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Páginas */}
        {livroSel && (
          <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <ListMusic className="w-4 h-4 text-primary shrink-0" />
                <h2 className="font-heading font-bold text-sm uppercase tracking-wide truncate">{livroSel.titulo}</h2>
              </div>
              {fila.ativo ? (
                <Button size="sm" variant="destructive" onClick={() => { filaAbortRef.current = true; }}>
                  <Square className="w-4 h-4 mr-1" /> Parar ({fila.feitas}/{fila.total})
                </Button>
              ) : selecionadas.size > 0 ? (
                <Button
                  size="sm"
                  onClick={() => narrarFila(paginas.filter((p) => selecionadas.has(p.index)), true)}
                  disabled={loadingPaginas}
                >
                  <ListMusic className="w-4 h-4 mr-1" /> Narrar selecionadas ({selecionadas.size})
                </Button>
              ) : (
                <Button size="sm" onClick={() => narrarFila(pendentes)} disabled={!pendentes.length || loadingPaginas}>
                  <ListMusic className="w-4 h-4 mr-1" /> Narrar tudo ({pendentes.length})
                </Button>
              )}
            </div>

            {fila.ativo && (
              <div className="rounded-xl border border-primary/40 bg-primary/5 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-body">
                  <span className="truncate text-foreground font-semibold">
                    Narrando {fila.atual || '…'} · {fila.feitas}/{fila.total}
                  </span>
                  <span className="text-primary font-bold shrink-0 ml-2">{filaPct}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${filaPct}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Faltam {Math.max(fila.total - fila.feitas, 0)} páginas · uma de cada vez.
                </p>
              </div>
            )}

            {!fila.ativo && paginas.length > 0 && (
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <button
                  className="underline hover:text-foreground"
                  onClick={() => setSelecionadas(new Set(paginas.map((p) => p.index)))}
                >
                  Selecionar todas
                </button>
                {selecionadas.size > 0 && (
                  <button className="underline hover:text-foreground" onClick={() => setSelecionadas(new Set())}>
                    Limpar seleção
                  </button>
                )}
              </div>
            )}

            {loadingPaginas ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : (
              <div className="space-y-2">
                {paginas.map((p) => {
                  const url = p.narracao?.audio_url || null;
                  const busy = narrando === p.index;
                  return (
                    <div
                      key={p.index}
                      className={`rounded-xl border bg-background p-3 ${
                        selecionadas.has(p.index) ? 'border-primary' : 'border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selecionadas.has(p.index)}
                            onChange={() => toggleSelecao(p.index)}
                            disabled={fila.ativo}
                            className="w-4 h-4 accent-[hsl(var(--primary))] shrink-0"
                            aria-label={`Selecionar ${p.label}`}
                          />
                          <div className="min-w-0">
                          <p className="text-sm font-semibold font-body">{p.label}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {p.caracteres} caracteres
                            {p.narracao ? ` · ${p.narracao.voz} · ${fmtDur(p.narracao.duracao_segundos)}` : ' · sem narração'}
                          </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {url && (
                            <Button size="sm" variant="ghost" onClick={() => tocar(url)}>
                              {tocando === url ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </Button>
                          )}
                          <Button size="sm" variant={url ? 'ghost' : 'default'} onClick={() => narrarPagina(p.index, !!url)} disabled={busy || fila.ativo}>
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                            <span className="ml-1 text-xs">{url ? 'Refazer' : 'Narrar'}</span>
                          </Button>
                          {url && (
                            <Button size="sm" variant="ghost" onClick={() => apagar(p.index)} disabled={fila.ativo}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground line-clamp-2 font-body">{p.preview_texto}</p>
                    </div>
                  );
                })}
                {!paginas.length && <p className="text-sm text-muted-foreground font-body">Este livro não tem páginas com texto útil.</p>}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default AdminNarracaoBiblioteca;
