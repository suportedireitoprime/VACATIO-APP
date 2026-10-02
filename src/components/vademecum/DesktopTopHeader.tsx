import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Scale, Gavel, BookOpen, Landmark, Feather, ScrollText, Bird, Heart } from 'lucide-react';
import { pickAsset } from '@/lib/assetUrl';
import vacatioLogoAsset from '@/assets/logo-vacatio-v2.png.asset.json';
import vacatioLogoBundled from '@/assets/bundled/logo-vacatio-v2.webp';
import NotificationsSheet, { useUnreadNotifCount } from './NotificationsSheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getFavoritos, type Favorito } from '@/lib/leisFavoritos';
import { useEffect } from 'react';

const vacatioLogo = pickAsset(vacatioLogoBundled, vacatioLogoAsset.url);

// Ícones decorativos flutuando ao fundo — bem discretos, low-opacity.
const BACKDROP_ICONS = [
  { Icon: Scale,     top: '18%', left: '6%',  size: 42, rot: -12 },
  { Icon: Gavel,     top: '58%', left: '14%', size: 34, rot: 8 },
  { Icon: BookOpen,  top: '22%', left: '32%', size: 30, rot: 4 },
  { Icon: Landmark,  top: '62%', left: '46%', size: 44, rot: -6 },
  { Icon: Feather,   top: '20%', left: '62%', size: 28, rot: 14 },
  { Icon: ScrollText,top: '60%', left: '74%', size: 34, rot: -10 },
  { Icon: Scale,     top: '28%', left: '88%', size: 36, rot: 10 },
];

interface Props {
  onSearchClick?: () => void;
  onAssistenteClick?: () => void;
}

const DesktopTopHeader = ({ onAssistenteClick }: Props) => {
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = useUnreadNotifCount();

  const [favoritos, setFavoritos] = useState<Favorito[]>([]);

  useEffect(() => {
    const carregarFavoritos = () => {
      setFavoritos(getFavoritos().slice(0, 5));
    };
    carregarFavoritos();
    window.addEventListener('LEIS_FAVORITOS_UPDATED', carregarFavoritos);
    return () => window.removeEventListener('LEIS_FAVORITOS_UPDATED', carregarFavoritos);
  }, []);

  return (
    <div className="sticky top-0 z-40 w-full overflow-hidden border-b border-primary/30" style={{ height: 104 }}>
      {/* Degradê amarelo subindo do rodapé */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/85 via-primary/35 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-transparent pointer-events-none" />

      {/* Elementos jurídicos decorativos */}
      <div className="absolute inset-0 pointer-events-none">
        {BACKDROP_ICONS.map(({ Icon, top, left, size, rot }, i) => (
          <div
            key={i}
            className="absolute text-primary-foreground/15"
            style={{ top, left, transform: `rotate(${rot}deg)` }}
          >
            <Icon size={size} strokeWidth={1.5} />
          </div>
        ))}
      </div>

      {/* Conteúdo */}
      <div className="relative z-10 h-full max-w-7xl mx-auto px-8 xl:px-12 flex items-center gap-6">
        {/* Logo + wordmark */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 shrink-0 group"
        >
          <div className="relative">
            <div className="absolute inset-0 blur-xl bg-primary/40 rounded-full scale-125" />
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-xl border-2 border-primary-foreground/20 bg-background/40">
              <img src={vacatioLogo} alt="Vacatio" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className="font-display text-xl font-bold text-white tracking-tight drop-shadow-sm">
              Vacatio
            </span>
            <span className="font-body text-[11px] uppercase tracking-[0.24em] text-white/90">
              Vade Mecum 2026
            </span>
          </div>
        </button>

        {/* Espaço flexível */}
        <div className="flex-1" />

        {/* Favoritos Rápidos */}
        <Popover>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button
                  className="relative shrink-0 w-11 h-11 rounded-xl bg-neutral-900/70 backdrop-blur border border-primary-foreground/40 hover:border-primary-foreground/70 hover:bg-neutral-900 flex items-center justify-center transition-colors group"
                  aria-label="Favoritos"
                >
                  <Heart className="w-5 h-5 text-primary drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] group-hover:scale-110 transition-transform" />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">Favoritos Rápidos</TooltipContent>
          </Tooltip>
          <PopoverContent align="end" className="w-80 p-0 border-primary/20 shadow-2xl overflow-hidden bg-background">
            <div className="p-3 bg-card border-b border-border flex items-center justify-between">
              <h4 className="font-display font-bold text-sm flex items-center gap-2">
                <Heart className="w-4 h-4 text-primary fill-primary" />
                Últimos Favoritos
              </h4>
            </div>
            <div className="max-h-[300px] overflow-y-auto p-2 flex flex-col gap-1">
              {favoritos.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">Nenhum artigo favoritado ainda.</p>
              ) : (
                favoritos.map((fav) => (
                  <button
                    key={fav.id}
                    onClick={() => navigate(`/lei/${fav.lei_id}?artigo=${fav.artigo_id}`)}
                    className="flex flex-col text-left p-3 rounded-xl hover:bg-secondary/60 transition-colors"
                  >
                    <span className="font-display font-bold text-sm text-foreground mb-1 line-clamp-1">{fav.artigo_label || fav.artigo_id}</span>
                    <span className="font-body text-xs text-muted-foreground line-clamp-2">{fav.lei_nome}</span>
                  </button>
                ))
              )}
            </div>
            {favoritos.length > 0 && (
              <div className="p-2 bg-card border-t border-border">
                <button 
                  onClick={() => document.dispatchEvent(new CustomEvent('OPEN_FAVORITOS_MODAL'))}
                  className="w-full py-2 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  Ver todos os favoritos
                </button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Assistente Horus */}
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <button
              onClick={() => onAssistenteClick ? onAssistenteClick() : navigate('/assistente-horus')}
              className="relative shrink-0 w-11 h-11 rounded-xl bg-neutral-900/70 backdrop-blur border border-primary-foreground/40 hover:border-primary-foreground/70 hover:bg-neutral-900 flex items-center justify-center transition-colors group"
              aria-label="Assistente Horus"
            >
              <Bird className="w-5 h-5 text-primary drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] group-hover:scale-110 transition-transform" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="flex items-center gap-2">
            Assistente Horus
            <span className="text-xs text-muted-foreground bg-white/10 px-1.5 py-0.5 rounded">Alt+A</span>
          </TooltipContent>
        </Tooltip>

        {/* Botão de notificações */}
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <button
              onClick={() => setNotifOpen(true)}
              className="relative shrink-0 w-11 h-11 rounded-xl bg-neutral-900/70 backdrop-blur border border-primary-foreground/40 hover:border-primary-foreground/70 hover:bg-neutral-900 flex items-center justify-center transition-colors group"
              aria-label={unreadCount > 0 ? `Notificações (${unreadCount} novas)` : 'Notificações'}
            >
              <Bell className="w-5 h-5 text-primary drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] group-hover:scale-110 transition-transform" />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-neutral-900 text-[10px] font-black flex items-center justify-center border-2 border-neutral-900 shadow-lg"
                  aria-hidden
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {unreadCount > 0 ? `Notificações (${unreadCount})` : 'Notificações'}
          </TooltipContent>
        </Tooltip>
      </div>

      <NotificationsSheet open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  );
};

export default DesktopTopHeader;
