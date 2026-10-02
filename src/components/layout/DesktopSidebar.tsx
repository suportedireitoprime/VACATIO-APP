import { useIsDesktop } from '@/hooks/use-desktop';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, BookOpen, Search, Bookmark, Settings, MessageCircle, Gavel } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import vacatioLogoBundled from '@/assets/bundled/logo-vacatio-v2.webp';
import { pickAsset } from '@/lib/assetUrl';
import vacatioLogoAsset from '@/assets/logo-vacatio-v2.png.asset.json';

const vacatioLogo = pickAsset(vacatioLogoBundled, vacatioLogoAsset.url);

export const DesktopSidebar = () => {
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isDesktop) return null;

  // Rotas onde não queremos sidebar
  const EXCLUDED_EXACT = new Set([
    '/auth',
    '/landing',
    '/privacidade',
    '/termos',
    '/excluir-conta',
    '/reset-password',
    '/onboarding',
  ]);
  const EXCLUDED_PREFIXES = ['/desktop-link/'];

  if (EXCLUDED_EXACT.has(location.pathname)) return null;
  if (EXCLUDED_PREFIXES.some((p) => location.pathname.startsWith(p))) return null;

  const links = [
    { label: 'Início', icon: Home, path: '/', shortcut: '' },
    { label: 'Códigos', icon: Gavel, path: '/legislacao/codigos', shortcut: '' },
    { label: 'Estatutos', icon: BookOpen, path: '/legislacao/estatutos', shortcut: '' },
    { label: 'Busca', icon: Search, path: '/buscador', shortcut: 'Ctrl+K' },
    { label: 'Assistente', icon: MessageCircle, path: '/assistente-horus', shortcut: '' },
    { label: 'Favoritos', icon: Bookmark, path: '/pessoal/favoritos', shortcut: '' },
    { label: 'Configurações', icon: Settings, path: '/configuracoes', shortcut: '' },
  ];

  return (
    <div className="fixed top-0 left-0 h-screen w-[80px] hover:w-[240px] bg-background border-r border-white/5 transition-all duration-300 z-50 flex flex-col group overflow-hidden shrink-0">
      <div className="h-[104px] flex items-center px-4 shrink-0 border-b border-white/5">
        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-primary/20 cursor-pointer" onClick={() => navigate('/')}>
          <img src={vacatioLogo} alt="Logo" className="w-full h-full object-cover" />
        </div>
        <span className="ml-4 font-display font-bold text-xl text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap cursor-pointer" onClick={() => navigate('/')}>
          Vacatio
        </span>
      </div>
      <div className="flex-1 py-6 flex flex-col gap-2 overflow-y-auto [scrollbar-width:none]">
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Tooltip delayDuration={300} key={link.path}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate(link.path)}
                  className={`w-full flex items-center px-6 py-4 transition-colors hover:bg-white/5 ${isActive ? 'text-primary border-r-2 border-primary bg-primary/5' : 'text-white/60 hover:text-white'}`}
                >
                  <link.icon className="w-6 h-6 shrink-0" />
                  <span className="ml-6 font-display font-bold text-[15px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap tracking-wide">
                    {link.label}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="ml-2 flex items-center gap-2">
                {link.label}
                {link.shortcut && <span className="text-xs text-muted-foreground bg-white/10 px-1.5 py-0.5 rounded">{link.shortcut}</span>}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};
