import { useState, useMemo, useEffect } from 'react';
import { Calendar, ChevronRight, Loader2, RefreshCw, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getResenhaCache, prefetchResenha, getLatestDate, type ResenhaItem } from '@/services/atualizacaoService';
import LeiOrdinariaDetail from '@/components/vademecum/LeiOrdinariaDetail';
import { PageHeader } from '@/components/vademecum/PageHeader';
import type { LeiOrdinaria } from '@/services/legislacaoService';
import brasaoImgAsset from '@/assets/brasao-republica.webp';
const brasaoImg = brasaoImgAsset;


const TIPO_COLORS: Record<string, { badge: string; border: string; card: string }> = {
  'Lei': { badge: 'bg-primary/15 text-primary border-primary/20', border: 'border-l-primary', card: 'from-primary/10 to-transparent' },
  'Lei Complementar': { badge: 'bg-copper-light/15 text-copper-light border-copper-light/20', border: 'border-l-copper-light', card: 'from-copper-light/10 to-transparent' },
  'Decreto': { badge: 'bg-copper/15 text-copper border-copper/20', border: 'border-l-copper', card: 'from-copper/10 to-transparent' },
  'Medida Provisória': { badge: 'bg-copper-dark/15 text-copper-dark border-copper-dark/20', border: 'border-l-copper-dark', card: 'from-copper-dark/10 to-transparent' },
  'Outro': { badge: 'bg-muted text-muted-foreground border-border', border: 'border-l-muted-foreground', card: 'from-muted/10 to-transparent' },
};

const TIPO_FILTERS = ['Todos', 'Lei', 'Lei Complementar', 'Decreto', 'Medida Provisória'];

const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

function getDayList(centerDate: Date, range = 2): Date[] {
  const days: Date[] = [];
  for (let i = range; i >= -range; i--) {
    const d = new Date(centerDate);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

function formatDateLabel(date: Date): string {
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'HOJE';
  const weekday = WEEKDAYS[date.getDay()];
  return weekday;
}

function formatFullDate(date: Date): string {
  const weekdayFull = ['Domingo', 'Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado'];
  const monthFull = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${weekdayFull[date.getDay()]}, ${date.getDate()} De ${monthFull[date.getMonth()]} De ${date.getFullYear()}`;
}

function cleanResenhaTexto(texto: string | null): string | null {
  if (!texto) return null;
  return texto
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\r/g, '')
    .trim();
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const Novidades = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ResenhaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tipoFiltro, setTipoFiltro] = useState('Todos');
  const [detailItem, setDetailItem] = useState<LeiOrdinaria | null>(null);

  const centerDate = useMemo(() => getLatestDate() || new Date(), [items]);
  const dayList = useMemo(() => getDayList(centerDate, 2), [centerDate]);

  useEffect(() => {
    const cached = getResenhaCache();
    if (cached) {
      setItems(cached);
      setLoading(false);
    } else {
      prefetchResenha().then(() => {
        const data = getResenhaCache();
        if (data) setItems(data);
        setLoading(false);
      });
    }
  }, []);

  // Items available dates for highlighting calendar
  const availableDates = useMemo(() => {
    const set = new Set<string>();
    items.forEach(item => {
      const d = item.data_dou || item.data_publicacao;
      if (d) set.add(d.slice(0, 10));
    });
    return set;
  }, [items]);

  // Auto-select the most recent date that has data
  useEffect(() => {
    if (availableDates.size === 0) return;
    const sorted = Array.from(availableDates).sort().reverse();
    const mostRecent = sorted[0];
    if (mostRecent && toDateKey(selectedDate) !== mostRecent) {
      const [y, m, d] = mostRecent.split('-').map(Number);
      setSelectedDate(new Date(y, m - 1, d));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableDates]);

  // Filter by selected date and type
  const filtered = useMemo(() => {
    const dateKey = toDateKey(selectedDate);
    let result = items.filter(item => {
      const d = (item.data_dou || item.data_publicacao || '').slice(0, 10);
      return d === dateKey;
    });
    if (tipoFiltro !== 'Todos') {
      result = result.filter(item => item.tipo_ato === tipoFiltro);
    }
    return result;
  }, [items, selectedDate, tipoFiltro]);

  const openDetail = (item: ResenhaItem) => {
    const cleaned = cleanResenhaTexto(item.texto_completo);
    const lei: LeiOrdinaria = {
      id: item.id,
      numero_lei: item.numero_ato,
      ementa: item.ementa,
      ano: parseInt(item.data_publicacao?.slice(0, 4) || '2026'),
      data_publicacao: item.data_publicacao,
      texto_completo: cleaned,
      url: item.url,
      ordem: 0,
      explicacao: item.explicacao,
    };
    setDetailItem(lei);
  };

  if (detailItem) {
    return (
      <div className="min-h-dvh bg-background">
        <LeiOrdinariaDetail lei={detailItem} onBack={() => setDetailItem(null)} />
      </div>
    );
  }

  const selectedDateKey = toDateKey(selectedDate);

  return (
    <div className="min-h-dvh bg-background">
      {/* Red gradient header */}
      <div className="bg-gradient-to-b from-primary/30 via-primary/15 to-background pb-4">
        {/* Top bar */}
        <PageHeader
          title="Leis do Dia"
          subtitle="Novas leis publicadas no Diário Oficial"
          onBack={() => navigate(-1)}
          rightAction={
            <button className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <Info className="w-4 h-4" />
            </button>
          }
        />

        {/* Day calendar strip */}

        <div className="flex justify-between gap-1.5 px-3 py-3">
          {dayList.map((day) => {
            const key = toDateKey(day);
            const isSelected = key === selectedDateKey;
            const hasData = availableDates.has(key);
            const label = formatDateLabel(day);

            return (
              <button
                key={key}
                onClick={() => setSelectedDate(day)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all shadow-lg shadow-black/20 ${
                  isSelected
                    ? 'bg-primary shadow-primary/20'
                    : 'bg-card/40 text-foreground hover:bg-card/60'
                }`}
              >
                <span className={`text-[9px] font-body font-semibold uppercase tracking-wide ${isSelected ? 'text-black' : 'text-foreground'}`}>{label}</span>
                <span className={`text-base font-display font-bold leading-none ${isSelected ? 'text-black' : 'text-foreground'}`}>{day.getDate()}</span>
                <span className={`text-[8px] font-body uppercase ${isSelected ? 'text-black/80' : 'text-foreground/80'}`}>{MONTHS[day.getMonth()]}</span>
                {hasData && !isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected date label */}
        <div className="flex items-center gap-2 px-5 pb-1">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-display text-primary">{formatFullDate(selectedDate)}</span>
        </div>
        <div className="px-5 pb-2">
          <Badge className="bg-primary/15 text-primary border-primary/20 text-[10px]">
            {filtered.length} {filtered.length === 1 ? 'lei' : 'leis'}
          </Badge>
        </div>
      </div>

      {/* Type filters */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <ScrollArea className="w-full">
          <div className="flex gap-2 px-4 py-2.5">
            {TIPO_FILTERS.map(tipo => (
              <button
                key={tipo}
                onClick={() => setTipoFiltro(tipo)}
                className={`whitespace-nowrap text-xs font-body px-4 py-2 rounded-full transition-colors ${
                  tipoFiltro === tipo
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-foreground hover:bg-secondary/80'
                }`}
              >
                {tipo}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-2 py-3 space-y-2">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <RefreshCw className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground text-sm font-body">
              Nenhuma lei publicada nesta data.
            </p>
          </div>
        )}

        {!loading && filtered.map((item, i) => {
          const colors = TIPO_COLORS[item.tipo_ato] || TIPO_COLORS['Outro'];
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => openDetail(item)}
              className={`border border-border rounded-xl px-3 py-2.5 bg-gradient-to-r ${colors.card} bg-card hover:border-primary/20 transition-colors cursor-pointer border-l-[3px] ${colors.border} flex gap-2.5 items-center`}
            >
              <img src={brasaoImg} alt="" className="w-7 h-7 flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <Badge className={`${colors.badge} border text-[10px] px-2 py-0.5`}>
                    {item.tipo_ato}
                  </Badge>
                  <span className="font-display text-sm text-foreground font-semibold">{item.numero_ato}</span>
                </div>
                <p className="text-muted-foreground text-xs font-body line-clamp-2 leading-relaxed">
                  {item.ementa}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-foreground flex-shrink-0" />
            </motion.div>
          );
        })}
      </main>
    </div>
  );
};

export default Novidades;
