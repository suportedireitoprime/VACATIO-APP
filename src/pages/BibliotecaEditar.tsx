import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Sparkles, Save, Loader2, ImageIcon, Wand2, Plus, X,
  ChevronRight, FileText, BookOpen, Globe, Eye, RefreshCcw, ChevronDown, Check,
  ThumbsUp, ThumbsDown, ListChecks, AlertCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { COLECOES, normalizeLivro, type LivroNormalizado } from '@/lib/bibliotecaColecoes';
import LivroDetailSheet from '@/components/biblioteca/LivroDetailSheet';
import LeituraNativaBatchPanel from '@/components/admin/LeituraNativaBatchPanel';

type Row = Record<string, any>;
type Step = 'colecoes' | 'livros';
type SubSheet = null | 'sinopse' | 'analise' | 'curiosidades' | 'checklist';

const BibliotecaEditar = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('colecoes');
  const [tabela, setTabela] = useState<string>('');
  const [livros, setLivros] = useState<Row[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [form, setForm] = useState<Row>({});
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<null | 'capa' | 'texto' | 'all' | 'web-ano' | 'web-editora' | 'web-curiosidades' | 'web-all'>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [subSheet, setSubSheet] = useState<SubSheet>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  type StepState = 'idle' | 'running' | 'ok' | 'err';
  const [progress, setProgress] = useState<{ web: StepState; texto: StepState; capa: StepState }>({
    web: 'idle', texto: 'idle', capa: 'idle',
  });
  const [lastCapaPrompt, setLastCapaPrompt] = useState<string | null>(null);
  const [capaRated, setCapaRated] = useState<0 | 1 | -1>(0);
  const [askRefazer, setAskRefazer] = useState(false);

  const colecao = useMemo(() => COLECOES.find((c) => c.table === tabela), [tabela]);

  const carregarLivros = async (t: string) => {
    setLoadingList(true);
    const { data, error } = await supabase
      .from(t as any).select('*').order('id', { ascending: true }).limit(2000);
    if (error) toast.error(error.message);
    setLivros((data as Row[]) ?? []);
    setLoadingList(false);
  };

  const onSelectColecao = (t: string) => { setTabela(t); setStep('livros'); };

  useEffect(() => {
    if (tabela && step === 'livros') carregarLivros(tabela);
  }, [tabela, step]);

  const tituloOf = (r: Row) => r.livro ?? r.tema ?? r.titulo ?? `#${r.id}`;
  const autorOf = (r: Row) => r.autor ?? '';

  const onSelectLivro = (id: string | number) => {
    setSelectedId(id);
    const row = livros.find((l) => l.id === id);
    setForm(row ? { ...row } : {});
    setSheetOpen(true);
  };

  const voltar = () => {
    if (subSheet) { setSubSheet(null); return; }
    if (previewOpen) { setPreviewOpen(false); return; }
    if (sheetOpen) { setSheetOpen(false); return; }
    if (step === 'livros') { setStep('colecoes'); setTabela(''); setLivros([]); return; }
    navigate(-1);
  };

  const salvar = async () => {
    if (!selectedId || !tabela) return;
    setSaving(true);
    const payload: Row = {
      sobre: form.sobre ?? null,
      capa_horizontal: form.capa_horizontal ?? null,
      ano_lancamento: form.ano_lancamento ?? null,
      editora: form.editora ?? null,
      curiosidades: Array.isArray(form.curiosidades) ? form.curiosidades : null,
      analise_detalhada: form.analise_detalhada ?? null,
    };
    const { error } = await supabase.from(tabela as any).update(payload).eq('id', selectedId);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success('Alterações salvas');
      setLivros((prev) => prev.map((l) => (l.id === selectedId ? { ...l, ...payload } : l)));
    }
  };

  const gerar = async (only: 'capa' | 'texto' | 'all') => {
    if (!selectedId || !tabela) return;
    setBusy(only);
    try {
      const { data, error } = await supabase.functions.invoke('biblioteca-enriquecer', {
        body: { tabela, livro_id: selectedId, only },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      if ((data as any)?.prompt_used) {
        setLastCapaPrompt((data as any).prompt_used);
        setCapaRated(0);
        setAskRefazer(false);
      }
      toast.success('Enriquecimento concluído');
      const { data: fresh } = await supabase
        .from(tabela as any).select('*').eq('id', selectedId).maybeSingle();
      if (fresh) {
        setForm({ ...(fresh as Row) });
        setLivros((prev) => prev.map((l) => (l.id === selectedId ? (fresh as Row) : l)));
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao gerar');
    } finally {
      setBusy(null);
    }
  };

  const enviarFeedbackCapa = async (rating: 1 | -1) => {
    if (!selectedId || !tabela) return;
    try {
      await supabase.functions.invoke('biblioteca-capa-feedback', {
        body: {
          tabela,
          livro_id: String(selectedId),
          titulo: tituloOf(form),
          autor: autorOf(form),
          capa_url: form.capa_horizontal ?? null,
          prompt_used: lastCapaPrompt,
          rating,
        },
      });
      setCapaRated(rating);
      if (rating === 1) {
        toast.success('Curtida registrada — a IA vai priorizar esse estilo');
      } else {
        setAskRefazer(true);
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao registrar feedback');
    }
  };

  const buscarWeb = async (campo: 'ano' | 'editora' | 'curiosidades' | 'all') => {
    if (!selectedId) return;
    setBusy(`web-${campo}` as any);
    try {
      const { data, error } = await supabase.functions.invoke('biblioteca-buscar-web', {
        body: { titulo: tituloOf(form), autor: autorOf(form), campo },
      });
      if (error) throw error;
      const d = data as any;
      if (d?.error) throw new Error(d.error);
      const patch: Row = {};
      if ((campo === 'ano' || campo === 'all') && d.ano_lancamento) patch.ano_lancamento = String(d.ano_lancamento);
      if ((campo === 'editora' || campo === 'all') && d.editora) patch.editora = String(d.editora);
      if ((campo === 'curiosidades' || campo === 'all') && Array.isArray(d.curiosidades) && d.curiosidades.length) {
        patch.curiosidades = d.curiosidades.filter((x: any) => typeof x === 'string');
      }
      if (Object.keys(patch).length === 0) {
        toast.info('Nada encontrado na web');
      } else {
        setForm((f) => ({ ...f, ...patch }));
        toast.success(`Preenchido pela web${d.fontes?.length ? ` (${d.fontes.length} fontes)` : ''}`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha na busca');
    } finally {
      setBusy(null);
    }
  };

  const gerarTudo = async () => {
    if (!selectedId || !tabela) return;
    setBusy('all');
    setProgress({ web: 'running', texto: 'idle', capa: 'idle' });

    // 1) Buscar web (ano/editora/curiosidades)
    try {
      await buscarWeb('all');
      setProgress((p) => ({ ...p, web: 'ok' }));
    } catch {
      setProgress((p) => ({ ...p, web: 'err' }));
    }

    // 2) Gerar texto (sobre + análise detalhada)
    setProgress((p) => ({ ...p, texto: 'running' }));
    try {
      const { data, error } = await supabase.functions.invoke('biblioteca-enriquecer', {
        body: { tabela, livro_id: selectedId, only: 'texto' },
      });
      if (error || (data as any)?.error) throw new Error((error as any)?.message ?? (data as any)?.error);
      const { data: fresh } = await supabase.from(tabela as any).select('*').eq('id', selectedId).maybeSingle();
      if (fresh) setForm((f) => ({ ...f, ...(fresh as Row) }));
      setProgress((p) => ({ ...p, texto: 'ok' }));
    } catch {
      setProgress((p) => ({ ...p, texto: 'err' }));
    }

    // 3) Regerar capa horizontal
    setProgress((p) => ({ ...p, capa: 'running' }));
    try {
      const { data, error } = await supabase.functions.invoke('biblioteca-enriquecer', {
        body: { tabela, livro_id: selectedId, only: 'capa' },
      });
      if (error || (data as any)?.error) throw new Error((error as any)?.message ?? (data as any)?.error);
      const { data: fresh } = await supabase.from(tabela as any).select('*').eq('id', selectedId).maybeSingle();
      if (fresh) {
        setForm((f) => ({ ...f, ...(fresh as Row) }));
        setLivros((prev) => prev.map((l) => (l.id === selectedId ? (fresh as Row) : l)));
      }
      setProgress((p) => ({ ...p, capa: 'ok' }));
    } catch {
      setProgress((p) => ({ ...p, capa: 'err' }));
    }

    setBusy(null);
    toast.success('Enriquecimento completo');
  };


  const addCuriosidade = () => {
    const arr = Array.isArray(form.curiosidades) ? [...form.curiosidades] : [];
    arr.push(''); setForm({ ...form, curiosidades: arr });
  };
  const setCuriosidade = (i: number, v: string) => {
    const arr = Array.isArray(form.curiosidades) ? [...form.curiosidades] : [];
    arr[i] = v; setForm({ ...form, curiosidades: arr });
  };
  const rmCuriosidade = (i: number) => {
    const arr = Array.isArray(form.curiosidades) ? [...form.curiosidades] : [];
    arr.splice(i, 1); setForm({ ...form, curiosidades: arr });
  };

  // Prévia — monta um LivroNormalizado a partir do form atual
  const livroPreview: LivroNormalizado | null = useMemo(() => {
    if (!colecao || !form?.id) return null;
    return normalizeLivro(form, colecao);
  }, [colecao, form]);

  const RowButton = ({
    icon: Icon, title, hint, onClick,
  }: { icon: any; title: string; hint?: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-secondary/40 transition-colors text-left"
    >
      <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-primary shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-foreground truncate">{title}</div>
        {hint && <div className="text-[11px] text-muted-foreground truncate">{hint}</div>}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );

  const sinopseHint = form.sobre ? `${String(form.sobre).slice(0, 80)}…` : 'Vazio';
  const analiseHint = form.analise_detalhada
    ? `${String(form.analise_detalhada).slice(0, 80)}…`
    : 'Vazio';
  const curiCount = Array.isArray(form.curiosidades) ? form.curiosidades.length : 0;

  return (
    <div className="min-h-dvh bg-background pb-[calc(96px+var(--sai-bottom,0px))]">
      <div className="sticky top-0 z-10">
        <PageHeader
          title={step === 'colecoes' ? 'Biblioteca Editar' : colecao?.label ?? 'Livros'}
          onBack={voltar}
        />
      </div>


      {step === 'colecoes' && (
        <div className="p-4 space-y-3 max-w-3xl mx-auto">
          <LeituraNativaBatchPanel />
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 px-1 pt-2">Escolha uma coleção</div>
          {COLECOES.map((c) => (
            <button key={c.table} onClick={() => onSelectColecao(c.table)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-secondary/40 transition-colors text-left">
              <img src={c.cover} alt="" className="w-16 h-20 rounded-lg object-cover flex-shrink-0 bg-secondary" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{c.eyebrow}</div>
                <div className="font-display font-bold text-foreground truncate text-base">{c.label}</div>
                <div className="text-xs text-muted-foreground truncate">{c.subtitle}</div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {step === 'livros' && (
        <div className="p-4 space-y-3 max-w-3xl mx-auto">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 px-1 flex items-center gap-2">
            Livros {loadingList && <Loader2 className="w-3 h-3 animate-spin" />}
            {!loadingList && livros.length > 0 && (
              <span className="text-muted-foreground/70">· {livros.length}</span>
            )}
          </div>
          {livros.map((l) => {
            const capa = colecao ? l[colecao.capaField] : null;
            return (
              <button key={String(l.id)} onClick={() => onSelectLivro(l.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-secondary/40 transition-colors text-left">
                {capa ? (
                  <img src={capa} alt="" loading="lazy"
                    className="w-16 h-20 rounded-lg object-cover flex-shrink-0 bg-secondary" />
                ) : (
                  <div className="w-16 h-20 rounded-lg flex-shrink-0 bg-secondary flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[15px] text-foreground line-clamp-2 leading-snug">{tituloOf(l)}</div>
                  {l.autor && <div className="text-xs text-muted-foreground truncate mt-0.5">{l.autor}</div>}
                  {l.area && <div className="text-[10px] text-muted-foreground/70 truncate">{l.area}</div>}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            );
          })}
          {!loadingList && livros.length === 0 && (
            <div className="p-6 text-xs text-muted-foreground text-center">Sem livros nesta coleção</div>
          )}
        </div>
      )}

      {/* Sheet principal de edição */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-[92vh] p-0 flex flex-col rounded-t-2xl" key={String(selectedId ?? 'none')}>
          <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
            {/* Linha 1: capa + título + espaço pro X nativo do Sheet */}
            <div className="flex items-center gap-3 pr-8">
              {(() => {
                const capaThumb = colecao ? form[colecao.capaField] : null;
                return capaThumb ? (
                  <img src={capaThumb} alt="" className="w-12 h-16 rounded-md object-cover bg-secondary flex-shrink-0" />
                ) : (
                  <div className="w-12 h-16 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                  </div>
                );
              })()}
              <div className="min-w-0 flex-1 text-left">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Editando</div>
                <SheetTitle className="font-display font-bold text-foreground text-base line-clamp-2 leading-snug">
                  {tituloOf(form)}
                </SheetTitle>
                {autorOf(form) && (
                  <div className="text-[11px] text-muted-foreground truncate">{autorOf(form)}</div>
                )}
              </div>
            </div>

            {/* Linha 2: alternância Prévia / Gerar tudo / Checklist */}
            {(() => {
              const capaField = colecao?.capaField;
              const checklistItems = [
                { label: 'Capa vertical', ok: !!(capaField && form[capaField]) },
                { label: 'Capa horizontal', ok: !!form.capa_horizontal },
                { label: 'Sinopse (sobre)', ok: !!(form.sobre && String(form.sobre).trim().length > 20) },
                { label: 'Análise detalhada', ok: !!(form.analise_detalhada && String(form.analise_detalhada).trim().length > 40) },
                { label: 'Ano de lançamento', ok: !!form.ano_lancamento },
                { label: 'Editora', ok: !!form.editora },
                { label: 'Curiosidades', ok: Array.isArray(form.curiosidades) && form.curiosidades.length > 0 },
              ];
              const missing = checklistItems.filter((i) => !i.ok).length;
              return (
                <>
                  <div className="grid grid-cols-3 gap-1.5 mt-3 p-1 rounded-lg bg-secondary/40 border border-border">
                    <button
                      onClick={() => setPreviewOpen(true)}
                      className="flex items-center justify-center gap-1 py-2 rounded-md text-[12px] font-medium hover:bg-secondary text-foreground"
                    >
                      <Eye className="w-3.5 h-3.5" /> Prévia
                    </button>
                    <button
                      onClick={gerarTudo}
                      disabled={busy !== null}
                      className="flex items-center justify-center gap-1 py-2 rounded-md text-[12px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {busy === 'all' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                      Gerar tudo
                    </button>
                    <button
                      onClick={() => setSubSheet('checklist')}
                      className="relative flex items-center justify-center gap-1 py-2 rounded-md text-[12px] font-medium hover:bg-secondary text-foreground"
                    >
                      <ListChecks className="w-3.5 h-3.5" /> Checklist
                      {missing > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                          {missing}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Linha 3: checklist de progresso quando "Gerar tudo" está ativo */}
                  {(busy === 'all' || progress.web !== 'idle' || progress.texto !== 'idle' || progress.capa !== 'idle') && (
                    <div className="mt-3 p-2 rounded-lg bg-secondary/40 border border-border space-y-1">
                      {[
                        { key: 'web' as const, label: 'Ano, editora e curiosidades (web)' },
                        { key: 'texto' as const, label: 'Sinopse e análise detalhada (IA)' },
                        { key: 'capa' as const, label: 'Capa horizontal (IA)' },
                      ].map(({ key, label }) => {
                        const s = progress[key];
                        return (
                          <div key={key} className="flex items-center gap-2 text-[12px] text-foreground">
                            {s === 'running' && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
                            {s === 'ok' && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                            {s === 'err' && <X className="w-3.5 h-3.5 text-destructive" />}
                            {s === 'idle' && <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40" />}
                            <span className={s === 'idle' ? 'text-muted-foreground' : ''}>{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Ver sinopse */}
            <RowButton icon={FileText} title="Ver sinopse" hint={sinopseHint} onClick={() => setSubSheet('sinopse')} />

            {/* Capa horizontal */}
            <div className="space-y-2 p-3 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Capa horizontal</Label>
                <Button size="sm" variant="ghost" onClick={() => gerar('capa')} disabled={busy !== null} className="gap-1">
                  {busy === 'capa' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
                  Regenerar
                </Button>
              </div>
              <Input value={form.capa_horizontal ?? ''} onChange={(e) => setForm({ ...form, capa_horizontal: e.target.value })} placeholder="https://…" />
              {form.capa_horizontal && (
                <>
                  <img src={form.capa_horizontal} alt="preview" className="w-full aspect-[16/10] object-cover rounded-lg border border-border" />
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="text-[11px] text-muted-foreground">
                      {capaRated === 1 ? 'Você curtiu essa capa' : capaRated === -1 ? 'Você descurtiu essa capa' : 'Essa capa ficou boa?'}
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant={capaRated === 1 ? 'default' : 'outline'}
                        onClick={() => enviarFeedbackCapa(1)}
                        disabled={capaRated !== 0}
                        className="gap-1 h-8 px-2.5"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" /> Curtir
                      </Button>
                      <Button
                        size="sm"
                        variant={capaRated === -1 ? 'destructive' : 'outline'}
                        onClick={() => enviarFeedbackCapa(-1)}
                        disabled={capaRated !== 0}
                        className="gap-1 h-8 px-2.5"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" /> Descurtir
                      </Button>
                    </div>
                  </div>
                  {askRefazer && (
                    <div className="mt-2 p-2.5 rounded-lg border border-border bg-secondary/40 space-y-2">
                      <div className="text-xs text-foreground">Quer que eu refaça a capa? A IA já registrou o que evitar.</div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 h-8" onClick={() => { setAskRefazer(false); gerar('capa'); }} disabled={busy !== null}>
                          {busy === 'capa' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
                          Sim, refazer
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => setAskRefazer(false)}>
                          Agora não
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Ano e Editora com busca web */}
            <div className="p-3 rounded-xl border border-border bg-card space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Ano</Label>
                    <button onClick={() => buscarWeb('ano')} disabled={busy !== null}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 disabled:opacity-50">
                      {busy === 'web-ano' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
                      Web
                    </button>
                  </div>
                  <Input value={form.ano_lancamento ?? ''} onChange={(e) => setForm({ ...form, ano_lancamento: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Editora</Label>
                    <button onClick={() => buscarWeb('editora')} disabled={busy !== null}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 disabled:opacity-50">
                      {busy === 'web-editora' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
                      Web
                    </button>
                  </div>
                  <Input value={form.editora ?? ''} onChange={(e) => setForm({ ...form, editora: e.target.value })} />
                </div>
              </div>
              <button onClick={() => buscarWeb('all')} disabled={busy !== null}
                className="w-full text-[12px] text-primary hover:underline flex items-center justify-center gap-1 py-1 disabled:opacity-50">
                {busy === 'web-all' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
                Buscar tudo na internet (ano, editora, curiosidades)
              </button>
            </div>

            {/* Ver curiosidades */}
            <RowButton
              icon={Sparkles}
              title="Ver curiosidades"
              hint={curiCount > 0 ? `${curiCount} item(ns)` : 'Nenhuma ainda'}
              onClick={() => setSubSheet('curiosidades')}
            />

            {/* Ver análise detalhada */}
            <RowButton icon={BookOpen} title="Ver análise detalhada" hint={analiseHint} onClick={() => setSubSheet('analise')} />
          </div>

          <div className="p-4 border-t border-border bg-background">
            <Button onClick={salvar} disabled={saving} className="w-full h-11 gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar alterações
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sub-sheet: sinopse */}
      <Sheet open={subSheet === 'sinopse'} onOpenChange={(v) => !v && setSubSheet(null)}>
        <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col rounded-t-2xl">
          <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
            <SheetTitle className="text-left">Sinopse</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="flex justify-end">
              <Button size="sm" variant="secondary" onClick={() => buscarWeb('all')} disabled={busy !== null} className="gap-1">
                {busy?.startsWith('web') ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                Gerar da web
              </Button>
            </div>
            <Textarea rows={20} value={form.sobre ?? ''} onChange={(e) => setForm({ ...form, sobre: e.target.value })}
              placeholder="Descrição resumida da obra…" className="resize-none" />
          </div>
          <div className="p-4 border-t border-border">
            <Button onClick={() => setSubSheet(null)} className="w-full">Concluir</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sub-sheet: curiosidades */}
      <Sheet open={subSheet === 'curiosidades'} onOpenChange={(v) => !v && setSubSheet(null)}>
        <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col rounded-t-2xl">
          <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
            <div className="flex items-center justify-between gap-2">
              <SheetTitle className="text-left">Curiosidades</SheetTitle>
              <div className="flex gap-1.5">
                <Button size="sm" variant="ghost" onClick={addCuriosidade} className="gap-1">
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </Button>
                <Button size="sm" variant="secondary" onClick={() => buscarWeb('curiosidades')} disabled={busy !== null} className="gap-1">
                  {busy === 'web-curiosidades' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                  Buscar na internet
                </Button>
              </div>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {(form.curiosidades ?? []).map((c: string, i: number) => (
              <div key={i} className="flex gap-2 items-start">
                <Textarea rows={2} value={c} onChange={(e) => setCuriosidade(i, e.target.value)} className="flex-1" />
                <button onClick={() => rmCuriosidade(i)} className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {(!form.curiosidades || form.curiosidades.length === 0) && (
              <div className="text-xs text-muted-foreground italic text-center py-8">Nenhuma curiosidade ainda</div>
            )}
          </div>
          <div className="p-4 border-t border-border">
            <Button onClick={() => setSubSheet(null)} className="w-full">Concluir</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sub-sheet: análise detalhada */}
      <Sheet open={subSheet === 'analise'} onOpenChange={(v) => !v && setSubSheet(null)}>
        <SheetContent side="bottom" className="h-[92vh] p-0 flex flex-col rounded-t-2xl">
          <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
            <div className="flex items-center justify-between gap-2">
              <SheetTitle className="text-left">Análise detalhada</SheetTitle>
              <Button size="sm" variant="secondary" onClick={() => gerar('texto')} disabled={busy !== null} className="gap-1">
                {busy === 'texto' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Gerar com IA
              </Button>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <Textarea
              value={form.analise_detalhada ?? ''}
              onChange={(e) => setForm({ ...form, analise_detalhada: e.target.value })}
              placeholder="Análise crítica e contextual do livro…"
              className="min-h-full resize-none border-0 focus-visible:ring-0 p-0 text-[15px] leading-relaxed"
            />
          </div>
          <div className="p-4 border-t border-border">
            <Button onClick={() => setSubSheet(null)} className="w-full">Concluir</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sub-sheet: checklist */}
      <Sheet open={subSheet === 'checklist'} onOpenChange={(v) => !v && setSubSheet(null)}>
        <SheetContent side="bottom" className="h-[75vh] p-0 flex flex-col rounded-t-2xl">
          <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-primary" />
              <SheetTitle className="text-left">Checklist do livro</SheetTitle>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {(() => {
              const capaField = colecao?.capaField;
              const items = [
                { label: 'Capa vertical', ok: !!(capaField && form[capaField]), hint: capaField && form[capaField] ? String(form[capaField]).slice(0, 60) + '…' : 'Sem imagem' },
                { label: 'Capa horizontal', ok: !!form.capa_horizontal, hint: form.capa_horizontal ? 'Preenchida' : 'Vazia — gere pela IA' },
                { label: 'Sinopse (sobre)', ok: !!(form.sobre && String(form.sobre).trim().length > 20), hint: form.sobre ? `${String(form.sobre).length} caracteres` : 'Vazio' },
                { label: 'Análise detalhada', ok: !!(form.analise_detalhada && String(form.analise_detalhada).trim().length > 40), hint: form.analise_detalhada ? `${String(form.analise_detalhada).length} caracteres` : 'Vazio' },
                { label: 'Ano de lançamento', ok: !!form.ano_lancamento, hint: form.ano_lancamento || 'Vazio' },
                { label: 'Editora', ok: !!form.editora, hint: form.editora || 'Vazio' },
                { label: 'Curiosidades', ok: Array.isArray(form.curiosidades) && form.curiosidades.length > 0, hint: Array.isArray(form.curiosidades) && form.curiosidades.length > 0 ? `${form.curiosidades.length} item(ns)` : 'Nenhuma' },
              ];
              const okCount = items.filter((i) => i.ok).length;
              return (
                <>
                  <div className="p-3 rounded-xl border border-border bg-card flex items-center justify-between">
                    <div className="text-sm text-foreground">Progresso</div>
                    <div className="text-sm font-semibold text-foreground">{okCount}/{items.length}</div>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{ width: `${(okCount / items.length) * 100}%` }}
                    />
                  </div>
                  {items.map((i) => (
                    <div key={i.label} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${i.ok ? 'bg-emerald-500/15 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                        {i.ok ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-foreground">{i.label}</div>
                        <div className={`text-[11px] truncate ${i.ok ? 'text-muted-foreground' : 'text-destructive'}`}>
                          {i.ok ? i.hint : `Faltando — ${i.hint}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              );
            })()}
          </div>
          <div className="p-4 border-t border-border flex gap-2">
            <Button variant="outline" onClick={() => setSubSheet(null)} className="flex-1">Fechar</Button>
            <Button onClick={() => { setSubSheet(null); gerarTudo(); }} disabled={busy !== null} className="flex-1 gap-1">
              {busy === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              Preencher com IA
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Prévia — usa o mesmo componente que o usuário final vê */}
      <LivroDetailSheet
        livro={previewOpen ? livroPreview : null}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );
};

export default BibliotecaEditar;
