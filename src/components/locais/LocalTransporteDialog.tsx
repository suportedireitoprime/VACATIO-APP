import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bus, Footprints, Loader2, Train, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onClose: () => void;
  origem: { lat: number; lng: number } | null;
  destino: { lat: number; lng: number; nome: string };
}

interface Passo {
  modo: string;
  instrucao: string | null;
  duracao_s: number;
  distancia_m: number;
  transito?: {
    linha: string | null;
    cor: string | null;
    tipo: string | null;
    parada_embarque: string | null;
    parada_desembarque: string | null;
    partida: any;
    chegada: any;
    paradas: number | null;
    headsign: string | null;
  } | null;
}

function formatDur(s: number) {
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}min`;
}

export function LocalTransporteDialog({ open, onClose, origem, destino }: Props) {
  const [loading, setLoading] = useState(false);
  const [rota, setRota] = useState<{ duracao_total_s: number; distancia_total_m: number; passos: Passo[] } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !origem) return;
    setLoading(true); setErro(null); setRota(null);
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('local-transporte-publico', {
          body: { origem, destino: { lat: destino.lat, lng: destino.lng }, destino_nome: destino.nome },
        });
        if (error || (data as any)?.error) throw new Error((data as any)?.error || 'Sem rota');
        setRota(data as any);
      } catch (e: any) {
        setErro(e.message || 'Sem rota de transporte público');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, origem, destino.lat, destino.lng]);

  const gmapsFallback = `https://www.google.com/maps/dir/?api=1&destination=${destino.lat},${destino.lng}&travelmode=transit`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bus className="w-5 h-5" /> Transporte público
          </DialogTitle>
        </DialogHeader>

        {!origem && (
          <div className="text-sm text-muted-foreground py-6 text-center">
            Ative sua localização para calcular a rota.
          </div>
        )}

        {loading && (
          <div className="py-8 flex items-center justify-center text-muted-foreground text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Calculando trajeto...
          </div>
        )}

        {erro && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{erro}</p>
            <Button variant="outline" className="w-full" onClick={() => window.open(gmapsFallback, '_blank')}>
              Abrir no Google Maps <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        )}

        {rota && (
          <div className="space-y-4">
            <div className="rounded-xl bg-primary/10 border border-primary/20 p-3">
              <div className="text-2xl font-display font-bold text-primary">{formatDur(rota.duracao_total_s)}</div>
              <div className="text-xs text-muted-foreground">
                {(rota.distancia_total_m / 1000).toFixed(1)} km até {destino.nome}
              </div>
            </div>

            <ol className="space-y-2">
              {rota.passos.map((p, idx) => {
                const isWalk = p.modo === 'WALK';
                const t = p.transito;
                return (
                  <li key={idx} className="flex gap-3 rounded-xl border border-border bg-card p-3">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                      {isWalk ? <Footprints className="w-4 h-4" /> : <Train className="w-4 h-4 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {t ? (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            {t.linha && (
                              <span
                                className="px-2 py-0.5 rounded text-xs font-bold text-white"
                                style={{ background: t.cor || 'hsl(var(--primary))' }}
                              >
                                {t.linha}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground truncate">
                              {t.tipo?.toLowerCase() || 'transporte'} {t.headsign ? `→ ${t.headsign}` : ''}
                            </span>
                          </div>
                          <p className="text-sm font-medium">Embarcar em {t.parada_embarque}</p>
                          <p className="text-xs text-muted-foreground">
                            Descer em {t.parada_desembarque} · {t.paradas ?? '?'} paradas
                          </p>
                        </>
                      ) : (
                        <p className="text-sm">{p.instrucao ?? 'Caminhar'}</p>
                      )}
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {formatDur(p.duracao_s)} · {(p.distancia_m / 1000).toFixed(1)} km
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>

            <Button variant="outline" className="w-full" onClick={() => window.open(gmapsFallback, '_blank')}>
              Abrir passo a passo no Google Maps <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
