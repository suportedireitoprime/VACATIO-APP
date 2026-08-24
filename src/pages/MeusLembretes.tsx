import { useEffect, useState } from 'react';
import { Bell, Plus, Clock, BookOpen, Smartphone, MessageCircle, Loader2, Sparkles } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import LembreteSheet from '@/components/lembretes/LembreteSheet';
import { toast } from 'sonner';

interface Reminder {
  id: string;
  livro_id: string | null;
  livro_titulo: string | null;
  livro_capa: string | null;
  livro_area: string | null;
  title: string;
  time_of_day: string;
  days_of_week: number[];
  channels: string[];
  enabled: boolean;
  next_fire_at: string | null;
}

const DAYS_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const MeusLembretes = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Reminder[]>([]);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('reading_reminders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);
  useEffect(() => { if (!sheetOpen) load();   }, [sheetOpen]);

  const toggleEnabled = async (r: Reminder) => {
    const { error } = await supabase
      .from('reading_reminders')
      .update({ enabled: !r.enabled, next_fire_at: null })
      .eq('id', r.id);
    if (error) toast.error(error.message);
    else load();
  };

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader
        title={
          <span className="flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-primary" />
            Meus lembretes
          </span>
        }
      />

      <div className="p-4 max-w-2xl mx-auto space-y-3">
        <button
          onClick={() => { setEditing(null); setSheetOpen(true); }}
          className="w-full h-14 rounded-2xl border-2 border-dashed border-primary/50 bg-primary/5 text-primary font-body font-semibold flex items-center justify-center gap-2 hover:bg-primary/10 transition"
        >
          <Plus className="w-5 h-5" />
          Novo lembrete
        </button>

        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Sparkles className="w-10 h-10 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Ainda sem lembretes. Comece criando uma rotina de leitura ou<br />configure direto na tela de um livro.
            </p>
          </div>
        ) : (
          rows.map(r => (
            <div key={r.id} className="rounded-2xl bg-card border border-border overflow-hidden">
              <button
                onClick={() => { setEditing(r); setSheetOpen(true); }}
                className="w-full p-4 flex gap-3 text-left"
              >
                {r.livro_capa ? (
                  <img src={r.livro_capa} alt="" className="w-14 h-20 rounded-lg object-cover" />
                ) : (
                  <div className="w-14 h-20 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-body font-bold text-sm text-foreground truncate">
                    {r.livro_titulo || 'Rotina de leitura'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {r.time_of_day.slice(0, 5)}
                  </p>
                  <div className="flex gap-1 mt-2">
                    {DAYS_SHORT.map((d, i) => (
                      <span
                        key={i}
                        className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center ${
                          r.days_of_week.includes(i) ? 'bg-primary/80 text-primary-foreground' : 'bg-muted text-muted-foreground/50'
                        }`}
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    {r.channels.includes('push') && <ChBadge icon={Bell} label="Push" />}
                    {r.channels.includes('local') && <ChBadge icon={Smartphone} label="App" />}
                    {r.channels.includes('horus_whatsapp') && <ChBadge icon={MessageCircle} label="WhatsApp" />}
                  </div>
                </div>
              </button>
              <div className="px-4 pb-3 flex items-center justify-between border-t border-border pt-3">
                <span className="text-[11px] text-muted-foreground">
                  {r.enabled ? (r.next_fire_at ? `Próximo: ${new Date(r.next_fire_at).toLocaleString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}` : 'Agendando…') : 'Desativado'}
                </span>
                <button
                  onClick={() => toggleEnabled(r)}
                  className={`relative w-10 h-6 rounded-full transition ${r.enabled ? 'bg-primary' : 'bg-muted'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${r.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <LembreteSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        reminderId={editing?.id || null}
        livroId={editing?.livro_id || undefined}
        livroArea={editing?.livro_area || undefined}
        livroTitulo={editing?.livro_titulo || undefined}
        livroCapa={editing?.livro_capa || undefined}
      />
    </div>
  );
};

function ChBadge({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-[10px] font-body text-muted-foreground">
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

export default MeusLembretes;
