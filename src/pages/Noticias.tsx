import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Landmark, Clock, ExternalLink, Loader2, X, Share2, Scale, MessageCircle, Calendar, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsDesktop } from '@/hooks/use-desktop';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getNoticiasCache, prefetchNoticias, fetchNoticiaConteudo, type Noticia } from '@/services/noticiasService';
import { useReadNoticias } from '@/hooks/useNoticiaTracking';
import { newsImg } from '@/lib/cdnImg';
import NoticiaComentarios from '@/components/vademecum/NoticiaComentarios';
import NoticiaViewerSheet from '@/components/vademecum/NoticiaViewerSheet';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { LoadingState, EmptyState } from '@/components/ui/states';
import { Newspaper } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';



const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

function formatDateParts(dateStr: string) {
  const d = new Date(dateStr);
  const day = d.getDate();
  const month = MONTHS[d.getMonth()];
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return { day, month, time: `${hours}:${minutes}` };
}

function formatDateFull(dateStr: string) {
  const d = new Date(dateStr);
  const day = d.getDate();
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day} ${months[d.getMonth()]} · ${hours}:${minutes}`;
}

function getDayList(centerDate: Date, count = 5): Date[] {
  // Most recent day first (esquerda), datas passadas à direita.
  const days: Date[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(centerDate);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}


function dayLabel(date: Date): string {
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'HOJE';
  return WEEKDAYS[date.getDay()];
}

function formatFullDate(date: Date): string {
  const weekdayFull = ['Domingo', 'Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado'];
  const monthFull = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${weekdayFull[date.getDay()]}, ${date.getDate()} de ${monthFull[date.getMonth()]} de ${date.getFullYear()}`;
}

const Noticias = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const isDesktop = useIsDesktop();
  const [noticias, setNoticias] = useState<Noticia[]>(() => getNoticiasCache() ?? []);
  const { isRead, markRead } = useReadNoticias();
  const [loading, setLoading] = useState<boolean>(() => getNoticiasCache() === null);
  const [selectedNoticia, setSelectedNoticia] = useState<Noticia | null>(null);
  const [dataFiltro, setDataFiltro] = useState<string>(''); // '' = todas, 'YYYY-MM-DD' = dia
  const [comentariosOpen, setComentariosOpen] = useState(false);
  const [comentariosCount, setComentariosCount] = useState(0);
  const [infoOpen, setInfoOpen] = useState(false);

  // Abre a notícia e lazy-carrega o conteúdo markdown (a lista não traz mais o corpo completo)
  const openNoticia = (n: Noticia) => {
    markRead(n.id);
    setSelectedNoticia(n);
    if (!n.conteudo_md) {
      fetchNoticiaConteudo(n.id).then((md) => {
        if (!md) return;
        setSelectedNoticia((cur) => (cur && cur.id === n.id ? { ...cur, conteudo_md: md, conteudo: md } : cur));
      });
    }
  };

  useEffect(() => {
    if (getNoticiasCache()) return; // já hidratado no state inicial
    prefetchNoticias().then(() => {
      const data = getNoticiasCache();
      if (data) setNoticias(data);
      setLoading(false);
    });
  }, []);


  // Auto-open noticia from navigation state or ?item= query param
  useEffect(() => {
    const stateId = (location.state as any)?.noticiaId as string | undefined;
    const queryId = new URLSearchParams(location.search).get('item') || undefined;
    const noticiaId = stateId || queryId;
    if (!noticiaId) return;
    if (selectedNoticia?.id === noticiaId) return;

    const found = noticias.find(n => n.id === noticiaId);
    if (found) {
      openNoticia(found);
      return;
    }
    // Fallback: fetch directly if not in cached list
    let cancel = false;
    supabase
      .from('noticias_juridicas')
      .select('*')
      .eq('id', noticiaId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancel && data) { markRead((data as any).id); setSelectedNoticia(data as any); }
      });
    return () => { cancel = true; };
  }, [noticias, location.state, location.search, selectedNoticia?.id]);

  // Contagem de comentários ao abrir notícia
  useEffect(() => {
    if (!selectedNoticia) {
      setComentariosCount(0);
      setComentariosOpen(false);
      return;
    }
    let cancel = false;
    supabase
      .from('noticias_comentarios')
      .select('*', { count: 'exact', head: true })
      .eq('noticia_ref', selectedNoticia.id)
      .then(({ count }) => {
        if (!cancel) setComentariosCount(count ?? 0);
      });
    return () => { cancel = true; };
  }, [selectedNoticia]);

  const toYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayYMD = toYMD(new Date());
  const yesterdayYMD = toYMD(new Date(Date.now() - 86400000));

  const datasDisponiveis = useMemo(() => {
    const set = new Set<string>();
    for (const n of noticias) set.add(toYMD(new Date(n.data_publicacao)));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [noticias]);

  const labelData = (ymd: string) => {
    if (ymd === todayYMD) return 'Hoje';
    if (ymd === yesterdayYMD) return 'Ontem';
    const [, m, d] = ymd.split('-');
    const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return `${parseInt(d, 10)} ${meses[parseInt(m, 10) - 1]}`;
  };

  // Default filter: hoje sempre (mais recente à esquerda). Usuário pode escolher outro dia.
  useEffect(() => {
    if (!dataFiltro) {
      setDataFiltro(todayYMD);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  const finalFiltered = useMemo(() => {
    const filtered = !dataFiltro
      ? noticias
      : noticias.filter(n => toYMD(new Date(n.data_publicacao)) === dataFiltro);

    return [...filtered].sort((a, b) => {
      const dateDiff = new Date(b.data_publicacao).getTime() - new Date(a.data_publicacao).getTime();
      if (dateDiff !== 0) return dateDiff;
      return b.id.localeCompare(a.id);
    });
  }, [noticias, dataFiltro]);

  const heroNoticia = finalFiltered.length > 0 ? finalFiltered[0] : null;
  const listNoticias = finalFiltered.slice(1);


  const compartilhar = async (n: Noticia) => {
    const shareData = {
      title: n.titulo,
      text: n.resumo || n.titulo,
      url: n.link,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${n.titulo}\n${n.link}`);
        toast.success('Link copiado');
      }
    } catch {
      /* user cancelled */
    }
  };

  const fonteLabel = (_f: Noticia['fonte']) => 'Migalhas';
  const FonteIcon = (_props: { fonte: Noticia['fonte'] }) => <Scale className="w-3 h-3" />;

  const ContentViewer = ({ noticia }: { noticia: Noticia }) => (
    <div className="space-y-4">
      {noticia.imagem_url && (
        <img
          src={newsImg(noticia.imagem_url!, 960)}
          alt={noticia.titulo}
          className="w-full max-h-52 object-cover rounded-xl -mx-1"
          decoding="async"
        />
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary text-primary-foreground uppercase tracking-wide">
          <FonteIcon fonte={noticia.fonte} />
          {fonteLabel(noticia.fonte)}
        </span>
        {noticia.categoria && (
          <span className="px-2 py-0.5 rounded-md bg-primary/15 text-primary text-[10px] font-bold">
            {noticia.categoria}
          </span>
        )}
      </div>
      <h2 className="font-display text-xl text-foreground leading-tight font-bold">
        {noticia.titulo}
      </h2>
      <p className="text-muted-foreground text-xs font-body flex items-center gap-1.5">
        <Clock className="w-3 h-3" />
        {new Date(noticia.data_publicacao).toLocaleDateString('pt-BR')} –{' '}
        {new Date(noticia.data_publicacao).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>

      {noticia.conteudo_md ? (
        <div className="prose prose-sm max-w-none dark:prose-invert font-body prose-headings:font-display prose-headings:text-foreground prose-p:text-foreground/90 prose-p:my-3 prose-p:leading-relaxed prose-a:text-primary prose-strong:text-foreground prose-img:rounded-lg prose-img:my-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{noticia.conteudo_md}</ReactMarkdown>
        </div>
      ) : (
        <div className="text-[15px] font-body leading-relaxed text-foreground whitespace-pre-line">
          {noticia.conteudo || noticia.resumo || 'Conteúdo não disponível.'}
        </div>
      )}

      {/* espaço para não ficar sob os FABs */}
      <div className="h-24" />
    </div>
  );

  // Faixa de dias: hoje à esquerda, passado à direita.
  const centerDate = useMemo(() => new Date(), []);
  const dayList = useMemo(() => getDayList(centerDate, 5), [centerDate]);
  const availableDatesSet = useMemo(() => new Set(datasDisponiveis), [datasDisponiveis]);


  return (
    <div className="min-h-dvh bg-background">
      {/* Gradient header — same pattern as Novidades */}
      <div className="bg-gradient-to-b from-primary/30 via-primary/15 to-background pb-4">
        <PageHeader
          title="Notícias Legislativas"
          subtitle="Últimas do mundo jurídico"
          onBack={() => navigate(-1)}
          rightAction={
            <button
              onClick={() => setInfoOpen((v) => !v)}
              aria-expanded={infoOpen}
              aria-label="Sobre esta seção"
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                infoOpen ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Info className="w-4 h-4" />
            </button>
          }
        />

        {/* Info panel — desce de cima */}

        <AnimatePresence initial={false}>
          {infoOpen && (
            <motion.div
              key="info-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="overflow-hidden max-w-3xl mx-auto px-4"
            >
              <div className="mt-1 mb-2 rounded-2xl border border-primary/30 bg-card/60 backdrop-blur-sm p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  <h3 className="font-display text-sm font-bold text-foreground">O que é esta seção?</h3>
                </div>
                <p className="font-body text-[12.5px] leading-relaxed text-muted-foreground">
                  Aqui você acompanha as <strong className="text-foreground">Notícias Legislativas</strong> em tempo real:
                  o que a Câmara dos Deputados aprova, o que o Senado discute e as
                  principais matérias jurídicas publicadas pelo <strong className="text-foreground">Migalhas</strong>.
                </p>
                <p className="font-body text-[12.5px] leading-relaxed text-muted-foreground">
                  Use o calendário acima para navegar por dia — <strong className="text-foreground">o dia atual fica sempre à esquerda</strong> e
                  os anteriores à direita. Toque em uma notícia para ler o conteúdo completo,
                  comentar com outros estudantes e compartilhar.
                </p>
                <p className="font-body text-[11.5px] leading-relaxed text-muted-foreground/80 italic">
                  Ideal para se manter atualizado para provas da OAB, concursos e para acompanhar
                  o que está mudando na legislação brasileira.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>


        {/* Day calendar strip — same style as Radar de Leis */}
        <div className="flex justify-between gap-1.5 px-3 py-3 max-w-3xl mx-auto">
          {dayList.map((day, idx) => {
            const key = toYMD(day);
            const isSelected = dataFiltro === key;
            const hasData = availableDatesSet.has(key);
            const label = dayLabel(day);
            const prev = dayList[idx - 1];
            const monthChanged = !prev || prev.getMonth() !== day.getMonth();
            return (
              <button
                key={key}
                onClick={() => setDataFiltro(key)}
                className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[64px] rounded-2xl transition-all shadow-lg shadow-black/20 ${
                  isSelected
                    ? 'bg-primary shadow-primary/30'
                    : 'bg-card/40 text-foreground hover:bg-card/60'
                }`}
              >
                {monthChanged && (
                  <span
                    className={`absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-[1px] rounded-full text-[9px] font-body font-semibold uppercase tracking-wider ${
                      isSelected ? 'bg-primary text-black' : 'bg-primary/20 text-primary'
                    }`}
                  >
                    {MONTHS[day.getMonth()]}
                  </span>
                )}
                <span className={`text-xs font-body font-semibold uppercase tracking-wide ${isSelected ? 'text-black' : 'text-foreground/85'}`}>{label}</span>
                <span className={`text-2xl font-display font-bold leading-none ${isSelected ? 'text-black' : 'text-foreground'}`}>{day.getDate()}</span>
                {hasData && !isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected date label */}
        <div className="flex items-center gap-2 px-5 pb-1 max-w-3xl mx-auto">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-display text-primary">
            {formatFullDate(dataFiltro ? new Date(dataFiltro + 'T00:00:00') : centerDate)}
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">



        {/* Sem spinner: quando não há cache, mostramos a lista assim que chegar; nunca bloqueia a UI */}

        {(
          <>

            {/* Hero card — edge-to-edge no mobile */}
            {heroNoticia && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => { openNoticia(heroNoticia); }}
                className="overflow-hidden bg-card border-y md:border md:rounded-2xl border-border cursor-pointer hover:border-primary/30 transition-colors -mx-4 md:mx-0"
              >
                {heroNoticia.imagem_url ? (
                  <div className="relative h-44 md:h-40 overflow-hidden news-cover-shine">
                    <img
                      src={newsImg(heroNoticia.imagem_url!, 960)}
                      srcSet={`${newsImg(heroNoticia.imagem_url!, 640)} 640w, ${newsImg(heroNoticia.imagem_url!, 960)} 960w`}
                      sizes="(max-width: 768px) 100vw, 960px"
                      alt={heroNoticia.titulo}
                      className="w-full h-full object-cover"
                      fetchPriority="high"
                      decoding="async"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                    {!isRead(heroNoticia.id) && (
                      <span className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/40 text-primary-foreground border border-primary/60 backdrop-blur-sm uppercase tracking-wide shadow-lg">
                        Novo
                      </span>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary text-primary-foreground uppercase tracking-wide">
                          {fonteLabel(heroNoticia.fonte)}
                        </span>
                        {heroNoticia.categoria && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary text-primary-foreground">
                            {heroNoticia.categoria}
                          </span>
                        )}
                      </div>
                      <h2 className="font-display text-lg text-white leading-tight">
                        {heroNoticia.titulo}
                      </h2>
                      <div className="flex items-center gap-1.5 text-white/70 text-[11px] font-body">
                        <Clock className="w-3 h-3" />
                        {formatDateFull(heroNoticia.data_publicacao)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative p-5 bg-gradient-to-br from-primary/15 via-card to-card">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary text-primary-foreground uppercase tracking-wide">
                          {fonteLabel(heroNoticia.fonte)}
                        </span>
                        {heroNoticia.categoria && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary text-primary-foreground">
                            {heroNoticia.categoria}
                          </span>
                        )}
                      </div>
                      <h2 className="font-display text-lg text-foreground leading-tight">
                        {heroNoticia.titulo}
                      </h2>
                      {heroNoticia.resumo && (
                        <p className="text-muted-foreground text-xs font-body line-clamp-2">
                          {heroNoticia.resumo}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-body">
                        <Clock className="w-3 h-3" />
                        {formatDateFull(heroNoticia.data_publicacao)}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* List cards */}
            <div className="space-y-3 -mx-4 md:mx-0">
              {listNoticias.map((item, i) => {
                const { time } = formatDateParts(item.data_publicacao);
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => { openNoticia(item); import('@/lib/continuity').then(m => m.recordActivity({ path: `/noticias?item=${item.id}`, label: item.titulo, kind: 'noticia' })); }}
                    className="group flex items-stretch gap-0 bg-card border-y md:border md:rounded-2xl border-border hover:border-primary/40 active:bg-secondary/30 transition-colors cursor-pointer overflow-hidden"
                  >
                    {/* Thumbnail */}
                    {item.imagem_url ? (
                      <div className="w-28 sm:w-32 shrink-0 relative overflow-hidden news-cover-shine">
                        <img
                          src={newsImg(item.imagem_url!, 240)}
                          alt={item.titulo}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                        {!isRead(item.id) && (
                          <span className="absolute bottom-1.5 left-1.5 z-10 inline-flex items-center text-[9px] font-bold px-1.5 py-[1px] rounded bg-primary/40 text-primary-foreground border border-primary/60 backdrop-blur-sm uppercase tracking-wide">
                            Novo
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="w-2 shrink-0 bg-primary/60" />
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between gap-2 p-4">
                      <h3 className="font-display text-[15px] sm:text-base text-foreground leading-snug line-clamp-3 group-hover:text-primary transition-colors">
                        {item.titulo}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap text-[11px] font-body text-muted-foreground">
                        <span className="inline-flex items-center gap-1 text-primary font-semibold">
                          <Clock className="w-3 h-3" />
                          {time}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                        <span className="inline-flex items-center gap-1">
                          <FonteIcon fonte={item.fonte} />
                          {fonteLabel(item.fonte)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>


            {finalFiltered.length === 0 && (
              loading ? (
                <LoadingState variant="list" rows={4} label="Carregando notícias" />
              ) : (
                <EmptyState
                  icon={Newspaper}
                  title={noticias.length === 0 ? 'Nenhuma notícia disponível' : 'Sem resultados'}
                  description={
                    noticias.length === 0
                      ? 'Ainda não há notícias carregadas. Tente novamente em instantes.'
                      : 'Não encontramos notícias para esta busca ou data. Tente outro filtro.'
                  }
                />
              )
            )}

          </>
        )}
      </div>

      <NoticiaViewerSheet
        noticia={selectedNoticia}
        onClose={() => {
          setSelectedNoticia(null);
          // Limpa ?item= da URL para não reabrir ao voltar/atualizar
          if (new URLSearchParams(location.search).get('item')) {
            navigate('/noticias', { replace: true });
          }
        }}
      />

    </div>
  );
};

export default Noticias;
