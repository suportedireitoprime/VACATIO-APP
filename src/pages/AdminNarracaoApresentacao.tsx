import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Presentation, Upload, Loader2, Trash2, Play, Search, Eye, EyeOff, Check, Mic, FileText, Star } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { supabase } from '@/integrations/supabase/client';
import {
  iniciarApresJob, subscribeApresJob, pararApresJob, limparApresJob,
  etaSegundos, formatarEta, type ApresJobEstado,
} from '@/lib/apresentacaoJob';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

type Livro = {
  livro_tabela: string; livro_id: string; titulo: string; autor: string | null;
  categoria: string;
  apresentacao_id: string | null; total_slides: number; publicada: boolean;
};

const FAV_KEY = 'admin:apresentacao:favoritos';
const lerFavoritos = (): string[] => {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; }
};

// Cache local da listagem: a tela abre já com os livros prontos e só
// revalida no Supabase em segundo plano.
const LIVROS_KEY = 'admin:apresentacao:livros:v1';
const CAT_KEY = 'admin:apresentacao:categoria';
const VOZES_KEY = 'admin:apresentacao:vozes:v1';
const lerCache = <T,>(k: string): T | null => {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
};
const salvarCache = (k: string, v: unknown) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ }
};

type Voz = { id: string; genero: string; descricao: string; ativa?: boolean; padrao?: boolean };
type SlidePreparado = { b64: string; texto: string; thumb: string };

const call = async (payload: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke('blog-narrar-preview', { body: payload });
  if (error) throw new Error(error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
};

const AdminNarracaoApresentacao = () => {
  const navigate = useNavigate();
  const [livros, setLivros] = useState<Livro[]>(() => lerCache<Livro[]>(LIVROS_KEY) ?? []);
  const [vozes, setVozes] = useState<Voz[]>(() => lerCache<Voz[]>(VOZES_KEY) ?? []);
  const [voz, setVoz] = useState(() => {
    const c = lerCache<Voz[]>(VOZES_KEY) ?? [];
    return c.find((x) => x.padrao)?.id ?? c[0]?.id ?? 'Charon';
  });
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState<string>(() => localStorage.getItem(CAT_KEY) || '');
  const [favoritos, setFavoritos] = useState<string[]>(() => lerFavoritos());
  const [sel, setSel] = useState<Livro | null>(null);
  const [carregando, setCarregando] = useState(() => (lerCache<Livro[]>(LIVROS_KEY) ?? []).length === 0);
  const [lendoPdf, setLendoPdf] = useState<{ feitos: number; total: number } | null>(null);
  const [slides, setSlides] = useState<SlidePreparado[]>([]);
  const [nomePdf, setNomePdf] = useState('');
  const [job, setJob] = useState<ApresJobEstado | null>(null);
  const [tick, setTick] = useState(0);
  const [faltantes, setFaltantes] = useState<{ apresentacao_id: string; total: number; prontos: number; indices: number[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => subscribeApresJob(setJob), []);

  // Atualiza o tempo estimado a cada segundo enquanto a fila roda.
  useEffect(() => {
    if (!job?.ativo) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [job?.ativo]);

  useEffect(() => {
    (async () => {
      try {
        const [v, l] = await Promise.all([call({ acao: 'vozes' }), call({ acao: 'apres-livros' })]);
        const lista: Voz[] = (v.vozes ?? []).filter((x: Voz) => x.ativa !== false);
        setVozes(lista);
        salvarCache(VOZES_KEY, lista);
        setVoz((atual) => (lista.some((x) => x.id === atual) ? atual : lista.find((x) => x.padrao)?.id ?? lista[0]?.id ?? 'Charon'));
        setLivros(l.livros ?? []);
        salvarCache(LIVROS_KEY, l.livros ?? []);
      } catch (e) {
        if (!livros.length) toast.error(e instanceof Error ? e.message : 'Erro ao carregar');
      } finally {
        setCarregando(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categorias = useMemo(() => {
    const set = new Map<string, number>();
    for (const l of livros) set.set(l.categoria, (set.get(l.categoria) ?? 0) + 1);
    return Array.from(set.entries()).sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
  }, [livros]);

  const chaveFav = (l: Livro) => `${l.livro_tabela}:${l.livro_id}`;

  // Nunca mostra tudo junto: sempre há uma categoria ativa.
  useEffect(() => {
    if (!categorias.length) return;
    const validas = ['favoritos', ...categorias.map(([c]) => c)];
    if (!categoria || !validas.includes(categoria)) {
      const inicial = favoritos.length ? 'favoritos' : categorias[0][0];
      setCategoria(inicial);
      localStorage.setItem(CAT_KEY, inicial);
    }
  }, [categorias, categoria, favoritos.length]);

  const alternarFavorito = (l: Livro) => {
    const k = chaveFav(l);
    setFavoritos((prev) => {
      const novo = prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k];
      localStorage.setItem(FAV_KEY, JSON.stringify(novo));
      return novo;
    });
  };

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    let base = livros;
    if (categoria === 'favoritos') base = base.filter((l) => favoritos.includes(`${l.livro_tabela}:${l.livro_id}`));
    else if (categoria) base = base.filter((l) => l.categoria === categoria);
    // Na busca, procura em todo o acervo (não só na categoria ativa).
    if (q) base = livros.filter((l) => l.titulo.toLowerCase().includes(q) || (l.autor ?? '').toLowerCase().includes(q));
    // favoritos primeiro
    return [...base].sort((a, b) => {
      const fa = favoritos.includes(`${a.livro_tabela}:${a.livro_id}`) ? 0 : 1;
      const fb = favoritos.includes(`${b.livro_tabela}:${b.livro_id}`) ? 0 : 1;
      return fa - fb || a.titulo.localeCompare(b.titulo, 'pt-BR');
    });
  }, [livros, busca, categoria, favoritos]);

  const limparPdf = () => { setSlides([]); setNomePdf(''); };

  // Ao escolher um livro que já tem apresentação, verifica se ficou incompleta.
  useEffect(() => {
    setFaltantes(null);
    if (!sel?.apresentacao_id) return;
    let cancel = false;
    (async () => {
      try {
        const r = await call({ acao: 'apres-faltantes', apresentacao_id: sel.apresentacao_id });
        if (cancel) return;
        if ((r.faltantes ?? []).length) {
          setFaltantes({
            apresentacao_id: sel.apresentacao_id!,
            total: r.total_slides ?? 0,
            prontos: r.prontos ?? 0,
            indices: r.faltantes as number[],
          });
        }
      } catch { /* silencioso */ }
    })();
    return () => { cancel = true; };
  }, [sel?.apresentacao_id, job?.concluido]);

  // Etapa 1 — ler o PDF localmente (nada é gerado ainda)
  const lerPdf = async (file: File) => {
    setSlides([]);
    setNomePdf(file.name);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      const total = pdf.numPages;
      setLendoPdf({ feitos: 0, total });
      const preparados: SlidePreparado[] = [];
      for (let i = 1; i <= total; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.6 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
        const dataUrl = canvas.toDataURL('image/png');
        const content = await page.getTextContent();
        const texto = (content.items as any[]).map((it) => it.str).join(' ').replace(/\s+/g, ' ').trim();
        preparados.push({ b64: dataUrl.split(',')[1], texto, thumb: dataUrl });
        setLendoPdf({ feitos: i, total });
      }
      setSlides(preparados);
      toast.success(`${preparados.length} slides prontos. Agora escolha a voz.`);
    } catch (e) {
      limparPdf();
      toast.error(e instanceof Error ? e.message : 'Erro ao ler o PDF');
    } finally {
      setLendoPdf(null);
    }
  };

  // Etapa 3 — play: gera roteiro + narração de cada slide, em fila
  const gerarNarracao = async () => {
    if (!sel || !slides.length) return;
    const alvo = sel;
    // Retomada: mesmo PDF de uma apresentação incompleta → gera só o que falta.
    const retomar = faltantes && faltantes.total === slides.length ? faltantes : null;
    toast.info(retomar
      ? `Gerando os ${retomar.indices.length} slides que faltavam…`
      : 'Geração iniciada — continua rodando mesmo se você sair da tela.');
    await iniciarApresJob({
      livroTabela: alvo.livro_tabela, livroId: alvo.livro_id,
      titulo: alvo.titulo, voz, slides,
      apresentacaoExistente: retomar?.apresentacao_id ?? null,
      apenasIndices: retomar?.indices ?? null,
    });
  };

  // Ao concluir, atualiza a lista e libera o formulário.
  useEffect(() => {
    if (!job || job.ativo || !job.concluido || !job.apresentacaoId) return;
    setLivros((prev) => prev.map((l) =>
      l.livro_id === job.livroId && l.livro_tabela === job.livroTabela
        ? { ...l, apresentacao_id: job.apresentacaoId, publicada: job.falhas.length === 0 }
        : l));
    limparPdf();
  }, [job?.concluido, job?.ativo]);

  const excluir = async (l: Livro) => {
    if (!l.apresentacao_id) return;
    try {
      await call({ acao: 'apres-excluir', apresentacao_id: l.apresentacao_id });
      setLivros((prev) => prev.map((x) => x === l ? { ...x, apresentacao_id: null, total_slides: 0, publicada: false } : x));
      toast.success('Apresentação removida');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro'); }
  };

  const alternarPublicacao = async (l: Livro) => {
    if (!l.apresentacao_id) return;
    try {
      await call({ acao: 'apres-publicar', apresentacao_id: l.apresentacao_id, publicada: !l.publicada });
      setLivros((prev) => prev.map((x) => x === l ? { ...x, publicada: !l.publicada } : x));
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro'); }
  };

  const progresso = job && (job.ativo || job.concluido) ? { feitos: job.feitos, total: job.total } : null;
  const pct = progresso ? Math.round((progresso.feitos / Math.max(progresso.total, 1)) * 100) : 0;
  const eta = job?.ativo ? formatarEta(etaSegundos(job)) : null;
  const pctPdf = lendoPdf ? Math.round((lendoPdf.feitos / Math.max(lendoPdf.total, 1)) * 100) : 0;
  const ocupado = !!job?.ativo || !!lendoPdf;

  const Passo = ({ n, titulo, ok, ativo }: { n: number; titulo: string; ok?: boolean; ativo?: boolean }) => (
    <div className="flex items-center gap-2">
      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${ok ? 'bg-primary text-primary-foreground' : ativo ? 'border border-primary text-primary' : 'border border-border text-muted-foreground'}`}>
        {ok ? <Check className="w-3.5 h-3.5" /> : n}
      </span>
      <span className={`font-heading text-sm font-bold ${ativo || ok ? '' : 'text-muted-foreground'}`}>{titulo}</span>
    </div>
  );

  return (
    <div className="min-h-dvh bg-background pb-28">
      <PageHeader title="Apresentação Narrada" subtitle="PDF → voz → narração" onBack={() => navigate('/admin-narracao')} />

      {(job || lendoPdf) && (
        <div className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border p-3">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between text-xs font-body mb-2">
              <span>
                {lendoPdf
                  ? `Lendo slides do PDF… ${lendoPdf.feitos}/${lendoPdf.total}`
                  : `${job!.ultimaMensagem} ${job!.feitos}/${job!.total} · ${pct}%`}
              </span>
              {job?.ativo && (
                <button onClick={pararApresJob} className="text-destructive font-semibold">Parar</button>
              )}
              {job && !job.ativo && (
                <button onClick={limparApresJob} className="text-muted-foreground font-semibold">Fechar</button>
              )}
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${lendoPdf ? pctPdf : pct}%` }} />
            </div>
            {job?.ativo && !lendoPdf && (
              <p className="mt-1.5 text-[11px] font-body text-muted-foreground">
                Tempo estimado restante: {eta} · a geração continua em segundo plano se você sair desta tela
                {job.falhas.length ? ` · ${job.falhas.length} slide(s) serão refeitos` : ''}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4 flex gap-3">
          <Presentation className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground font-body">
            Escolha o livro, envie o PDF da apresentação, selecione a voz e dê o play.
            Cada slide vira uma imagem com narração envolvente, como um professor explicando a obra.
          </p>
        </div>

        {/* 1 — livro */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <Passo n={1} titulo="Escolha o livro" ok={!!sel} ativo={!sel} />
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {[
              { id: 'favoritos', label: `★ Favoritos (${favoritos.length})` },
              ...categorias.map(([c, n]) => ({ id: c, label: `${c} (${n})` })),
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => { setCategoria(c.id); localStorage.setItem(CAT_KEY, c.id); }}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold font-body border transition ${categoria === c.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar livro…"
              className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2.5 text-sm font-body"
            />
          </div>

          {carregando ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-0.5">
              {filtrados.map((l) => {
                const ativo = sel?.livro_id === l.livro_id && sel?.livro_tabela === l.livro_tabela;
                return (
                  <div key={`${l.livro_tabela}:${l.livro_id}`} className={`rounded-2xl border p-3 ${ativo ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => { if (ocupado) return; setSel(ativo ? null : l); limparPdf(); }}
                        className="flex-1 min-w-0 text-left"
                      >
                        <span className="block font-heading font-bold text-sm">{l.titulo}</span>
                        {l.autor && <span className="block text-xs text-muted-foreground font-body">{l.autor}</span>}
                        <span className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold uppercase tracking-wide">{l.categoria}</span>
                          <span className="text-[11px] font-body text-muted-foreground">
                            {l.apresentacao_id ? `${l.total_slides} slides · ${l.publicada ? 'publicada' : 'oculta'}` : 'sem apresentação'}
                          </span>
                        </span>
                      </button>
                      <button
                        onClick={() => alternarFavorito(l)}
                        aria-label={favoritos.includes(chaveFav(l)) ? 'Remover dos favoritos' : 'Favoritar livro'}
                        className="w-9 h-9 rounded-full border border-border flex items-center justify-center shrink-0"
                      >
                        <Star className={`w-4 h-4 ${favoritos.includes(chaveFav(l)) ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                      </button>
                    </div>

                    {ativo && l.apresentacao_id && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => navigate(`/apresentacao/${l.apresentacao_id}`)}
                          className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold"
                        >
                          <Play className="w-4 h-4" /> Ver
                        </button>
                        <button
                          onClick={() => alternarPublicacao(l)}
                          className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold"
                        >
                          {l.publicada ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          {l.publicada ? 'Ocultar' : 'Publicar'}
                        </button>
                        <button
                          onClick={() => excluir(l)}
                          className="inline-flex items-center gap-2 rounded-xl border border-destructive/60 text-destructive px-3 py-2 text-xs font-semibold"
                        >
                          <Trash2 className="w-4 h-4" /> Excluir
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2 — PDF */}
        {sel && (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <Passo n={2} titulo="Envie o PDF da apresentação" ok={slides.length > 0} ativo={slides.length === 0} />
            {faltantes && (
              <p className="rounded-xl border border-destructive/60 bg-destructive/10 p-3 text-xs font-body text-destructive">
                Esta apresentação ficou incompleta: {faltantes.prontos} de {faltantes.total} slides narrados.
                Reenvie o mesmo PDF ({faltantes.total} páginas) para gerar apenas os {faltantes.indices.length} que faltam —
                ela só fica visível no livro quando todos estiverem prontos.
              </p>
            )}
            <button
              disabled={ocupado}
              onClick={() => fileRef.current?.click()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-3 py-3 text-sm font-semibold disabled:opacity-50"
            >
              {lendoPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {slides.length ? 'Trocar PDF' : sel.apresentacao_id ? 'Enviar novo PDF (substitui)' : 'Enviar PDF'}
            </button>

            {!!slides.length && (
              <>
                <div className="flex items-center gap-2 text-xs font-body text-muted-foreground">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="truncate">{nomePdf}</span>
                  <span className="ml-auto shrink-0">{slides.length} slides</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {slides.slice(0, 8).map((s, i) => (
                    <img key={i} src={s.thumb} alt={`Slide ${i + 1}`} className="w-full h-auto rounded-lg border border-border" />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* 3 — voz */}
        {sel && slides.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <Passo n={3} titulo="Escolha a voz" ok ativo />
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-primary shrink-0" />
              <select
                value={voz}
                disabled={ocupado}
                onChange={(e) => setVoz(e.target.value)}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm font-body"
              >
                {vozes.map((v) => (
                  <option key={v.id} value={v.id}>{v.id} · {v.genero} — {v.descricao}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* 4 — play */}
        {sel && slides.length > 0 && (
          <button
            disabled={ocupado}
            onClick={gerarNarracao}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground px-4 py-4 text-base font-bold disabled:opacity-50 active:scale-[0.99] transition"
          >
            {job?.ativo ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            {job?.ativo
              ? `Gerando… ${job.feitos}/${job.total} · ${pct}% · faltam ${eta}`
              : faltantes && faltantes.total === slides.length
                ? `Completar slides faltantes (${faltantes.indices.length})`
                : `Gerar narração (${slides.length} slides)`}
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) lerPdf(f);
        }}
      />
    </div>
  );
};

export default AdminNarracaoApresentacao;
