import { useEffect, useState } from 'react';
import { Loader2, BookOpen, Sparkles, CheckCircle2, ListTree, Play, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';

type Livro = { id: string; tema: string; area: string; link: string | null; download: string | null; capa_livro: string | null };
type OcrRow = {
  id: string;
  livro_id: string;
  livro_tabela: string;
  status: string;
  refino_status: string;
  erro_detalhe?: string | null;
  etapa?: string | null;
  progresso?: number | null;
  total_etapas?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};
type Sugerida = {
  id: string;
  ordem: number;
  titulo_melhorado: string;
  titulo_original: string | null;
  resumo_capitulo: string | null;
  aprovado: boolean;
  aula_id: string | null;
};

export default function AprenderPorLivroTab({ area }: { area: string }) {
  const [livros, setLivros] = useState<Livro[]>([]);
  const [areaId, setAreaId] = useState<string | null>(null);
  const [ocrByLivro, setOcrByLivro] = useState<Record<string, OcrRow>>({});
  const [loading, setLoading] = useState(true);
  const [openLivro, setOpenLivro] = useState<Livro | null>(null);
  const [sugestoes, setSugestoes] = useState<Sugerida[]>([]);
  const [contagens, setContagens] = useState<Record<string, { flashcards: number; questoes: number }>>({});
  const [analisando, setAnalisando] = useState(false);
  const [gerandoId, setGerandoId] = useState<string | null>(null);
  const [gerandoEtapa, setGerandoEtapa] = useState<'teoria' | 'flashcards' | 'questoes' | null>(null);
  const [gerandoLote, setGerandoLote] = useState(false);
  const [ocrLoadingId, setOcrLoadingId] = useState<string | null>(null);
  const [liberandoTodos, setLiberandoTodos] = useState(false);
  const [loteInfo, setLoteInfo] = useState<{ feitas: number; total: number; inicio: number; etapa?: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [sumByLivro, setSumByLivro] = useState<Record<string, { total: number; comAula: number }>>({});
  const [etapaAtiva, setEtapaAtiva] = useState<'teoria' | 'flashcards' | 'questoes'>('teoria');

  useEffect(() => {
    if (!loteInfo && ocrLoadingId === null && !liberandoTodos && !analisando && !gerandoId) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [rows, areaRes] = await Promise.all([
        fetchAllRows<Livro>(() =>
          supabase.from('biblioteca_estudos')
            .select('id, tema, area, link, download, capa_livro')
            .eq('area', area)
            .order('ordem') as any,
        ),
        supabase.from('aprender_areas').select('id').eq('nome', area).maybeSingle(),
      ]);
      setAreaId((areaRes.data as { id?: string } | null)?.id ?? null);
      setLivros(rows);
      await refreshOcr(rows.map((r) => r.id));
      setLoading(false);
    })();
  }, [area]);

  const refreshOcr = async (ids?: string[]) => {
      const alvo = ids ?? livros.map((l) => l.id);
      if (alvo.length === 0) { setOcrByLivro({}); return; }
      const ocr = await fetchAllRows<OcrRow>(() =>
        supabase.from('biblioteca_leitura_nativa')
          .select('id, livro_id, livro_tabela, status, refino_status, erro_detalhe, etapa, progresso, total_etapas, created_at, updated_at')
          .eq('livro_tabela', 'areas')
          .in('livro_id', alvo as any) as any,
      );
      const m: Record<string, OcrRow> = {};
      ocr.forEach((o) => { m[o.livro_id] = o; });
      setOcrByLivro(m);
      // Contagem de sugestões (total e com aula gerada) por livro biblioteca
      const ocrIds = ocr.map((o) => o.id);
      if (ocrIds.length > 0) {
        const sums = await fetchAllRows<{ livro_id: string; aula_id: string | null }>(() =>
          supabase.from('aprender_sumario_sugerido')
            .select('livro_id, aula_id')
            .in('livro_id', ocrIds as any) as any,
        );
        const ocrIdToLivroId: Record<string, string> = {};
        ocr.forEach((o) => { ocrIdToLivroId[o.id] = o.livro_id; });
        const acc: Record<string, { total: number; comAula: number }> = {};
        sums.forEach((s) => {
          const lid = ocrIdToLivroId[s.livro_id];
          if (!lid) return;
          const cur = acc[lid] ?? { total: 0, comAula: 0 };
          cur.total += 1;
          if (s.aula_id) cur.comAula += 1;
          acc[lid] = cur;
        });
        setSumByLivro(acc);
      } else {
        setSumByLivro({});
      }
  };

  const liberarOcr = async (livro: Livro, silent = false) => {
    // Prefer o campo `download` (PDF direto no Drive). O `link` público é um
    // flipbook FlipHTML5 que NÃO é um PDF e faz o Mistral OCR falhar.
    const pdfUrl = livro.download || livro.link;
    if (!pdfUrl) {
      if (!silent) toast.error('Livro sem PDF (download/link).');
      return false;
    }
    setOcrLoadingId(livro.id);
    try {
      const { data, error } = await supabase.functions.invoke('biblioteca-ocr-mistral', {
        body: {
          livro_id: String(livro.id),
          livro_tabela: 'areas',
          pdf_url: pdfUrl,
          titulo: livro.tema,
          force: true,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      if (!silent) toast.success('OCR disparado');
      await refreshOcr();
      return true;
    } catch (e: any) {
      if (!silent) toast.error(e?.message || 'Falha ao liberar OCR');
      return false;
    } finally {
      setOcrLoadingId(null);
    }
  };

  const liberarTodos = async () => {
    const pend = livros.filter((l) => {
      const o = ocrByLivro[l.id];
      return (l.download || l.link) && (!o || (o.status !== 'pronto' && o.status !== 'processando'));
    });
    if (pend.length === 0) return toast.info('Nada pendente para OCR');
    if (!confirm(`Liberar OCR de ${pend.length} livro(s)?`)) return;
    setLiberandoTodos(true);
    let ok = 0, fail = 0;
    try {
      for (const l of pend) {
        const r = await liberarOcr(l, true);
        r ? ok++ : fail++;
      }
      toast.success(`OCR liberado: ${ok} ok${fail ? ` · ${fail} falha(s)` : ''}`);
    } finally {
      setLiberandoTodos(false);
      await refreshOcr();
    }
  };

  useEffect(() => {
    const ids = livros.map((l) => l.id);
      if (ids.length > 0) {
        const ch = supabase
          .channel(`aprender-ocr-${area}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'biblioteca_leitura_nativa', filter: 'livro_tabela=eq.areas' }, () => {
            refreshOcr();
          })
          .subscribe();
        return () => { supabase.removeChannel(ch); };
      }
  }, [livros, area]);

  const abrirLivro = async (livro: Livro) => {
    setOpenLivro(livro);
    const ocr = ocrByLivro[livro.id];
    if (!ocr) return;
    const rows = await fetchAllRows<Sugerida>(() =>
      supabase.from('aprender_sumario_sugerido')
        .select('id, ordem, titulo_melhorado, titulo_original, resumo_capitulo, aprovado, aula_id')
        .eq('livro_id', ocr.id)
        .order('ordem') as any,
    );
    setSugestoes(rows);
    // Conta flashcards e perguntas por aula
    const aulaIds = rows.map((r) => r.aula_id).filter(Boolean) as string[];
    if (aulaIds.length === 0) { setContagens({}); return; }
    const blocos = await fetchAllRows<{ aula_id: string; tipo: string }>(() =>
      supabase.from('aprender_blocos')
        .select('aula_id, tipo')
        .in('aula_id', aulaIds as any)
        .in('tipo', ['flashcard', 'pergunta'] as any) as any,
    );
    const acc: Record<string, { flashcards: number; questoes: number }> = {};
    blocos.forEach((b) => {
      const cur = acc[b.aula_id] ?? { flashcards: 0, questoes: 0 };
      if (b.tipo === 'flashcard') cur.flashcards += 1;
      else if (b.tipo === 'pergunta') cur.questoes += 1;
      acc[b.aula_id] = cur;
    });
    setContagens(acc);
  };

  const analisar = async () => {
    if (!openLivro) return;
    const ocr = ocrByLivro[openLivro.id];
    if (!ocr) return toast.error('OCR do livro não disponível');
    setAnalisando(true);
    try {
      const { data, error } = await supabase.functions.invoke('analisar-sumario-livro', {
        body: { livro_nativa_id: ocr.id, area_id: areaId },
      });
      if (error) {
        const detail = await extractInvokeError(error);
        throw new Error(detail);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`${(data as any).total} aulas sugeridas`);
      await abrirLivro(openLivro);
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao analisar sumário');
    } finally {
      setAnalisando(false);
    }
  };

  const gerarTeoria = async (id: string) => {
    setGerandoId(id);
    setGerandoEtapa('teoria');
    try {
      const { data, error } = await supabase.functions.invoke('gerar-aula-do-livro', {
        body: { sumario_id: id, area_id: areaId },
      });
      if (error) { const detail = await extractInvokeError(error); throw new Error(detail); }
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Teoria gerada: ${(data as any).titulo}`);
      if (openLivro) await abrirLivro(openLivro);
      return (data as any)?.aula_id as string | undefined;
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao gerar teoria');
      throw e;
    } finally {
      setGerandoId(null);
      setGerandoEtapa(null);
    }
  };

  const gerarFlashcards = async (sugestaoId: string, aulaId: string) => {
    setGerandoId(sugestaoId);
    setGerandoEtapa('flashcards');
    try {
      const { data, error } = await supabase.functions.invoke('gerar-flashcards-aula', {
        body: { aula_id: aulaId },
      });
      if (error) { const detail = await extractInvokeError(error); throw new Error(detail); }
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`${(data as any).total} flashcards gerados`);
      if (openLivro) await abrirLivro(openLivro);
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao gerar flashcards');
      throw e;
    } finally {
      setGerandoId(null);
      setGerandoEtapa(null);
    }
  };

  const gerarQuestoes = async (sugestaoId: string, aulaId: string) => {
    setGerandoId(sugestaoId);
    setGerandoEtapa('questoes');
    try {
      const { data, error } = await supabase.functions.invoke('gerar-questoes-aula', {
        body: { aula_id: aulaId },
      });
      if (error) { const detail = await extractInvokeError(error); throw new Error(detail); }
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`${(data as any).total} questões geradas`);
      if (openLivro) await abrirLivro(openLivro);
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao gerar questões');
      throw e;
    } finally {
      setGerandoId(null);
      setGerandoEtapa(null);
    }
  };

  const gerarTodas = async () => {
    const pend = sugestoes;
    if (pend.length === 0) return toast.info('Nada pendente');
    const labelEtapa = etapaAtiva === 'teoria' ? 'TEORIA' : etapaAtiva === 'flashcards' ? 'FLASHCARDS' : 'QUESTÕES';
    if (!confirm(`Gerar ${labelEtapa} de ${pend.length} aula(s)?`)) return;
    setGerandoLote(true);
    setLoteInfo({ feitas: 0, total: pend.length, inicio: Date.now(), etapa: labelEtapa });
    try {
      let feitas = 0;
      for (const s of pend) {
        try {
          if (etapaAtiva === 'teoria') {
            await gerarTeoria(s.id);
          } else if (etapaAtiva === 'flashcards') {
            if (s.aula_id) await gerarFlashcards(s.id, s.aula_id);
          } else {
            if (s.aula_id) await gerarQuestoes(s.id, s.aula_id);
          }
        } catch {}
        feitas += 1;
        setLoteInfo((p) => (p ? { ...p, feitas } : p));
      }
      toast.success('Concluído');
    } finally {
      setGerandoLote(false);
      setLoteInfo(null);
    }
  };


  return (
    <div>
      {!loading && livros.length > 0 && (
        <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {livros.filter((l) => {
              const o = ocrByLivro[l.id];
              return o && (o.status === 'pronto' || o.refino_status === 'pronto');
            }).length}/{livros.length} com OCR pronto
          </p>
          <button
            onClick={liberarTodos}
            disabled={liberandoTodos}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1 rounded-lg bg-primary/10 border border-primary/40 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-50"
          >
            {liberandoTodos ? <><Loader2 className="h-3 w-3 animate-spin" /> Liberando…</> : <><Zap className="h-3 w-3" /> Liberar OCR de todos</>}
          </button>
        </div>
      )}
      {loading ? (
        <div className="grid gap-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : livros.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum livro nesta área.</p>
      ) : (
        <div className="grid gap-2.5">
          {livros.map((l) => {
            const ocr = ocrByLivro[l.id];
            const pronto = ocr && (ocr.status === 'pronto' || ocr.refino_status === 'pronto');
            const processando = ocr && (ocr.status === 'processando' || ocr.refino_status === 'processando');
            const semLink = !l.link && !l.download;
            const sum = sumByLivro[l.id];
            const concluido = !!(pronto && sum && sum.total > 0 && sum.comAula >= sum.total);
            return (
              <div
                key={l.id}
                className={`rounded-xl border bg-card p-3 sm:p-3.5 ${
                  concluido ? 'border-emerald-500/60 bg-emerald-500/[0.04]' : 'border-border'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
                  <button
                    onClick={() => abrirLivro(l)}
                    disabled={!pronto}
                    className="flex flex-1 min-w-0 items-center gap-3 sm:gap-3.5 text-left disabled:opacity-60"
                  >
                    <div className="relative shrink-0">
                      {l.capa_livro ? (
                        <img
                          src={l.capa_livro}
                          alt=""
                          loading="lazy"
                          className={`h-[72px] w-[52px] sm:h-20 sm:w-14 rounded-md object-cover bg-muted ${
                            concluido ? 'ring-2 ring-emerald-500' : ''
                          }`}
                        />
                      ) : (
                        <div className={`h-[72px] w-[52px] sm:h-20 sm:w-14 rounded-md bg-muted flex items-center justify-center ${
                          concluido ? 'ring-2 ring-emerald-500' : ''
                        }`}>
                          <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      {concluido && (
                        <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
                          <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm sm:text-base font-bold text-foreground line-clamp-2 leading-tight">{l.tema}</p>
                      <p className={`text-xs sm:text-[13px] line-clamp-2 mt-1 ${
                        concluido ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-muted-foreground'
                      }`}>
                        {concluido
                          ? `Concluído — ${sum!.total} aulas geradas`
                          : pronto
                          ? sum && sum.total > 0
                            ? `OCR pronto — ${sum.comAula}/${sum.total} aulas geradas`
                            : 'OCR pronto — toque para ver o sumário'
                          : processando
                          ? ocrProgressoLabel(ocr, now)
                          : ocr?.status === 'erro'
                          ? `Erro OCR — ${ocr.erro_detalhe || 'tente novamente'}`
                          : semLink
                          ? 'sem PDF'
                          : 'sem OCR'}
                      </p>
                      {processando && ocr && (
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${ocrPercent(ocr)}%` }}
                          />
                        </div>
                      )}
                      {pronto && !concluido && sum && sum.total > 0 && (
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-emerald-500 transition-all"
                            style={{ width: `${Math.round((sum.comAula / sum.total) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                    {pronto && <ListTree className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </button>
                  {!pronto && !processando && !semLink && (
                    <button
                      onClick={() => liberarOcr(l)}
                      disabled={ocrLoadingId === l.id}
                      title="Liberar OCR (Mistral)"
                      className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs sm:text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                    >
                      {ocrLoadingId === l.id ? <><Loader2 className="h-3 w-3 animate-spin" /> Liberando…</> : <><Play className="h-3 w-3" /> Liberar OCR</>}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Sheet open={!!openLivro} onOpenChange={(o) => !o && setOpenLivro(null)}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto px-3 sm:px-6">
          <SheetHeader>
            <SheetTitle className="text-left">{openLivro?.tema}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={analisar}
                disabled={analisando}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary/10 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/20 disabled:opacity-50"
              >
                {analisando ? <><Loader2 className="h-4 w-4 animate-spin" /> Analisando…</> : <><Sparkles className="h-4 w-4" /> Analisar sumário do livro</>}
              </button>
              {sugestoes.length > 0 && (
                <button
                  onClick={gerarTodas}
                  disabled={gerandoLote}
                  className="w-full sm:w-auto rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {gerandoLote ? 'Gerando…' : `Gerar todas — ${etapaAtiva === 'teoria' ? 'Teoria' : etapaAtiva === 'flashcards' ? 'Flashcards' : 'Questões'}`}
                </button>
              )}
            </div>

            {sugestoes.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-border bg-muted/40 p-1">
                {(['teoria', 'flashcards', 'questoes'] as const).map((et) => {
                  const label = et === 'teoria' ? 'Teoria' : et === 'flashcards' ? 'Flashcards' : 'Questões';
                  const active = etapaAtiva === et;
                  return (
                    <button
                      key={et}
                      onClick={() => setEtapaAtiva(et)}
                      className={`rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            {analisando && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Lendo sumário e conteúdo do livro com IA… isso costuma levar 20–60s.
              </div>
            )}

            {loteInfo && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 space-y-2">
                <div className="flex items-center justify-between text-xs text-primary">
                  <span className="font-semibold">Gerando {loteInfo.etapa ?? 'aulas'} · {loteInfo.feitas}/{loteInfo.total}</span>
                  <span className="text-muted-foreground">
                    {formatEta(loteInfo, now)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${loteInfo.total === 0 ? 0 : Math.round((loteInfo.feitas / loteInfo.total) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {sugestoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma aula sugerida ainda. Clique em "Analisar sumário".</p>
            ) : (
              <div className="divide-y divide-border rounded-xl border border-border bg-card">
                {sugestoes.map((s) => {
                  const cnt = s.aula_id ? contagens[s.aula_id] : undefined;
                  const semAula = !s.aula_id;
                  const gerando = gerandoId === s.id;
                  const btnCls = (variant: 'teoria' | 'flash' | 'quest', filled: boolean) => {
                    const base = 'inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold hover:opacity-90 disabled:opacity-40 min-h-8';
                    if (filled) return `${base} bg-emerald-500 text-white`;
                    if (variant === 'teoria') return `${base} bg-primary text-primary-foreground`;
                    return `${base} bg-primary/15 text-primary border border-primary/40`;
                  };
                  return (
                    <div key={s.id} className="flex flex-col gap-2.5 px-3 py-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                          {s.ordem}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground text-sm">{s.titulo_melhorado}</p>
                          {s.titulo_original && s.titulo_original !== s.titulo_melhorado && (
                            <p className="text-[11px] text-muted-foreground line-through">{s.titulo_original}</p>
                          )}
                          {s.resumo_capitulo && (
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{s.resumo_capitulo}</p>
                          )}
                        </div>
                      </div>
                      <div className="sm:pl-9">
                        {etapaAtiva === 'teoria' && (
                          <button
                            onClick={() => gerarTeoria(s.id).catch(() => {})}
                            disabled={gerando}
                            className={btnCls('teoria', !!s.aula_id) + ' w-full'}
                            title="Gerar/regerar teoria (aula)"
                          >
                            {gerando && gerandoEtapa === 'teoria' ? (
                              <><Loader2 className="h-3 w-3 animate-spin" /> Gerando teoria…</>
                            ) : s.aula_id ? (
                              <><CheckCircle2 className="h-3 w-3" /> Teoria gerada — regerar</>
                            ) : (
                              'Gerar teoria'
                            )}
                          </button>
                        )}
                        {etapaAtiva === 'flashcards' && (
                          <button
                            onClick={() => s.aula_id && gerarFlashcards(s.id, s.aula_id).catch(() => {})}
                            disabled={semAula || gerando}
                            className={btnCls('flash', !!(cnt && cnt.flashcards > 0)) + ' w-full'}
                            title={semAula ? 'Gere a teoria primeiro' : 'Gerar/regerar flashcards'}
                          >
                            {gerando && gerandoEtapa === 'flashcards' ? (
                              <><Loader2 className="h-3 w-3 animate-spin" /> Gerando flashcards…</>
                            ) : semAula ? (
                              'Gere a teoria primeiro'
                            ) : cnt && cnt.flashcards > 0 ? (
                              <><CheckCircle2 className="h-3 w-3" /> {cnt.flashcards} flashcards — regerar</>
                            ) : (
                              'Gerar flashcards'
                            )}
                          </button>
                        )}
                        {etapaAtiva === 'questoes' && (
                          <button
                            onClick={() => s.aula_id && gerarQuestoes(s.id, s.aula_id).catch(() => {})}
                            disabled={semAula || gerando}
                            className={btnCls('quest', !!(cnt && cnt.questoes > 0)) + ' w-full'}
                            title={semAula ? 'Gere a teoria primeiro' : 'Gerar/regerar questões'}
                          >
                            {gerando && gerandoEtapa === 'questoes' ? (
                              <><Loader2 className="h-3 w-3 animate-spin" /> Gerando questões…</>
                            ) : semAula ? (
                              'Gere a teoria primeiro'
                            ) : cnt && cnt.questoes > 0 ? (
                              <><CheckCircle2 className="h-3 w-3" /> {cnt.questoes} questões — regerar</>
                            ) : (
                              'Gerar questões'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ocrPercent(o: OcrRow): number {
  const total = Number(o.total_etapas || 0);
  const feito = Number(o.progresso || 0);
  if (total > 0) return Math.min(100, Math.max(2, Math.round((feito / total) * 100)));
  // fallback indeterminado
  return 8;
}

function ocrProgressoLabel(o: OcrRow, now: number): string {
  const etapa = o.etapa || 'OCR rodando';
  const total = Number(o.total_etapas || 0);
  const feito = Number(o.progresso || 0);
  const parts: string[] = [etapa];
  if (total > 0) parts.push(`${feito}/${total}`);
  const started = o.created_at ? Date.parse(o.created_at) : NaN;
  if (!Number.isNaN(started)) {
    const elapsed = Math.max(0, Math.round((now - started) / 1000));
    parts.push(fmtSec(elapsed));
    if (total > 0 && feito > 0) {
      const eta = Math.round((elapsed / feito) * (total - feito));
      if (eta > 0) parts.push(`~${fmtSec(eta)} restantes`);
    }
  }
  return parts.join(' · ');
}

function formatEta(info: { feitas: number; total: number; inicio: number }, now: number): string {
  const elapsed = Math.max(0, Math.round((now - info.inicio) / 1000));
  if (info.feitas === 0) return `${fmtSec(elapsed)} decorridos`;
  const per = elapsed / info.feitas;
  const eta = Math.round(per * (info.total - info.feitas));
  return `${fmtSec(elapsed)} decorridos · ~${fmtSec(eta)} restantes`;
}

function fmtSec(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r === 0 ? `${m}min` : `${m}min ${r}s`;
}

async function extractInvokeError(error: any): Promise<string> {
  try {
    const resp = error?.context?.response ?? error?.context;
    if (resp && typeof resp.clone === 'function') {
      const clone = resp.clone();
      const txt = await clone.text();
      if (txt) {
        try {
          const j = JSON.parse(txt);
          if (j?.error) return String(j.error);
          if (j?.message) return String(j.message);
        } catch {}
        return txt.slice(0, 300);
      }
    }
  } catch {}
  return error?.message || 'Falha ao chamar a função';
}
