import { useEffect, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { subscribeGeofencePresence, type GeofenceReminder } from '@/lib/nativeGeofence';
import { useAuth } from '@/hooks/useAuth';

/**
 * Banner fixo no topo do app enquanto o usuário está DENTRO do raio de algum
 * lembrete ativo. Some quando sai. Só aparece pra usuário logado.
 */
export function GeofencePresenceBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [inside, setInside] = useState<GeofenceReminder[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    return subscribeGeofencePresence(setInside);
  }, [user]);

  if (!user) return null;
  const visible = inside.filter(r => !dismissedIds.has(r.id));
  if (!visible.length) return null;

  const first = visible[0];
  return (
    <div
      className="fixed left-1/2 z-[70] -translate-x-1/2 max-w-[94vw] w-full sm:w-[560px] px-3"
      style={{ top: 'calc(var(--sai-top) + 88px)' }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-muted px-5 py-4 shadow-2xl">
        <button
          type="button"
          onClick={() => navigate('/pessoal/avisos')}
          className="flex items-center gap-4 min-w-0 flex-1 text-left"
          aria-label="Abrir meus avisos"
        >
        <div className="h-11 w-11 shrink-0 rounded-xl bg-primary/20 flex items-center justify-center">
          <MapPin className="h-6 w-6 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-foreground text-base leading-tight truncate">Você está no local: {first.label}</p>
          <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
            {visible.length > 1
              ? `+${visible.length - 1} outro(s) lembrete(s) neste local`
              : 'Toque para ver ou desativar em Meus avisos.'}
          </p>
        </div>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setDismissedIds(prev => new Set(prev).add(first.id)); }}
          className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground shrink-0"
          aria-label="Dispensar aviso"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export default GeofencePresenceBanner;
