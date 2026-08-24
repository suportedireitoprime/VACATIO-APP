import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type DispatchRow = {
  id: string;
  reminder_id: string;
  reminder_type: 'reading' | 'article_time' | 'location';
  canal: string;
  status: string;
  livro_titulo?: string | null;
  article_titulo?: string | null;
  created_at?: string;
};

/**
 * Banner que aparece quando um lembrete dispara com o app aberto.
 * Escuta em tempo real inserções em `reminder_dispatch_log` para o user atual
 * e mostra um toast fixo no topo. Some sozinho depois de 12s ou no dismiss.
 */
export function ReminderInAppBanner() {
  const { user } = useAuth();
  const [item, setItem] = useState<DispatchRow | null>(null);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`reminder-dispatch-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reminder_dispatch_log',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as DispatchRow;
          if (!row || row.status !== 'sent') return;
          setItem(row);
          // Auto-dismiss depois de 12s
          window.setTimeout(() => {
            setItem((cur) => (cur?.id === row.id ? null : cur));
          }, 12_000);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!user || !item) return null;

  const titulo =
    item.reminder_type === 'reading'
      ? `📖 Hora de ler${item.livro_titulo ? ` · ${item.livro_titulo}` : ''}`
      : item.reminder_type === 'article_time'
      ? `⏰ Lembrete${item.article_titulo ? ` · ${item.article_titulo}` : ''}`
      : '📍 Lembrete de local';

  const canalLabel =
    item.canal === 'horus_whatsapp' || item.canal === 'horus'
      ? 'Enviado no WhatsApp pelo Horus'
      : item.canal === 'push'
      ? 'Notificação enviada'
      : 'Lembrete disparado';

  return (
    <div
      className="fixed left-1/2 top-2 z-[80] -translate-x-1/2 max-w-[92vw] w-full sm:w-[520px] px-2 animate-in fade-in slide-in-from-top-2"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/15 backdrop-blur-md px-4 py-3 shadow-lg">
        <Bell className="h-5 w-5 text-primary shrink-0" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold text-foreground truncate">{titulo}</p>
          <p className="text-xs text-muted-foreground truncate">{canalLabel}</p>
        </div>
        <button
          onClick={() => setItem(null)}
          className="rounded-full p-1.5 text-muted-foreground hover:bg-primary/20 hover:text-foreground"
          aria-label="Dispensar aviso"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default ReminderInAppBanner;
