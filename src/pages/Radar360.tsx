import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Calendar, ChevronRight, Loader2, RefreshCw, Info, ExternalLink, FileDown } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { withOnlineGuard, assertOnline } from '@/lib/onlineGuard';
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

function getDayList(centerDate: Date, range = 3): Date[] {
  const days: Date[] = [];
  // Today on the left, past days going to the right
  const total = range * 2 + 1;
  for (let i = 0; i < total; i++) {
    const d = new Date(centerDate);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}
function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function formatFullDate(date: Date): string {
  const wf = ['Domingo', 'Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado'];
  const mf = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${wf[date.getDay()]}, ${date.getDate()} de ${mf[date.getMonth()]} de ${date.getFullYear()}`;
}
function cleanText(t: string | null): string | null {
  if (!t) return null;
  return t.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\u00A0/g, ' ').replace(/\r/g, '').trim();
}

export default function Radar360() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<ResenhaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reextracting, setReextracting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const initialTipo = searchParams.get('tipo');
  const [tipoFiltro, setTipoFiltro] = useState(initialTipo && TIPO_FILTERS.includes(initialTipo) ? initialTipo : 'Todos');
  const [detailItem, setDetailItem] = useState<LeiOrdinaria | null>(null);
  const autoReextractedRef = useRef(false);

  const centerDate = useMemo(() => getLatestDate() || new Date(), [items]);
  const dayList = useMemo(() => getDayList(centerDate, 3), [centerDate]);

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from('resenha_diaria' as any)
      .select('id,tipo_ato,numero_ato,ementa,url,data_publicacao,data_dou,texto_completo,explicacao')
      .order('data_dou', { ascending: false })
      .limit(200);
    if (data) setItems(data as unknown as ResenhaItem[]);
  }, []);

  useEffect(() => {
    const cached = getResenhaCache();
    if (cached) { setItems(cached); setLoading(false); }
    else { prefetchResenha().then(() => { const d = getResenhaCache(); if (d) setItems(d); setLoading(false); }); }
    try { localStorage.setItem('radar_leis_last_seen', new Date().toISOString()); } catch { /* ignore */ }
  }, []);

  const availableDates = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => { const d = i.data_dou || i.data_publicacao; if (d) set.add(d.slice(0, 10)); });
    return set;
  }, [items]);

  useEffect(() => {
    if (availableDates.size === 0) return;
    const sorted = Array.from(availableDates).sort().reverse();
    const most = sorted[0];
    if (most && toDateKey(selectedDate) !== most) {
      const [y, m, d] = most.split('-').map(Number);
      setSelectedDate(new Date(y, m - 1, d));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableDates]);

  const filtered = useMemo(() => {
    const dk = toDateKey(selectedDate);
    let r = items.filter(i => (i.data_dou || i.data_publicacao || '').slice(0, 10) === dk);
    if (tipoFiltro !== 'Todos') r = r.filter(i => i.tipo_ato === tipoFiltro);
    return r;
  }, [items, selectedDate, tipoFiltro]);

  const openDetail = async (item: ResenhaItem) => {
    const texto = cleanText(item.texto_completo);
    const explicacao = item.explicacao;
    const lei: LeiOrdinaria = {
      id: item.id,
      numero_lei: item.numero_ato,
      ementa: item.ementa,
      ano: parseInt(item.data_publicacao?.slice(0, 4) || '2026'),
      data_publicacao: item.data_publicacao,
      texto_completo: texto,
      url: item.url,
      ordem: 0,
      explicacao,
    };
    setDetailItem(lei);
    // Fallback silencioso caso o texto ainda não esteja populado no cache
    if (!texto) {
      try {
        await withOnlineGuard(
          () => supabase.functions.invoke('popular-texto-resenha', { body: { id: item.id, force: true } }),
          { message: 'Sem internet — o texto integral desta publicação será carregado quando você reconectar.' },
        );
        const { data } = await supabase
          .from('resenha_diaria' as any)
          .select('texto_completo,explicacao')
          .eq('id', item.id)
          .single();
        const novoTexto = cleanText((data as any)?.texto_completo);
        if (novoTexto) {
          item.texto_completo = novoTexto;
          item.explicacao = (data as any)?.explicacao ?? item.explicacao;
          setDetailItem({ ...lei, texto_completo: novoTexto, explicacao: item.explicacao });
        }
      } catch { /* silencioso */ }
    }
  };

  const doRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    toast.loading('Buscando novas leis no Planalto...', { id: 'radar-scrape' });
    try {
      assertOnline('Você está offline. Conecte-se para buscar novas publicações.');
      const { data, error } = await supabase.functions.invoke('scrape-resenha-diaria', {
        body: { origem: 'manual', notify: false },
      });
      if (error) throw error;
      const n = (data as any)?.novos ?? 0;
      toast.success(n > 0 ? `${n} nova(s) publicação(ões) encontrada(s)` : 'Nenhuma novidade agora', { id: 'radar-scrape' });
      await reload();
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao atualizar', { id: 'radar-scrape' });
    } finally {
      setRefreshing(false);
    }
  };

  const reextrairFaltantes = useCallback(async (silent = false) => {
    const dk = toDateKey(selectedDate);
    const faltantes = items.filter(i => {
      const dataItem = (i.data_dou || i.data_publicacao || '').slice(0, 10);
      if (dataItem !== dk) return false;
      const t = cleanText(i.texto_completo);
      return !t || t.length < 200;
    });
    if (faltantes.length === 0) {
      if (!silent) toast.info('Todos os atos deste dia já têm texto integral');
      return;
    }
    setReextracting(true);
    const toastId = 'radar-reextrair';
    if (!silent) toast.loading(`Reextraindo 0 de ${faltantes.length}...`, { id: toastId });
    let done = 0;
    for (const item of faltantes) {
      try {
        await supabase.functions.invoke('popular-texto-resenha', { body: { id: item.id, force: true } });
      } catch { /* segue */ }
      done += 1;
      if (!silent) toast.loading(`Reextraindo ${done} de ${faltantes.length}...`, { id: toastId });
    }
    await reload();
    setReextracting(false);
    if (!silent) toast.success(`${done} ato(s) reextraído(s)`, { id: toastId });
  }, [items, selectedDate, reload]);

  // Auto-reextrai silenciosamente uma vez ao entrar, se houver itens sem texto no dia mais recente
  useEffect(() => {
    if (autoReextractedRef.current || loading || items.length === 0) return;
    autoReextractedRef.current = true;
    reextrairFaltantes(true);
  }, [loading, items, reextrairFaltantes]);

  // Sincroniza filtro de tipo com querystring (?tipo=Lei etc.)
  useEffect(() => {
    if (tipoFiltro === 'Todos') {
      if (searchParams.get('tipo')) {
        const sp = new URLSearchParams(searchParams);
        sp.delete('tipo');
        setSearchParams(sp, { replace: true });
      }
    } else if (searchParams.get('tipo') !== tipoFiltro) {
      const sp = new URLSearchParams(searchParams);
      sp.set('tipo', tipoFiltro);
      setSearchParams(sp, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoFiltro]);

  if (detailItem) {
    return (
      <div className="min-h-dvh bg-background">
        <LeiOrdinariaDetail lei={detailItem} onBack={() => setDetailItem(null)} />
      </div>
    );
  }

  const selectedDateKey = toDateKey(selectedDate);

  return (
    <div className="min-h-dvh bg-background pb-20">
      <div className="bg-gradient-to-b from-primary/30 via-primary/15 to-background pb-4">
        <PageHeader
          title="Radar de Leis"
          subtitle="Resenha diária do Planalto"
          onBack={() => navigate(-1)}
          rightAction={
            <div className="flex items-center gap-2">
              <button
                onClick={() => reextrairFaltantes(false)}
                disabled={reextracting || loading}
                className="min-w-[44px] min-h-[44px] rounded-full bg-muted flex items-center justify-center text-muted-foreground disabled:opacity-50"
                aria-label="Reextrair textos faltantes"
                title="Reextrair textos faltantes"
              >
                {reextracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              </button>

            </div>
          }
        />

        <div className="flex justify-between gap-1.5 px-3 py-3">
          {dayList.map((day, idx) => {
            const key = toDateKey(day);
            const isSelected = key === selectedDateKey;
            const hasData = availableDates.has(key);
            const prev = dayList[idx - 1];
            const monthChanged = !prev || prev.getMonth() !== day.getMonth();
            return (
              <button
                key={key}
                onClick={() => setSelectedDate(day)}
                className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[64px] rounded-2xl transition-all shadow-lg shadow-black/20 ${
                  isSelected ? 'bg-primary shadow-primary/30' : 'bg-card/40 text-foreground hover:bg-card/60'
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
                <span className={`text-xs font-body font-semibold uppercase tracking-wide ${isSelected ? 'text-black' : 'text-foreground/85'}`}>
                  {WEEKDAYS[day.getDay()]}
                </span>
                <span className={`text-2xl font-display font-bold leading-none ${isSelected ? 'text-black' : 'text-foreground'}`}>
                  {day.getDate()}
                </span>
                {hasData && !isSelected && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 px-5 pb-1">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="text-sm font-display text-primary">{formatFullDate(selectedDate)}</span>
        </div>
        <div className="px-5 pb-2">
          <Badge className="bg-primary/15 text-primary border-primary/20 text-xs">
            {filtered.length} {filtered.length === 1 ? 'ato' : 'atos'}
          </Badge>
        </div>
      </div>

      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <ScrollArea className="w-full">
          <div className="flex gap-2 px-4 py-3">
            {TIPO_FILTERS.map(t => (
              <button
                key={t}
                onClick={() => setTipoFiltro(t)}
                className={`whitespace-nowrap text-sm font-body px-4 py-2.5 min-h-[40px] rounded-full transition-colors ${
                  tipoFiltro === t ? 'bg-primary text-primary-foreground font-semibold' : 'bg-secondary text-foreground hover:bg-secondary/80'
                }`}
              >{t}</button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-3 space-y-2.5">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <Info className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground text-sm font-body">Nenhuma publicação nesta data.</p>
          </div>
        )}
        {!loading && filtered.map((item, i) => {
          const c = TIPO_COLORS[item.tipo_ato] || TIPO_COLORS['Outro'];
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => openDetail(item)}
              className="border border-border rounded-2xl px-4 py-4 bg-card hover:border-primary/30 transition-colors cursor-pointer flex gap-3 items-start h-[140px] overflow-hidden"
            >
              <img src={brasaoImg} alt="" className="w-10 h-10 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`${c.badge} border text-[11px] px-2 py-0.5 font-semibold`}>
                    {item.tipo_ato}
                  </Badge>
                </div>
                <h3 className="font-display text-[15px] leading-snug text-foreground font-semibold break-words">
                  {item.numero_ato}
                </h3>
                {item.ementa && (
                  <p className="text-muted-foreground text-[13px] font-body leading-relaxed line-clamp-3 break-words">
                    {item.ementa}
                  </p>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
            </motion.div>
          );
        })}
      </main>
    </div>
  );
}
