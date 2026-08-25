import { supabase } from '@/integrations/supabase/client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, BookOpen, Heart, Info, FileText, Bell, Clock, Layers, Calendar, Presentation } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatarSobreLivro, estimarMinutosLeitura, formatarDuracao } from '@/lib/livroSobreFormat';
import { useLivroPageCount } from '@/hooks/useLivroPageCount';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { directImg } from '@/lib/cdnImg';
import type { LivroNormalizado } from '@/lib/bibliotecaColecoes';
import { openPdfNative } from '@/lib/fileOpener';
import { useBibliotecaCapa } from '@/hooks/useBibliotecaAsset';
import { useIsDesktop } from '@/hooks/use-desktop';
import PdfScrollReader from './PdfScrollReader';
import LeitorNativo from './LeitorNativo';
import LerAgoraDialog, { LerModo } from './LerAgoraDialog';
import InAppWebView from './InAppWebView';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { getLocalPdfUrl, isPdfCached, downloadPdf } from '@/services/bibliotecaPdfCache';
import { isFavorito, toggleFavorito, pushRecente, subscribeTracking } from '@/lib/bibliotecaTracking';
import { useFeatureLimit } from '@/hooks/useFeatureLimit';
import PremiumGate from '@/components/PremiumGate';
import LembreteSheet from '@/components/lembretes/LembreteSheet';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useNavigate } from 'react-router-dom';
import { Library } from 'lucide-react';

interface LivroDetailSheetProps {
  livro: LivroNormalizado | null;
  open: boolean;
  onClose: () => void;
}

const LivroDetailSheet = ({ livro, open, onClose }: LivroDetailSheetProps) => {
  useEscapeKey(open, onClose);
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const contentRef = useRef<HTMLDivElement>(null);
  const [readerMode, setReaderMode] = useState<null | 'pdf' | 'nativa' | 'online'>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [lerDialog, setLerDialog] = useState(false);

  const [pdfCached, setPdfCached] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState<null | number>(null);
  const [pdfUrlForReader, setPdfUrlForReader] = useState<string | null>(null);
  const [fav, setFav] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [lembreteOpen, setLembreteOpen] = useState(false);
  const [apresentacaoId, setApresentacaoId] = useState<string | null>(null);
  const { canUse, register, used, config } = useFeatureLimit('biblioteca_ler', {
    scope: livro ? String(livro.id) : null,
  });


  // Ficha técnica: nº de páginas + tempo médio de leitura (lazy via pdfjs)
  const numPages = useLivroPageCount(open ? livro?.download : null);

  // Apresentação narrada disponível para este livro
  useEffect(() => {
    let cancel = false;
    setApresentacaoId(null);
    if (!open || !livro) return;
    (async () => {
      const col = String(livro.colecaoId || '');
      const variantes = Array.from(new Set([col, `biblioteca_${col}`, `biblioteca_${col.replace(/-/g, '_')}`]));
      const { data } = await supabase
        .from('apresentacoes_narradas')
        .select('id')
        .eq('livro_id', String(livro.id))
        .in('livro_tabela', variantes)
        .eq('publicada', true)
        .maybeSingle();
      if (!cancel) setApresentacaoId(data?.id ?? null);
    })();
    return () => { cancel = true; };
  }, [open, livro?.id, livro?.colecaoId]);
  const minutosLeitura = estimarMinutosLeitura(numPages);
  const sobreMarkdown = livro ? formatarSobreLivro(livro.sobre, { titulo: livro.titulo, autor: livro.autor }) : '';

  // Capas resolvem localmente (filesystem) no app nativo quando pré-baixadas,
  // caindo para CDN no web/desktop. Chamadas de hook ficam antes de qualquer return.
  const capaUrl = useBibliotecaCapa(livro?.capa, 500);
  const capaHorizontalUrl = useBibliotecaCapa(livro?.capaHorizontal, 1400);

  useEffect(() => {
    if (!livro?.download) return;
    if (!Capacitor.isNativePlatform()) { setPdfCached(false); return; }
    isPdfCached(livro.download).then(setPdfCached).catch(() => setPdfCached(false));
  }, [livro?.download]);

  // Sync favorito + registra recente quando abre um livro
  useEffect(() => {
    if (!livro || !open) return;
    setFav(isFavorito(livro));
    pushRecente(livro);
    const unsub = subscribeTracking(() => setFav(isFavorito(livro)));
    return () => unsub();
  }, [livro, open]);

  // Lock scroll do body/html e trava a posição enquanto o sheet estiver aberto.
  // Impede que gestos passem para a página atrás (iOS/Android).
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const bodyPrev = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      touchAction: document.body.style.touchAction,
    };
    const htmlPrev = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.touchAction = 'none';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = bodyPrev.overflow;
      document.body.style.position = bodyPrev.position;
      document.body.style.top = bodyPrev.top;
      document.body.style.width = bodyPrev.width;
      document.body.style.touchAction = bodyPrev.touchAction;
      document.documentElement.style.overflow = htmlPrev;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  // Reset síncrono do scroll no mount/troca de livro. O `key={livro.id}` no
  // container abaixo força remount, então este effect roda com scrollTop já 0.
  useLayoutEffect(() => {
    if (!open || !livro) return;
    const el = contentRef.current;
    if (el) el.scrollTop = 0;
  }, [open, livro?.id]);


  if (!livro && !open) return null;
  if (!livro) return null;

  const hasOnline = !!livro.link;
  const hasPdf = !!livro.download;

  const ensurePdfLocalUrl = async (): Promise<string> => {
    if (!livro.download) return '';
    if (Capacitor.isNativePlatform()) {
      const local = await getLocalPdfUrl(livro.download);
      if (local) return local;
    }
    return livro.download;
  };

  const handleDownloadPdf = async () => {
    if (!livro.download) return;
    if (!Capacitor.isNativePlatform()) {
      const { openExternal } = await import('@/lib/nativeBrowser');
      openExternal(livro.download);
      return;
    }
    try {
      setDownloadingPdf(0);
      await downloadPdf(livro.download, (loaded, total) => {
        if (total > 0) setDownloadingPdf(Math.round((loaded / total) * 100));
      });
      setDownloadingPdf(null);
      setPdfCached(true);
      toast.success('PDF disponível offline');
    } catch (e: any) {
      setDownloadingPdf(null);
      toast.error('Falha ao baixar PDF', { description: e?.message });
    }
  };

  const onSelectModo = async (modo: LerModo, isPreview: boolean = false) => {
    setIsPreviewMode(isPreview);

    // Se NÃO for preview, aplicamos o bloqueio
    if (!isPreview && !canUse) { setLerDialog(false); setGateOpen(true); return; }
    
    // Registra o uso se não for preview
    if (!isPreview) {
      register(String(livro.id));
    }

    if (modo === 'download') { handleDownloadPdf(); return; }
    if (modo === 'desktop') {
      const url = typeof window !== 'undefined' ? window.location.href : '';
      try {
        if (navigator.share) {
          await navigator.share({ title: livro.titulo, url });
        } else if (navigator.clipboard && url) {
          await navigator.clipboard.writeText(url);
          toast.success('Link copiado', { description: 'Cole no navegador do desktop para continuar lendo.' });
        }
      } catch { /* usuário cancelou */ }
      setLerDialog(false);
      return;
    }
    setLerDialog(false);
    if (modo === 'nativa') setReaderMode('nativa');
    else if (modo === 'pdf') {
      const url = await ensurePdfLocalUrl();
      setPdfUrlForReader(url);
      setReaderMode('pdf');
    } else if (modo === 'online' && livro.link) {
      setReaderMode('online');
    }
  };


  const openNativoSystem = () => {
    if (livro.download) openPdfNative(livro.download, `${livro.titulo}.pdf`);
  };

  const temAnaliseTecnica =
    !!livro.anoLancamento ||
    !!livro.editora ||
    (livro.curiosidades && livro.curiosidades.length > 0) ||
    !!livro.analiseDetalhada;

  return createPortal((
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            onTouchMove={(e) => e.preventDefault()}
            onWheel={(e) => e.preventDefault()}
            style={{ touchAction: 'none' }}
            className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {open && (
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-[1001] h-[90dvh] bg-background flex flex-col overflow-hidden rounded-t-3xl shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.5)]"
          >


            {/* Header flutuante — botão chevron-down + favoritar */}
            <div className="absolute top-[calc(var(--sai-top,0px)+0.75rem)] left-4 z-20 flex gap-2">
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-xl backdrop-saturate-150 transition-colors flex items-center justify-center border border-white/25 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.25)]"
              >
                <ChevronDown className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="absolute top-[calc(var(--sai-top,0px)+0.75rem)] right-4 z-20 flex gap-2">
              <button
                onClick={() => setLembreteOpen(true)}
                aria-label="Criar lembrete de leitura"
                className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-xl backdrop-saturate-150 transition-colors flex items-center justify-center border border-white/25 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.25)]"
              >
                <Bell className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => {
                  const now = toggleFavorito(livro);
                  setFav(now);
                  toast.success(now ? 'Adicionado aos favoritos' : 'Removido dos favoritos');
                }}
                aria-label={fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-xl backdrop-saturate-150 transition-colors flex items-center justify-center border border-white/25 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.25)]"
              >
                <Heart className={`w-5 h-5 ${fav ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
              </button>
            </div>

            {/* Content scroll */}
            <div key={String(livro.id)} ref={contentRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              {/* Backdrop horizontal — cover fills full landscape with palette-tinted gradient */}
              <div className="relative w-full h-[clamp(210px,28dvh,252px)] overflow-hidden bg-background">
                {(capaHorizontalUrl || capaUrl) && (
                  <img
                    src={capaHorizontalUrl || capaUrl}
                    alt=""
                    aria-hidden
                    className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-60"
                  />
                )}
                {(capaHorizontalUrl || capaUrl) && (
                  <img
                    src={capaHorizontalUrl || capaUrl}
                    alt=""
                    aria-hidden
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ objectPosition: 'center' }}
                    onLoad={() => { const el = contentRef.current; if (el && el.scrollTop < 4) el.scrollTop = 0; }}
                  />
                )}
                {/* Palette-tinted gradients (uses theme primary/wine) to blend, not black-hollow */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />
                <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-transparent to-primary/20 mix-blend-multiply" />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />

                {/* Capa vertical sobreposta */}
                {capaUrl && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-3 z-10">
                    <img
                      src={capaUrl}
                      alt={livro.titulo}
                      className="w-28 h-40 rounded-lg object-cover shadow-[0_20px_60px_-10px_rgba(0,0,0,0.7)] ring-1 ring-white/10"
                      onLoad={() => { const el = contentRef.current; if (el && el.scrollTop < 4) el.scrollTop = 0; }}
                    />
                  </div>
                )}

              </div>

              <div className="px-5 pb-[calc(18px+var(--sai-bottom,0px))] space-y-4 max-w-2xl mx-auto pt-4">
                <div className="text-center space-y-1.5">
                  <h2 className="font-display text-lg sm:text-xl font-bold text-foreground leading-tight break-words px-2">
                    {livro.titulo}
                  </h2>
                  {livro.autor && (
                    <p className="text-sm text-muted-foreground">{livro.autor}</p>
                  )}
                  {livro.area && (
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium uppercase tracking-wider">
                        {livro.area}
                      </span>
                    </div>
                  )}
                </div>

                {/* Único botão de ação */}
                <div className="pt-1">
                  <Button
                    className="w-full h-14 text-lg font-semibold gap-2.5 rounded-2xl shadow-lg"
                    onClick={() => {
                      // No desktop, pula o dialog mobile e vai direto para a
                      // leitura nativa (layout desktop já implementado dentro
                      // do LeitorNativo).
                      if (isDesktop) {
                        if (!canUse) { setGateOpen(true); return; }
                        register(String(livro.id));
                        setReaderMode('nativa');

                        return;
                      }
                      setLerDialog(true);
                    }}
                    disabled={!hasPdf && !hasOnline}
                  >
                    <BookOpen className="w-5 h-5" />
                    Ler agora
                  </Button>
                  {apresentacaoId && (
                    <Button
                      variant="secondary"
                      className="w-full h-12 mt-2 text-base font-semibold gap-2.5 rounded-2xl border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                      onClick={() => navigate(`/apresentacao/${apresentacaoId}`)}
                    >
                      <Presentation className="w-5 h-5" />
                      Ver apresentação
                    </Button>
                  )}
                </div>

                {/* Ficha técnica rápida — páginas, tempo médio, ano */}
                {(numPages || minutosLeitura || livro.anoLancamento) && (
                  <div className="grid grid-cols-3 gap-2">
                    <FichaItem
                      icon={Layers}
                      label="Páginas"
                      value={numPages ? String(numPages) : '—'}
                      loading={!numPages && !!livro.download}
                    />
                    <FichaItem
                      icon={Clock}
                      label="Leitura média"
                      value={formatarDuracao(minutosLeitura)}
                      loading={!minutosLeitura && !!livro.download}
                    />
                    <FichaItem
                      icon={Calendar}
                      label="Publicado"
                      value={livro.anoLancamento || '—'}
                    />
                  </div>
                )}

                {/* Tabs Sobre / Análise técnica — rounded */}
                <Tabs defaultValue="sobre" className="w-full">
                  <TabsList className="w-full grid grid-cols-2 bg-secondary/60 h-11 rounded-full p-1">
                    <TabsTrigger
                      value="sobre"
                      className="text-sm gap-1.5 rounded-full data-[state=active]:shadow-sm"
                    >
                      <Info className="w-4 h-4" />
                      Sobre
                    </TabsTrigger>
                    <TabsTrigger
                      value="analise"
                      className="text-sm gap-1.5 rounded-full data-[state=active]:shadow-sm"
                    >
                      <FileText className="w-4 h-4" />
                      Análise técnica
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="sobre" className="pt-4">
                    {sobreMarkdown ? (
                      <div className="text-[15px] text-foreground/85 leading-relaxed space-y-3 [&_p]:leading-relaxed [&_strong]:text-foreground [&_strong]:font-semibold">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {sobreMarkdown}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-[15px] text-muted-foreground text-center py-6">
                        Sinopse ainda não disponível para este livro.
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="analise" className="pt-4 space-y-4">
                    {!temAnaliseTecnica && (
                      <p className="text-[15px] text-muted-foreground text-center py-6">
                        Análise técnica ainda não disponível para este livro.
                      </p>
                    )}
                    {(livro.anoLancamento || livro.editora) && (
                      <div className="grid grid-cols-2 gap-3">
                        {livro.anoLancamento && (
                          <InfoBlock label="Ano" value={livro.anoLancamento} />
                        )}
                        {livro.editora && (
                          <InfoBlock label="Editora" value={livro.editora} />
                        )}
                      </div>
                    )}

                    {livro.curiosidades && livro.curiosidades.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-display font-semibold uppercase tracking-widest text-primary/80">
                          Curiosidades
                        </h4>
                        <ul className="space-y-2">
                          {livro.curiosidades.map((c, i) => (
                            <li
                              key={i}
                              className="text-[15px] text-foreground/85 leading-relaxed pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-primary before:font-bold"
                            >
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {livro.analiseDetalhada && (
                      <>
                        <div className="h-px bg-border" />
                        <div className="space-y-2">
                          <h4 className="text-xs font-display font-semibold uppercase tracking-widest text-primary/80">
                            Análise detalhada
                          </h4>
                          <p className="text-[15px] text-foreground/85 leading-relaxed whitespace-pre-line">
                            {livro.analiseDetalhada}
                          </p>
                        </div>
                      </>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
            </motion.div>
        )}
      </AnimatePresence>



      {/* Diálogo de escolha de modo */}
      <LerAgoraDialog
        open={lerDialog}
        onClose={() => setLerDialog(false)}
        onSelect={(m) => onSelectModo(m, false)}
        onSelectExample={(m) => onSelectModo(m, true)}
        hasPdf={hasPdf}
        hasOnline={hasOnline}
        pdfCached={pdfCached}
        downloadProgress={downloadingPdf}
      />

      {/* Leitores em fullscreen */}
      {readerMode === 'pdf' && (pdfUrlForReader || livro.download) && (
        <PdfScrollReader
          url={pdfUrlForReader || livro.download!}
          titulo={livro.titulo}
          isPreview={isPreviewMode}
          onClose={() => { setReaderMode(null); setPdfUrlForReader(null); setIsPreviewMode(false); }}
        />
      )}
      {readerMode === 'nativa' && livro.download && (
        <LeitorNativo
          livroId={String(livro.id)}
          livroTabela={livro.colecaoId}
          pdfUrl={livro.download}
          titulo={livro.titulo}
          autor={livro.autor}
          ano={livro.anoLancamento}
          editora={livro.editora}
          sobre={livro.sobre}
          curiosidades={livro.curiosidades}
          capa={livro.capa}
          isPreview={isPreviewMode}
          onClose={() => { setReaderMode(null); setIsPreviewMode(false); }}
        />
      )}
      {readerMode === 'online' && livro.link && (
        <InAppWebView url={livro.link} titulo={livro.titulo} onClose={() => setReaderMode(null)} />
      )}

      <PremiumGate
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        feature="biblioteca"
        title="Você já leu seu livro grátis deste mês"
        description="No plano gratuito você lê 1 livro por mês — com leitura nativa, PDF, folheada, offline e desktop. Assine para liberar todo o acervo."
        usageLabel={config ? 'Livro gratuito do mês já utilizado' : undefined}
      />

      <LembreteSheet
        open={lembreteOpen}
        onClose={() => setLembreteOpen(false)}
        livroId={String(livro.id)}
        livroArea={livro.colecaoId}
        livroTitulo={livro.titulo}
        livroCapa={capaUrl}
      />
    </>
  ), document.body);
};

const InfoBlock = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-secondary/40 border border-border/50 p-3">
    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
      {label}
    </div>
    <div className="text-sm font-semibold text-foreground mt-0.5">{value}</div>
  </div>
);

const FichaItem = ({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  loading?: boolean;
}) => (
  <div className="rounded-2xl bg-secondary/40 border border-border/50 p-3 flex flex-col items-center justify-center text-center gap-1">
    <Icon className="w-4 h-4 text-primary/80" />
    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold leading-tight">
      {label}
    </div>
    <div className={`text-sm font-bold leading-tight ${loading ? 'text-muted-foreground/60 animate-pulse' : 'text-foreground'}`}>
      {loading ? '…' : value}
    </div>
  </div>
);

export default LivroDetailSheet;
