import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Scale, Gavel, BookOpen, Landmark, Feather, ScrollText, Bird, Heart, User2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfileSummary } from '@/hooks/useProfileSummary';
import NotificationsSheet, { useUnreadNotifCount } from './NotificationsSheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getFavoritos, type Favorito } from '@/lib/leisFavoritos';

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
  const { user } = useAuth();
  const { data: profileSummary } = useProfileSummary();
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = useUnreadNotifCount();

  const [favoritos, setFavoritos] = useState<Favorito[]>([]);

  const displayName = profileSummary?.displayName || user?.user_metadata?.nome || user?.user_metadata?.full_name || 'Usuário';
  const avatarUrl = profileSummary?.avatarUrl || (user?.user_metadata as any)?.avatar_url || (user?.user_metadata as any)?.picture || '';

  const perfilLabel = useMemo(() => {
    const summary = profileSummary as any;
    if (summary?.perfilContexto) return String(summary.perfilContexto);
    if (Array.isArray(summary?.perfilTipos) && summary.perfilTipos.length > 0) {
      const mapa: Record<string, string> = {
        faculdade: 'Estudante de Direito',
        oab: 'Concurseiro OAB',
        concurso: 'Concurseiro',
        advogado: 'Advogado(a)',
      };
      return mapa[summary.perfilTipos[0]] || 'Estudante de Direito';
    }
    return 'Meu Perfil';
  }, [profileSummary]);

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
        {/* Perfil do Usuário */}
        <button
          onClick={() => navigate('/perfil')}
          className="flex items-center gap-3.5 shrink-0 group text-left cursor-pointer transition-transform hover:scale-[1.02]"
          title="Ver meu perfil"
        >
          <div className="relative">
            <div className="absolute inset-0 blur-lg bg-primary/40 rounded-full scale-110 group-hover:scale-125 transition-transform" />
            <div className="relative w-12 h-12 md:w-13 md:h-13 rounded-full overflow-hidden shadow-xl border-2 border-white/80 bg-neutral-900/60 flex items-center justify-center group-hover:border-primary transition-colors">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User2 className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
              )}
            </div>
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className="font-display text-lg xl:text-xl font-bold text-white tracking-tight drop-shadow-sm group-hover:text-primary transition-colors line-clamp-1 max-w-[200px] xl:max-w-[280px]">
              {displayName}
            </span>
            <span className="font-body text-[10px] xl:text-[11px] uppercase tracking-[0.2em] text-white/80 font-medium">
              {perfilLabel}
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
