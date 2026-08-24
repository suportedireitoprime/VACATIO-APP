// Fase 2 — Mapa vivo do lembrete por local: destino, raio do geofence,
// distância e ETA em tempo real enquanto o usuário se aproxima.

import { useCallback, useMemo, useRef, useState } from 'react';
import { Flag, Footprints, Navigation2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MapaBase } from '@/components/mapa/MapaBase';
import { openMap } from '@/lib/nativeMapsLauncher';
import type { WatchedPosition } from '@/hooks/useWatchedLocation';
import {
  distanciaMetros,
  etaMinutos,
  formatarDistancia,
  formatarEta,
  progressoChegada,
} from '@/lib/geoDistancia';
import { cn } from '@/lib/utils';

interface MapaLembreteProps {
  destino: { lat: number; lng: number };
  label: string;
  raioM: number;
  className?: string;
}

export function MapaLembrete({ destino, label, raioM, className }: MapaLembreteProps) {
  const destinoMarkerRef = useRef<any>(null);
  const circuloRef = useRef<any>(null);
  const linhaRef = useRef<any>(null);
  const distInicialRef = useRef<number | null>(null);

  const [distancia, setDistancia] = useState<number | null>(null);
  const [velocidade, setVelocidade] = useState<number | null>(null);

  const onMapReady = useCallback(
    (map: any, maps: any) => {
      destinoMarkerRef.current = new maps.Marker({
        map,
        position: destino,
        title: label,
        zIndex: 500,
      });
      circuloRef.current = new maps.Circle({
        map,
        center: destino,
        radius: raioM,
        strokeColor: '#e3b23c',
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: '#e3b23c',
        fillOpacity: 0.14,
      });
      linhaRef.current = new maps.Polyline({
        map,
        path: [],
        strokeColor: '#e3b23c',
        strokeOpacity: 0.7,
        strokeWeight: 3,
      });
      map.fitBounds(circuloRef.current.getBounds());
    },
    [destino.lat, destino.lng, raioM, label],
  );

  const onUserPosition = useCallback(
    (pos: WatchedPosition) => {
      const d = distanciaMetros(pos, destino);
      setDistancia(d);
      setVelocidade(typeof (pos as any).speed === 'number' ? (pos as any).speed : null);
      if (distInicialRef.current === null || d > distInicialRef.current) distInicialRef.current = d;
      linhaRef.current?.setPath?.([{ lat: pos.lat, lng: pos.lng }, destino]);
    },
    [destino.lat, destino.lng],
  );

  const chegou = distancia !== null && distancia <= raioM;
  const eta = useMemo(
    () => (distancia === null ? null : etaMinutos(distancia - raioM, velocidade ?? undefined)),
    [distancia, raioM, velocidade],
  );
  const progresso = useMemo(
    () => (distancia === null ? 0 : progressoChegada(distancia, distInicialRef.current ?? distancia, raioM)),
    [distancia, raioM],
  );

  return (
    <div className={cn('space-y-3', className)}>
      <MapaBase
        className="h-[46dvh] min-h-[260px] w-full"
        zoom={15}
        autoCentralizar={false}
        onMapReady={onMapReady}
        onUserPosition={onUserPosition}
        fallbackDestino={{ ...destino, label }}
      />

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {chegou ? 'Você chegou' : 'Distância até o destino'}
            </p>
            <p className="text-2xl font-bold leading-tight">
              {distancia === null ? 'Localizando…' : formatarDistancia(Math.max(distancia - raioM, 0))}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Chegada</p>
            <p className="flex items-center gap-1 text-lg font-semibold">
              {chegou ? <Flag className="h-4 w-4 text-primary" /> : <Footprints className="h-4 w-4 text-primary" />}
              {distancia === null ? '—' : chegou ? 'agora' : formatarEta(eta ?? 0)}
            </p>
          </div>
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${Math.round((chegou ? 1 : progresso) * 100)}%` }}
          />
        </div>

        <Button
          variant="outline"
          className="mt-4 w-full"
          onClick={() => openMap({ ...destino, label })}
        >
          <Navigation2 className="mr-2 h-4 w-4" /> Traçar rota no app de mapas
        </Button>
      </div>
    </div>
  );
}

export default MapaLembrete;
