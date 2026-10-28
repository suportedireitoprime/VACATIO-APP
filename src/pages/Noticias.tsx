import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Landmark, Clock, ExternalLink, Loader2, X, Share2, Scale, MessageCircle, Calendar, Info, Building2, Gavel } from 'lucide-react';
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
import { getNoticiasCache, prefetchNoticias, fetchNoticiaConteudo, type Noticia, type NoticiaFonte } from '@/services/noticiasService';
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

type CategoriaFiltro = 'todas' | 'migalhas' | 'stf' | 'camara' | 'senado';

interface CategoriaTab {
  id: CategoriaFiltro;
  label: string;
  shortLabel: string;
  icon: typeof Scale;
}

const CATEGORIA_TABS: CategoriaTab[] = [
  { id: 'todas', label: 'Todas as Notícias', shortLabel: 'Todas', icon: Newspaper },
  { id: 'migalhas', label: 'Notícias Jurídicas', shortLabel: 'Jurídicas', icon: Scale },
  { id: 'stf', label: 'STF', shortLabel: 'STF', icon: Gavel },
  { id: 'camara', label: 'Câmara dos Deputados', shortLabel: 'Câmara', icon: Building2 },
  { id: 'senado', label: 'Senado Federal', shortLabel: 'Senado', icon: Landmark },
];

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
  const [categoriaAtiva, setCategoriaAtiva] = useState<CategoriaFiltro>('todas');
  const [infoOpen, setInfoOpen] = useState(false);

  // Abre a notícia e lazy-carrega o conteúdo markdown
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
    if (getNoticiasCache()) return;
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
    }
  }, [noticias, location.state, location.search, selectedNoticia?.id]);

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
    for (const n of noticias) {
      if (categoriaAtiva === 'todas' || n.fonte === categoriaAtiva) {
        set.add(toYMD(new Date(n.data_publicacao)));
      }
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [noticias, categoriaAtiva]);

  // Se o dia filtrado atual não tiver notícias nesta categoria, não trava em vazio se hoje tiver
  useEffect(() => {
    if (!dataFiltro) {
      setDataFiltro(todayYMD);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const finalFiltered = useMemo(() => {
    let filtered = noticias;

    // Filtro por fonte/categoria
    if (categoriaAtiva !== 'todas') {
      filtered = filtered.filter(n => n.fonte === categoriaAtiva);
    }

    // Filtro por dia selecionado
    if (dataFiltro) {
      const itemsDoDia = filtered.filter(n => toYMD(new Date(n.data_publicacao)) === dataFiltro);
      // Se não houver itens exatamente na data selecionada mas o usuário selecionou, mantém a lista do dia (ou vazia se não houver)
      filtered = itemsDoDia;
    }

    return [...filtered].sort((a, b) => {
      const dateDiff = new Date(b.data_publicacao).getTime() - new Date(a.data_publicacao).getTime();
      if (dateDiff !== 0) return dateDiff;
      return b.id.localeCompare(a.id);
    });
  }, [noticias, categoriaAtiva, dataFiltro]);

  const heroNoticia = finalFiltered.length > 0 ? finalFiltered[0] : null;
  const listNoticias = finalFiltered.slice(1);

  const fonteLabel = (f: NoticiaFonte) => {
    switch (f) {
      case 'stf': return 'STF';
      case 'camara': return 'Câmara dos Deputados';
      case 'senado': return 'Senado Federal';
      case 'migalhas': return 'Notícias Jurídicas';
      default: return 'Notícias';
    }
  };

  const FonteIcon = ({ fonte }: { fonte: NoticiaFonte }) => {
    switch (fonte) {
      case 'stf': return <Gavel className="w-3 h-3" />;
      case 'camara': return <Building2 className="w-3 h-3" />;
      case 'senado': return <Landmark className="w-3 h-3" />;
      default: return <Scale className="w-3 h-3" />;
    }
  };

  const centerDate = useMemo(() => new Date(), []);
  const dayList = useMemo(() => getDayList(centerDate, 5), [centerDate]);
  const availableDatesSet = useMemo(() => new Set(datasDisponiveis), [datasDisponiveis]);

  return (
    <div className="min-h-dvh bg-background pb-[calc(5.5rem+var(--sai-bottom))] lg:pb-0">
      {/* Header com gradiente */}
      <div className="bg-gradient-to-b from-primary/30 via-primary/15 to-background pb-3">
        <PageHeader
          title="Notícias Jurídicas & Oficiais"
          subtitle="STF, Congresso e Mundo Jurídico"
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

        {/* Info panel retrátil */}
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
                  <h3 className="font-display text-sm font-bold text-foreground">Fontes Oficiais & Jurídicas</h3>
                </div>
                <p className="font-body text-[12.5px] leading-relaxed text-muted-foreground">
                  Acompanhe em tempo real as atualizações oficiais do <strong className="text-foreground">STF</strong>,
                  da <strong className="text-foreground">Câmara dos Deputados</strong>, do <strong className="text-foreground">Senado Federal</strong> e
                  as matérias do <strong className="text-foreground">Migalhas</strong>.
                </p>
                <p className="font-body text-[12.5px] leading-relaxed text-muted-foreground">
                  Alterne entre as categorias acima ou filtre pelos dias da semana para estudar novidades legislativas e jurisprudenciais.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Menu de Alternância de Categorias (Todas, Migalhas, STF, Câmara, Senado) */}
        <div className="px-3 pt-1 pb-2 max-w-3xl mx-auto">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {CATEGORIA_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = categoriaAtiva === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCategoriaAtiva(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display font-medium shrink-0 transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
                      : 'bg-card/70 border border-border/70 text-muted-foreground hover:text-foreground hover:bg-card'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{isMobile ? tab.shortLabel : tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Calendário com faixa de dias */}
        <div className="flex justify-between gap-1.5 px-3 py-2 max-w-3xl mx-auto">
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
                className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-h-[60px] rounded-2xl transition-all shadow-md ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-primary/30'
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
                <span className={`text-[11px] font-body font-semibold uppercase tracking-wide ${isSelected ? 'text-black' : 'text-foreground/85'}`}>{label}</span>
                <span className={`text-xl font-display font-bold leading-none ${isSelected ? 'text-black' : 'text-foreground'}`}>{day.getDate()}</span>
                {hasData && !isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>

        {/* Label de data selecionada */}
        <div className="flex items-center justify-between px-5 pt-1 max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-display text-primary">
              {formatFullDate(dataFiltro ? new Date(dataFiltro + 'T00:00:00') : centerDate)}
            </span>
          </div>
          {dataFiltro && (
            <button
              onClick={() => setDataFiltro('')}
              className="text-[11px] text-muted-foreground hover:text-primary transition-colors"
            >
              Ver todas as datas
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {heroNoticia && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => { openNoticia(heroNoticia); }}
            className="overflow-hidden bg-card border-y md:border md:rounded-2xl border-border cursor-pointer hover:border-primary/30 transition-colors -mx-4 md:mx-0 shadow-sm"
          >
            {heroNoticia.imagem_url ? (
              <div className="relative h-48 md:h-44 overflow-hidden news-cover-shine">
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />
                {!isRead(heroNoticia.id) && (
                  <span className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/40 text-primary-foreground border border-primary/60 backdrop-blur-sm uppercase tracking-wide shadow-lg">
                    Novo
                  </span>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary text-primary-foreground uppercase tracking-wide">
                      <FonteIcon fonte={heroNoticia.fonte} />
                      {fonteLabel(heroNoticia.fonte)}
                    </span>
                    {heroNoticia.categoria && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/30 text-white backdrop-blur-sm">
                        {heroNoticia.categoria}
                      </span>
                    )}
                  </div>
                  <h2 className="font-display text-lg md:text-xl text-white leading-tight font-bold">
                    {heroNoticia.titulo}
                  </h2>
                  <div className="flex items-center gap-1.5 text-white/80 text-[11px] font-body">
                    <Clock className="w-3 h-3" />
                    {formatDateFull(heroNoticia.data_publicacao)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative p-5 bg-gradient-to-br from-primary/15 via-card to-card">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary text-primary-foreground uppercase tracking-wide">
                      <FonteIcon fonte={heroNoticia.fonte} />
                      {fonteLabel(heroNoticia.fonte)}
                    </span>
                    {heroNoticia.categoria && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary text-primary-foreground">
                        {heroNoticia.categoria}
                      </span>
                    )}
                  </div>
                  <h2 className="font-display text-lg text-foreground leading-tight font-bold">
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

        {/* Lista de notícias */}
        <div className="space-y-3 -mx-4 md:mx-0">
          {listNoticias.map((item, i) => {
            const { time } = formatDateParts(item.data_publicacao);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => {
                  openNoticia(item);
                  import('@/lib/continuity').then(m => m.recordActivity({ path: `/noticias?item=${item.id}`, label: item.titulo, kind: 'noticia' }));
                }}
                className="group flex items-stretch gap-0 bg-card border-y md:border md:rounded-2xl border-border hover:border-primary/40 active:bg-secondary/30 transition-colors cursor-pointer overflow-hidden shadow-sm"
              >
                {/* Thumbnail */}
                {item.imagem_url ? (
                  <div className="w-28 sm:w-36 shrink-0 relative overflow-hidden news-cover-shine bg-muted">
                    <img
                      src={newsImg(item.imagem_url!, 240)}
                      alt={item.titulo}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
                    />
                    {!isRead(item.id) && (
                      <span className="absolute bottom-1.5 left-1.5 z-10 inline-flex items-center text-[9px] font-bold px-1.5 py-[1px] rounded bg-primary/80 text-primary-foreground backdrop-blur-sm uppercase tracking-wide">
                        Novo
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="w-2 shrink-0 bg-primary/60" />
                )}

                {/* Conteúdo */}
                <div className="flex-1 min-w-0 flex flex-col justify-between gap-2 p-3.5 sm:p-4">
                  <h3 className="font-display text-[14.5px] sm:text-base text-foreground leading-snug line-clamp-3 group-hover:text-primary transition-colors">
                    {item.titulo}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap text-[11px] font-body text-muted-foreground">
                    <span className="inline-flex items-center gap-1 text-primary font-semibold">
                      <Clock className="w-3 h-3" />
                      {time}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                    <span className="inline-flex items-center gap-1 font-medium">
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
              title="Nenhuma notícia nesta categoria/data"
              description="Não encontramos notícias publicadas com os filtros selecionados. Tente selecionar outra data ou categoria."
            />
          )
        )}
      </div>

      <NoticiaViewerSheet
        noticia={selectedNoticia}
        onClose={() => {
          setSelectedNoticia(null);
          if (new URLSearchParams(location.search).get('item')) {
            navigate('/noticias', { replace: true });
          }
        }}
      />
    </div>
  );
};

export default Noticias;
