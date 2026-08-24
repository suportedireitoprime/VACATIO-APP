import { Suspense, useEffect, useMemo, useState, useRef, memo, useCallback } from 'react';
import { lazyWithRetry } from "@/utils/lazyWithRetry";
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { COLECOES, findColecao, normalizeLivro, type LivroNormalizado } from '@/lib/bibliotecaColecoes';
import { useVisibleColecoes } from '@/hooks/useVisibleColecoes';
import { supabase } from '@/integrations/supabase/client';
import { startCapasPrefetch } from '@/services/bibliotecaCapasPrefetch';
import { startLeituraNativaPrefetch } from '@/services/leituraNativaPrefetch';
import { scheduleWarmBiblioteca } from '@/services/bibliotecaWarmup';
import { styleForArea, styleForPerformance } from '@/lib/bibliotecaIcons';
import { directImg } from '@/lib/cdnImg';
import { withBundleFallback, bundle } from '@/services/offlineBundle';
import { getPersistedColecao, setPersistedColecao } from '@/services/offlineDb';
import BibliotecaAtalhosBar from '@/components/biblioteca/BibliotecaAtalhosBar';
import BibliotecaSearchBar from '@/components/biblioteca/BibliotecaSearchBar';
import BibliotecaBottomNav from '@/components/biblioteca/BibliotecaBottomNav';
import LivroDetailSheet from '@/components/biblioteca/LivroDetailSheet';
import FilosofosPanel from '@/components/biblioteca/FilosofosPanel';
import RecomendacoesCarousel from '@/components/biblioteca/RecomendacoesCarousel';
import ContinuarLeituraCarousel from '@/components/biblioteca/ContinuarLeituraCarousel';
import PdfScrollReader from '@/components/biblioteca/PdfScrollReader';
import { useIsDesktop } from '@/hooks/use-desktop';
import { track } from '@/lib/analyticsEvents';
import { FileUp, ChevronRight, Library, BookOpen, Gauge, X, Lock } from 'lucide-react';
// FilePicker carregado via dynamic import no handleUploadPdf (evita crash se plugin nativo não estiver registrado)
import { saveCustomPdf, listCustomPdfs, removeCustomPdf, getCustomPdf, type CustomPdfRecord } from '@/services/bibliotecaPersonalizadosDb';
import { CheckCircle2, HardDrive } from 'lucide-react';

const BibliotecasDesktop = lazyWithRetry(() => import('./BibliotecasDesktop'));

const VirtualLivroItem = memo(function VirtualLivroItem({ virtualRow, livro: l, onClick }: { virtualRow: VirtualItem, livro: LivroNormalizado, onClick: () => void }) {
  const isDownloaded = false; // Removido useIsPdfCached
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: `${virtualRow.size}px`,
        transform: `translateY(${virtualRow.start}px)`,
        paddingBottom: '8px',
      }}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/60 text-left active:scale-[0.99] transition-transform w-full h-full relative"
      >
        <div className="w-[56px] h-[76px] shrink-0 rounded-lg overflow-hidden bg-muted border border-border relative">
          {isDownloaded && (
            <div className="absolute top-1 right-1 z-10 bg-black/60 backdrop-blur-sm p-0.5 rounded-full border border-white/10 shadow-sm">
              <CheckCircle2 className="w-3 h-3 text-green-400" />
            </div>
          )}
          {l.capa && (
            <img src={directImg(l.capa, 200)} alt="" loading="lazy" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{l.titulo}</p>
          {l.autor && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{l.autor}</p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>
    </div>
  );
});

/** Coleções que compõem a aba "Performance" (desenvolvimento além do Direito). */
const PERFORMANCE_IDS = ['fora-da-toga', 'oratoria', 'lideranca', 'portugues', 'pesquisa'];

type AbaBiblioteca = 'performance' | 'acervos' | 'materias';

const ABAS: { id: AbaBiblioteca; label: string; icon: typeof Library }[] = [
  { id: 'performance', label: 'Performance', icon: Gauge },
  { id: 'acervos', label: 'Acervos', icon: Library },
  { id: 'materias', label: 'Matérias', icon: BookOpen },
];

const Bibliotecas = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const abaUrl = searchParams.get('aba') as AbaBiblioteca;
  const materiaUrl = searchParams.get('materia');

  const [livroAberto, setLivroAberto] = useState<LivroNormalizado | null>(null);
  const [customPdfUrl, setCustomPdfUrl] = useState<string | null>(null);
  const [customPdfTitle, setCustomPdfTitle] = useState<string>('');
  const [customPdfsList, setCustomPdfsList] = useState<Omit<CustomPdfRecord, 'data'>[]>([]);
  
  const location = useLocation();

  useEffect(() => {
    if (location.state?.openLivro) {
      setLivroAberto(location.state.openLivro as LivroNormalizado);
      // Limpa o state para não reabrir se o usuário fechar o modal e atualizar a página
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);
  
  const aba: AbaBiblioteca = abaUrl && ['performance', 'acervos', 'materias'].includes(abaUrl) ? abaUrl : 'acervos';
  const materiaAberta = materiaUrl || null;

  const setAba = (newAba: AbaBiblioteca) => {
    setSearchParams(prev => {
      prev.set('aba', newAba);
      prev.delete('materia');
      return prev;
    }, { replace: true });
  };

  const setMateriaAberta = (novaMateria: string | null) => {
    setSearchParams(prev => {
      if (novaMateria) prev.set('materia', novaMateria);
      else prev.delete('materia');
      return prev;
    }, { replace: true });
  };

  const isDesktop = useIsDesktop();
  const colecoesVisiveis = useVisibleColecoes();
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getPersistedColecao('areas').then((cached) => {
      if (cached && cached.length > 0) {
        const current = queryClient.getQueryData(['biblioteca-colecao', 'areas']);
        if (!current) {
          queryClient.setQueryData(['biblioteca-colecao', 'areas'], cached);
        }
      }
    });
  }, [queryClient]);

  const loadCustomPdfs = useCallback(async () => {
    try {
      const list = await listCustomPdfs();
      setCustomPdfsList(list);
    } catch {}
  }, []);

  useEffect(() => {
    loadCustomPdfs();
  }, [loadCustomPdfs]);

  const handleUploadPdf = async () => {
    try {
      const { FilePicker } = await import('@capawesome/capacitor-file-picker');
      const result = await FilePicker.pickFiles({
        types: ['application/pdf'],
        readData: true,
      });
      const file = result.files[0];
      if (file && file.data) {
        const t = file.name || 'PDF Personalizado';
        const d = `data:application/pdf;base64,${file.data}`;
        const id = crypto.randomUUID();
        await saveCustomPdf(id, t, d);
        await loadCustomPdfs();
        setCustomPdfTitle(t);
        setCustomPdfUrl(d);
      }
    } catch (e) {
      console.log('User cancelled or error picking file', e);
    }
  };

  const handleOpenCustomPdf = async (id: string, titulo: string) => {
    const record = await getCustomPdf(id);
    if (record) {
      setCustomPdfTitle(record.titulo);
      setCustomPdfUrl(record.data);
    }
  };

  const handleDeleteCustomPdf = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await removeCustomPdf(id);
    await loadCustomPdfs();
  };

  const colecoesPerformance = useMemo(
    () => colecoesVisiveis.filter((c) => PERFORMANCE_IDS.includes(c.id)),
    [colecoesVisiveis],
  );
  // Acervos lista todas as coleções (inclusive as de Performance).
  const colecoesAcervos = colecoesVisiveis;

  // Matérias = áreas do Direito do acervo principal (biblioteca_estudos)
  const colecaoAreas = findColecao('areas');
  const { data: livrosAreas = [], isLoading: loadingAreas } = useQuery({
    queryKey: ['biblioteca-colecao', 'areas'],
    staleTime: 10 * 60 * 1000,
    placeholderData: (prev: LivroNormalizado[] | undefined) => prev,
    queryFn: async () => {
      if (!colecaoAreas) return [] as LivroNormalizado[];
      try {
        let q = supabase.from(colecaoAreas.table as any).select(colecaoAreas.select);
        if (colecaoAreas.orderBy) q = q.order(colecaoAreas.orderBy, { ascending: true, nullsFirst: false }) as any;
        
        const data = await withBundleFallback(
          q.limit(2000).then((res: any) => {
             if (res.error) throw res.error;
             return res.data;
          }),
          async () => {
             const rows = await bundle.bibliotecaEstudos();
             return rows || [];
          }
        );
        
        const normalized = Array.isArray(data) ? data.map((r: any) => normalizeLivro(r, colecaoAreas)) : [];
        setPersistedColecao('areas', normalized).catch(() => {});
        return normalized;
      } catch (err) {
        // Falha de rede extrema: devolve cache persistido para manter visível.
        const cached = await getPersistedColecao<LivroNormalizado>('areas');
        if (cached && cached.length > 0) return cached;
        throw err;
      }
    },
  });

  const materias = useMemo(() => {
    const map = new Map<string, { name: string; capa?: string; count: number }>();
    for (const l of livrosAreas) {
      const a = l.area || 'Outros';
      const cur = map.get(a);
      if (cur) cur.count++;
      else map.set(a, { name: a, capa: l.capa || undefined, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [livrosAreas]);

  const livrosDaMateria = useMemo(
    () => (materiaAberta ? livrosAreas.filter((l) => (l.area || 'Outros') === materiaAberta) : []),
    [livrosAreas, materiaAberta],
  );

  const rowVirtualizer = useVirtualizer({
    count: livrosDaMateria.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // altura aproximada do card (76px imagem + paddings + gap)
    overscan: 5,
  });

  // SEO & Título dinâmico por aba da biblioteca
  useEffect(() => {
    const rotulos = {
      acervos: 'Biblioteca - Acervos | Vade Mecum PRIME',
      performance: 'Biblioteca - Performance & Desenvolvimento | Vade Mecum PRIME',
      materias: 'Biblioteca - Matérias do Direito | Vade Mecum PRIME',
    };
    document.title = rotulos[aba] || 'Biblioteca Jurídica | Vade Mecum PRIME';
  }, [aba]);

  useEffect(() => {
    // Mesma mecânica de aquecimento usada no desktop:
    // hidrata cache persistente → prefetch de todas as coleções → capas.
    const cancel = scheduleWarmBiblioteca(queryClient);

    if (!Capacitor.isNativePlatform()) return cancel;
    // Capas: qualquer rede — usuário quer instantâneo offline.
    startCapasPrefetch({ wifiOnly: false }).catch(() => {});
    startLeituraNativaPrefetch({ wifiOnly: true }).catch(() => {});
    return cancel;
  }, [queryClient]);


  if (isDesktop) {
    return (
      <Suspense fallback={<div className="min-h-dvh bg-background" />}>
        <BibliotecasDesktop />
      </Suspense>
    );
  }

  return (
    <main className="min-h-dvh bg-background pb-[calc(96px+var(--sai-bottom,0px))]">
      <PageHeader
        title="Biblioteca"
        onBack={() => navigate('/')}
        rightAction={
          <button
            onClick={() => navigate('/biblioteca-offline')}
            aria-label="Armazenamento Offline"
            className="w-12 h-12 sm:w-[52px] sm:h-[52px] rounded-full flex items-center justify-center bg-muted active:scale-95 transition-transform"
          >
            <HardDrive className="w-5 h-5 text-primary" />
          </button>
        }
      />

      <div className="max-w-3xl mx-auto w-full">
        {/* Painel marrom flush com o header, com a busca dentro */}
        <FilosofosPanel>
          <div className="[&>div]:!px-0 [&>div]:!mb-0">
            <BibliotecaSearchBar onAbrirLivro={(l) => setLivroAberto(l)} />
          </div>
        </FilosofosPanel>
        {/* Painéis hospedados pelo rodapé (Leitura, Favoritos, Recentes, Offline) */}
        <BibliotecaAtalhosBar onAbrirLivro={(l) => setLivroAberto(l)} />

        <div className="px-4 mt-6">
          <button
            onClick={handleUploadPdf}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-card hover:bg-secondary/50 border border-border/50 shadow-sm transition-colors relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                <FileUp className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-[15px] font-bold text-foreground flex items-center gap-2">
                  Personalizado
                </p>
                <p className="text-[12px] text-muted-foreground mt-0.5">Leia seus próprios PDFs no app</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground relative z-10" />
          </button>
          
          {customPdfsList.length > 0 && (
            <div className="mt-3 space-y-2">
              {customPdfsList.map(pdf => (
                <div key={pdf.id} className="flex items-center justify-between p-3 rounded-xl bg-card/50 border border-border/40">
                  <button 
                    onClick={() => handleOpenCustomPdf(pdf.id, pdf.titulo)}
                    className="flex-1 text-left min-w-0"
                  >
                    <p className="text-sm font-semibold text-foreground truncate">{pdf.titulo}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Salvo em {new Date(pdf.createdAt).toLocaleDateString()}
                    </p>
                  </button>
                  <button
                    onClick={(e) => handleDeleteCustomPdf(e, pdf.id)}
                    className="p-2 text-muted-foreground hover:text-red-500 transition-colors ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8">
          <ContinuarLeituraCarousel onAbrirLivro={(l) => setLivroAberto(l)} />
        </div>

        <div className="mt-8">
          <RecomendacoesCarousel onAbrirLivro={(l) => setLivroAberto(l)} />
        </div>

        <div className="px-4 pt-6 mb-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-primary/90 font-bold">
            {aba === 'acervos' ? 'ACERVO' : aba === 'performance' ? 'DESENVOLVIMENTO' : 'ÁREAS'}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-1 h-6 rounded-full bg-primary" />
            <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
              {aba === 'acervos' ? 'Acervos de livros' : aba === 'performance' ? 'Performance' : 'Matérias'}
            </h2>
          </div>
          <p className="text-sm leading-5 text-muted-foreground mt-1 ml-3 line-clamp-2 min-h-[2.5rem]">
            {aba === 'acervos'
              ? 'Explore as coleções completas por área, autor e temática jurídica.'
              : aba === 'performance'
                ? 'Oratória, liderança, português, pesquisa e leituras fora da toga.'
                : 'Todas as áreas do Direito reunidas para escolher e começar a ler.'}
          </p>
        </div>

        {/* Menu de alternância — mesmo padrão dos Resumos */}
        <div className="px-4 mb-6">
          <div className="relative flex items-center gap-1 p-1 rounded-full bg-secondary/60 border border-border/60">
            {ABAS.map((a) => {
              const ativo = aba === a.id;
              const Icon = a.icon;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAba(a.id)}
                  className="relative flex-1 flex items-center justify-center gap-1.5 h-10 rounded-full font-display text-[12px] font-bold uppercase tracking-wide transition-colors"
                >
                  {ativo && (
                    <span className="absolute inset-0 rounded-full bg-primary shadow-lg shadow-black/20" />
                  )}
                  <span className={`relative flex items-center gap-1.5 ${ativo ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                    <Icon className="w-4 h-4" />
                    {a.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>


        {aba === 'materias' ? (
          <div className="px-4">
            {loadingAreas && materias.length === 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-[112px] rounded-2xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : materias.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Nenhuma área disponível ainda.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {materias.map((m, i) => {
                  const s = styleForArea(m.name);
                  const Icon = s.icon;
                  return (
                    <motion.button
                      key={m.name}
                      type="button"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.35 }}
                      onClick={() => setMateriaAberta(m.name)}
                      className="relative flex flex-col gap-2 p-4 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all text-left min-h-[112px] active:scale-[0.985]"
                    >
                      <ChevronRight className="absolute top-3 right-3 w-4 h-4 text-muted-foreground" />
                      <Icon className="w-7 h-7 shrink-0" style={{ color: s.color }} strokeWidth={1.7} />
                      <div className="font-display font-bold text-foreground text-[13px] leading-tight uppercase line-clamp-2">
                        {m.name}
                      </div>
                      <p className="text-[11px] text-muted-foreground -mt-1">
                        {m.count} {m.count === 1 ? 'livro' : 'livros'}
                      </p>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        ) : aba === 'performance' ? (
          <div className="px-4 grid grid-cols-2 gap-3">
            {colecoesPerformance.map((c, i) => {
              const s = styleForPerformance(c.id);
              const Icon = s.icon;
              return (
                <motion.button
                  key={c.id}
                  type="button"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.35 }}
                  onClick={() => { track('biblioteca_colecao_opened', { colecao_id: c.id, colecao_label: c.label }); navigate(`/bibliotecas/${c.id}`); }}
                  className="relative flex flex-col gap-2 p-4 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all text-left min-h-[112px] active:scale-[0.985]"
                >
                  <ChevronRight className="absolute top-3 right-3 w-4 h-4 text-muted-foreground" />
                  <Icon className="w-7 h-7 shrink-0" style={{ color: s.color }} strokeWidth={1.7} />
                  <div className="font-display font-bold text-foreground text-[13px] leading-tight uppercase line-clamp-2">
                    {c.label}
                  </div>
                </motion.button>
              );
            })}
          </div>
        ) : (
          <div className="px-4 flex flex-col gap-2">
            {colecoesAcervos.map((c, i) => (
              <motion.button
                key={c.id}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                onClick={() => { track('biblioteca_colecao_opened', { colecao_id: c.id, colecao_label: c.label }); navigate(`/bibliotecas/${c.id}`); }}
                data-track="biblioteca_colecao_click"
                data-colecao-id={c.id}
                data-colecao-label={c.label}
                className="group relative flex items-stretch h-[104px] overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm hover:-translate-y-0.5 transition-transform text-left w-full active:scale-[0.985]"
              >
                <div className="relative w-[140px] shrink-0 overflow-hidden">
                  <img
                    src={c.cover}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    loading={i < 4 ? 'eager' : 'lazy'}
                    fetchPriority={i < 4 ? 'high' : 'auto'}
                    decoding="async"
                  />
                  {/* Fade suave para o card, sem tingir a capa */}
                  <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-r from-transparent to-card pointer-events-none" />
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center px-4 py-3 bg-card text-foreground">
                  <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-primary/90">
                    {c.eyebrow}
                  </p>
                  <h2 className="text-lg sm:text-xl font-bold leading-tight mt-0.5 truncate">
                    {c.label}
                  </h2>
                  <p className="text-xs text-muted-foreground leading-snug mt-1 line-clamp-2">
                    {c.subtitle}
                  </p>

                </div>

                <div className="flex items-center pr-4 text-muted-foreground">
                  <ChevronRight className="w-5 h-5" />
                </div>

                {/* Reflexo cascata ao entrar na biblioteca */}
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/25 to-transparent mix-blend-screen"
                  initial={{ x: '-40%', opacity: 0 }}
                  animate={{ x: '420%', opacity: [0, 1, 1, 0] }}
                  transition={{
                    delay: 0.25 + i * 0.18,
                    duration: 1.1,
                    ease: 'easeInOut',
                    times: [0, 0.15, 0.85, 1],
                  }}
                />
              </motion.button>
            ))}
          </div>
        )}


      </div>

      <BibliotecaBottomNav />

      {/* Matéria: abre de baixo para cima até 90% (mesmo padrão dos Resumos) */}
      <AnimatePresence>
        {materiaAberta && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMateriaAberta(null)}
              className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
              className="fixed bottom-0 left-0 right-0 z-[71] flex h-[90dvh] flex-col rounded-t-3xl border-t border-border bg-background pb-[calc(1rem+var(--sai-bottom,env(safe-area-inset-bottom,0px)))]"
            >
              <div className="flex items-center justify-center pt-2 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="flex items-center justify-between px-5 pb-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-secondary/70 flex items-center justify-center shrink-0">
                    {(() => {
                      const s = styleForArea(materiaAberta);
                      const Icon = s.icon;
                      return <Icon className="w-6 h-6" style={{ color: s.color }} strokeWidth={1.4} />;
                    })()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-xl text-foreground font-bold leading-none truncate uppercase">
                      {materiaAberta}
                    </h3>
                    <p className="text-muted-foreground text-[12px] mt-1">
                      {livrosDaMateria.length} {livrosDaMateria.length === 1 ? 'livro' : 'livros'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMateriaAberta(null)}
                  aria-label="Fechar"
                  className="w-9 h-9 rounded-full bg-secondary/70 flex items-center justify-center text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div ref={parentRef} className="flex-1 overflow-y-auto px-4 pb-6 relative">
                <div
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const l = livrosDaMateria[virtualRow.index];
                    return (
                      <VirtualLivroItem
                        key={virtualRow.key}
                        virtualRow={virtualRow}
                        livro={l}
                        onClick={() => setLivroAberto(l)}
                      />
                    );
                  })}
                </div>
                {livrosDaMateria.length === 0 && (
                  <p className="py-10 text-center text-sm text-muted-foreground">Nenhum livro nesta matéria.</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <LivroDetailSheet
        livro={livroAberto}
        open={!!livroAberto}
        onClose={() => setLivroAberto(null)}
      />

      <AnimatePresence>
        {customPdfUrl && (
          <PdfScrollReader
            url={customPdfUrl}
            titulo={customPdfTitle}
            onClose={() => {
              setCustomPdfUrl(null);
              setCustomPdfTitle('');
            }}
          />
        )}
      </AnimatePresence>

    </main>
  );
};

export default Bibliotecas;
