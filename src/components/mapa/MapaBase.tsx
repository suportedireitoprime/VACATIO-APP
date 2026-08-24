// Base de todos os mapas do app: carrega a Maps JS API sob demanda, aplica o
// tema do app, mostra o marcador "você" com pulso e trata erro/permissão/offline.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Loader2, MapPin, Navigation2, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { useWatchedLocation, type WatchedPosition } from '@/hooks/useWatchedLocation';
import { loadGoogleMaps, isGoogleMapsConfigured } from '@/lib/googleMapsLoader';
import { MAPA_ESTILO_CLARO, MAPA_ESTILO_ESCURO } from '@/lib/mapaEstilos';
import { openMap } from '@/lib/nativeMapsLauncher';
import { cn } from '@/lib/utils';

export interface MapaBaseProps {
  /** Centro inicial. Se ausente, centraliza na posição do usuário. */
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
  /** Mostra e acompanha o marcador do usuário. */
  seguirUsuario?: boolean;
  /** Recentraliza automaticamente conforme o usuário se move. */
  autoCentralizar?: boolean;
  /** Botão flutuante de recentralizar. */
  mostrarBotaoCentralizar?: boolean;
  /** Chamado quando o mapa está pronto (para desenhar pins, círculos, rotas). */
  onMapReady?: (map: any, maps: any) => void;
  /** Posição do usuário a cada atualização do GPS. */
  onUserPosition?: (pos: WatchedPosition) => void;
  /** Destino usado no fallback "abrir no app de mapas" quando o mapa não carrega. */
  fallbackDestino?: { lat: number; lng: number; label?: string };
  /** Sobreposição (cards, badges) renderizada acima do mapa. */
  children?: ReactNode;
}

const USER_MARKER_SVG = (cor: string) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="18" fill="${cor}" fill-opacity="0.18"/>
      <circle cx="22" cy="22" r="10" fill="${cor}" fill-opacity="0.32"/>
      <circle cx="22" cy="22" r="6" fill="${cor}" stroke="#ffffff" stroke-width="2.5"/>
    </svg>`,
  )}`;

export function MapaBase({
  center,
  zoom = 15,
  className,
  seguirUsuario = true,
  autoCentralizar = true,
  mostrarBotaoCentralizar = true,
  onMapReady,
  onUserPosition,
  fallbackDestino,
  children,
}: MapaBaseProps) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const mapsRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const seguindoRef = useRef(autoCentralizar);

  const { currentTheme } = useTheme();
  const escuro = currentTheme !== 'marfim-grafite';

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const { position, error: erroGps, permissionDenied } = useWatchedLocation(seguirUsuario);

  // Carrega a API e cria o mapa uma única vez.
  useEffect(() => {
    let cancelado = false;
    if (!isGoogleMapsConfigured()) {
      setErro('Mapa não configurado.');
      setCarregando(false);
      return;
    }
    loadGoogleMaps()
      .then((maps) => {
        if (cancelado || !divRef.current) return;
        mapsRef.current = maps;
        const map = new maps.Map(divRef.current, {
          center: center ?? position ?? { lat: -14.235, lng: -51.925 },
          zoom: center || position ? zoom : 4,
          disableDefaultUI: true,
          gestureHandling: 'greedy',
          clickableIcons: false,
          styles: escuro ? MAPA_ESTILO_ESCURO : MAPA_ESTILO_CLARO,
        });
        mapRef.current = map;
        map.addListener('dragstart', () => { seguindoRef.current = false; });
        setCarregando(false);
        onMapReady?.(map, maps);
      })
      .catch((e: Error) => {
        if (cancelado) return;
        setErro(e.message || 'Não foi possível carregar o mapa.');
        setCarregando(false);
      });
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Troca de tema sem recriar o mapa.
  useEffect(() => {
    mapRef.current?.setOptions?.({ styles: escuro ? MAPA_ESTILO_ESCURO : MAPA_ESTILO_CLARO });
  }, [escuro]);

  // Centro controlado externamente.
  useEffect(() => {
    if (center && mapRef.current) {
      mapRef.current.setCenter(center);
      if (mapRef.current.getZoom() < 10) mapRef.current.setZoom(zoom);
    }
  }, [center?.lat, center?.lng, zoom]);

  // Marcador do usuário.
  useEffect(() => {
    if (!position) return;
    onUserPosition?.(position);
    const map = mapRef.current;
    const maps = mapsRef.current;
    if (!map || !maps) return;

    const cor = escuro ? '#e3d24a' : '#b8860b';
    const icon = {
      url: USER_MARKER_SVG(cor),
      scaledSize: new maps.Size(44, 44),
      anchor: new maps.Point(22, 22),
    };

    if (!userMarkerRef.current) {
      userMarkerRef.current = new maps.Marker({
        map,
        position,
        icon,
        zIndex: 999,
        title: 'Você está aqui',
      });
      if (!center) { map.setCenter(position); map.setZoom(zoom); }
    } else {
      userMarkerRef.current.setPosition(position);
      userMarkerRef.current.setIcon(icon);
    }

    if (seguindoRef.current && !center) map.panTo(position);
  }, [position?.lat, position?.lng, escuro]);

  useEffect(() => () => { userMarkerRef.current?.setMap?.(null); }, []);

  const recentralizar = () => {
    seguindoRef.current = true;
    const alvo = position ?? center;
    if (alvo && mapRef.current) {
      mapRef.current.panTo(alvo);
      mapRef.current.setZoom(Math.max(mapRef.current.getZoom(), zoom));
    }
  };

  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;

  if (erro) {
    return (
      <div className={cn('relative flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-muted/40 p-6 text-center', className)}>
        {offline ? <WifiOff className="h-8 w-8 text-muted-foreground" /> : <MapPin className="h-8 w-8 text-muted-foreground" />}
        <p className="text-sm text-muted-foreground">
          {offline ? 'Você está sem internet — o mapa precisa de conexão.' : erro}
        </p>
        {fallbackDestino && (
          <Button size="sm" variant="outline" onClick={() => openMap({ ...fallbackDestino, label: fallbackDestino.label })}>
            <Navigation2 className="mr-2 h-4 w-4" /> Abrir no app de mapas
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-border bg-muted/30', className)}>
      <div ref={divRef} className="absolute inset-0 h-full w-full" />

      {carregando && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {permissionDenied && !carregando && (
        <div className="absolute inset-x-3 top-3 rounded-xl bg-background/90 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur">
          Ative a permissão de localização para ver onde você está no mapa.
        </div>
      )}
      {!permissionDenied && erroGps && !carregando && (
        <div className="absolute inset-x-3 top-3 rounded-xl bg-background/90 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur">
          {erroGps}
        </div>
      )}

      {mostrarBotaoCentralizar && !carregando && (
        <button
          type="button"
          onClick={recentralizar}
          aria-label="Centralizar no meu local"
          className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background/90 text-primary shadow-md backdrop-blur active:scale-95"
        >
          <Navigation2 className="h-5 w-5" />
        </button>
      )}

      {children}
    </div>
  );
}

export default MapaBase;