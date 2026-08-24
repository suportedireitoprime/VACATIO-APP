import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { directImg } from '@/lib/cdnImg';
import { toast } from 'sonner';
import { Bell, BookOpen, Lock, MessageCircle, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { motion } from 'framer-motion';
import type { LivroSnapshot } from '@/lib/bibliotecaTracking';

type Channel = 'push' | 'horus';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  livro: LivroSnapshot | null;
  totalPaginas?: number | null;
  paginaAtual?: number | null;
  minPorPagina?: number | null;
  onChanged?: () => void;
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const DAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];


export default function LembreteLivroSheet({
  open,
  onOpenChange,
  livro,
  totalPaginas,
  paginaAtual,
  minPorPagina,
  onChanged,
}: Props) {
  const { user } = useAuth();
  const { isPremium } = useSubscription();

  const [times, setTimes] = useState<string[]>(['20:00']);
  const [days, setDays] = useState<number[]>(ALL_DAYS);
  const [channel, setChannel] = useState<Channel>('push');
  const [existingBook, setExistingBook] = useState<{ livro_id: string; livro_titulo: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasExistingHere, setHasExistingHere] = useState(false);

  // Reset ao abrir
  useEffect(() => {
    if (!open || !livro || !user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('reading_reminders')
        .select('livro_id, livro_titulo, time_of_day, days_of_week, channels, enabled, preset')
        .eq('user_id', user.id)
        .eq('enabled', true);

      const rows = (data ?? []).filter((r: any) => (r.preset ?? '') === 'per_book');
      const livroIdStr = String(livro.id);
      const thisBook = rows.filter((r: any) => r.livro_id === livroIdStr);
      const otherBooks = rows.filter((r: any) => r.livro_id !== livroIdStr);

      if (thisBook.length) {
        setHasExistingHere(true);
        const t = thisBook.map((r: any) => (r.time_of_day || '').slice(0, 5)).filter(Boolean).sort();
        setTimes(t.length ? t : ['20:00']);
        const dset = new Set<number>();
        thisBook.forEach((r: any) => (r.days_of_week || []).forEach((d: number) => dset.add(d)));
        setDays(dset.size ? Array.from(dset).sort() : ALL_DAYS);
        const ch = (thisBook[0]?.channels?.[0] as Channel) || 'push';
        setChannel(ch);
      } else {
        setHasExistingHere(false);
        setTimes(['20:00']);
        setDays(ALL_DAYS);
        setChannel('push');
      }

      if (otherBooks.length && !isPremium) {
        setExistingBook({ livro_id: otherBooks[0].livro_id, livro_titulo: otherBooks[0].livro_titulo });
      } else {
        setExistingBook(null);
      }
      setLoading(false);
    })();
  }, [open, livro?.id, user?.id, isPremium]);



  const updateTime = (i: number, v: string) => {
    setTimes((prev) => prev.map((t, idx) => (idx === i ? v : t)));
  };

  const removeTime = (i: number) => {
    if (times.length <= 1) return;
    setTimes((prev) => prev.filter((_, idx) => idx !== i));
  };

  const addTime = () => {
    if (!isPremium && times.length >= 1) {
      toast.info('Somente Premium pode adicionar mais horários.');
      return;
    }
    setTimes((prev) => [...prev, '20:00']);
  };

  const toggleDay = (d: number) => {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  };

  const trySelectChannel = (c: Channel) => {
    if (c === 'horus' && !isPremium) {
      toast.info('Horus (WhatsApp) é exclusivo Premium.');
      return;
    }
    setChannel(c);
  };

  const handleSalvar = async () => {
    if (!user || !livro) return;
    if (!times.length) return toast.error('Escolha ao menos 1 horário.');
    if (!days.length) return toast.error('Escolha ao menos 1 dia da semana.');
    setLoading(true);
    try {
      // Free: se existe lembrete em outro livro, apagar
      if (!isPremium && existingBook) {
        await supabase
          .from('reading_reminders')
          .delete()
          .eq('user_id', user.id)
          .eq('livro_id', existingBook.livro_id);
      }
      // Apagar linhas anteriores do mesmo livro (preset per_book)
      await supabase
        .from('reading_reminders')
        .delete()
        .eq('user_id', user.id)
        .eq('livro_id', String(livro.id))
        .eq('preset', 'per_book');

      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
      const rows = times.map((t) => ({
        user_id: user.id,
        livro_id: String(livro.id),
        livro_titulo: livro.titulo,
        livro_capa: livro.capa ?? null,
        livro_area: livro.area ?? null,
        title: `Ler ${livro.titulo}`,
        time_of_day: t.length === 5 ? `${t}:00` : t,
        timezone: tz,
        preset: 'per_book',
        days_of_week: days,
        channels: [channel],
        message_style: 'leitura',
        enabled: true,
      }));

      const { error } = await supabase.from('reading_reminders').insert(rows as any);
      if (error) throw error;

      toast.success('Lembrete salvo! Você será avisado no(s) horário(s) escolhido(s).');
      onChanged?.();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Não foi possível salvar o lembrete.');
    } finally {
      setLoading(false);
    }
  };

  const handleDesativar = async () => {
    if (!user || !livro) return;
    setLoading(true);
    try {
      await supabase
        .from('reading_reminders')
        .delete()
        .eq('user_id', user.id)
        .eq('livro_id', String(livro.id));
      toast.success('Lembretes deste livro desativados.');
      onChanged?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível desativar.');
    } finally {
      setLoading(false);
    }
  };

  if (!livro) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] p-0 rounded-t-3xl border-border/60 bg-background flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 text-left">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <Bell className="w-5 h-5 text-primary" />
            Lembrete de leitura
          </SheetTitle>
          <SheetDescription className="text-sm">
            Programe lembretes para não perder o ritmo neste livro.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-5">
          {/* Cabeçalho do livro */}
          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/5 p-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-24 rounded-lg overflow-hidden bg-muted shrink-0 shadow-lg ring-1 ring-border/60">
                {livro.capa ? (
                  <img src={directImg(livro.capa, 240)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-foreground line-clamp-2 leading-snug">{livro.titulo}</p>
                {livro.autor && <p className="text-xs text-muted-foreground truncate mt-1">{livro.autor}</p>}
                {totalPaginas ? (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 border border-primary/20">
                    <BookOpen className="w-3 h-3 text-primary" />
                    <span className="text-[11px] font-medium text-primary">
                      Pág. {(paginaAtual ?? 0) + 1} de {totalPaginas}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Aviso Free com outro livro já lembrando */}
          {!isPremium && existingBook && !hasExistingHere && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <p className="font-semibold text-amber-500 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> No plano gratuito só é possível 1 livro por vez
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Você já tem lembrete em <span className="font-medium">{existingBook.livro_titulo || 'outro livro'}</span>.
                Ao salvar aqui, o outro será desativado.
              </p>
            </div>
          )}


          {/* Horários */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-wider font-bold text-primary/90">Horários</p>
              <button
                type="button"
                onClick={addTime}
                disabled={!isPremium && times.length >= 1}
                className="text-xs text-primary font-semibold inline-flex items-center gap-1 disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {times.map((t, i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl border border-border/60 bg-card p-2 pl-3">
                  <input
                    type="time"
                    value={t}
                    onChange={(e) => updateTime(i, e.target.value)}
                    className="flex-1 bg-transparent text-foreground text-base outline-none"
                  />
                  {times.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTime(i)}
                      className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Dias */}
          <section>
            <p className="text-[11px] uppercase tracking-wider font-bold text-primary/90 mb-2">Dias da semana</p>
            <div className="flex gap-1.5">
              {DAY_LABELS.map((label, i) => {
                const active = days.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`flex-1 h-10 rounded-lg text-sm font-bold transition-all ${
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border/60 text-muted-foreground'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Canal */}
          <section>
            <p className="text-[11px] uppercase tracking-wider font-bold text-primary/90 mb-2">Como quer ser avisado?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => trySelectChannel('push')}
                className={`relative rounded-2xl border p-3 text-left transition-all ${
                  channel === 'push'
                    ? 'border-primary bg-primary/10'
                    : 'border-border/60 bg-card'
                }`}
              >
                <Bell className="w-5 h-5 text-primary" />
                <p className="text-sm font-semibold text-foreground mt-2">Notificação push</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">No aparelho</p>
              </button>
              <button
                type="button"
                onClick={() => trySelectChannel('horus')}
                className={`relative rounded-2xl border p-3 text-left transition-all ${
                  channel === 'horus'
                    ? 'border-primary bg-primary/10'
                    : 'border-border/60 bg-card'
                } ${!isPremium ? 'opacity-70' : ''}`}
              >
                <MessageCircle className="w-5 h-5 text-emerald-500" />
                <p className="text-sm font-semibold text-foreground mt-2 flex items-center gap-1">
                  Horus (WhatsApp)
                  {!isPremium && <Lock className="w-3 h-3 text-muted-foreground" />}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isPremium ? 'Mensagem personalizada' : 'Exclusivo Premium'}
                </p>
              </button>
            </div>
          </section>
        </div>

        <div className="border-t border-border/60 bg-background/95 backdrop-blur px-5 py-3 flex gap-2">
          {hasExistingHere && (
            <Button variant="outline" onClick={handleDesativar} disabled={loading} className="flex-1">
              <Trash2 className="w-4 h-4 mr-1.5" /> Desativar
            </Button>
          )}
          <motion.div whileTap={{ scale: 0.98 }} className={hasExistingHere ? '' : 'flex-1'}>
            <Button onClick={handleSalvar} disabled={loading} className="w-full">
              {loading ? 'Salvando...' : hasExistingHere ? 'Atualizar lembrete' : 'Salvar lembrete'}
            </Button>
          </motion.div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
