import { useIsDesktop } from '@/hooks/use-desktop';
import { Link, useLocation } from 'react-router-dom';
import vacatioLogoBundled from '@/assets/bundled/logo-vacatio-v2.webp';
import { pickAsset } from '@/lib/assetUrl';
import vacatioLogoAsset from '@/assets/logo-vacatio-v2.png.asset.json';

const vacatioLogo = pickAsset(vacatioLogoBundled, vacatioLogoAsset.url);

const EXCLUDED_EXACT = new Set([
  '/auth',
  '/landing',
  '/onboarding',
]);

const GlobalDesktopFooter = () => {
  const isDesktop = useIsDesktop();
  const location = useLocation();

  if (!isDesktop || EXCLUDED_EXACT.has(location.pathname)) return null;

  return (
    <footer className="w-full border-t border-border/40 bg-background/50 backdrop-blur-sm mt-auto py-12 px-8 xl:px-12 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-muted-foreground z-10 relative">
      <div className="flex items-center gap-4">
        <img src={vacatioLogo} alt="Vacatio" className="w-8 h-8 rounded-lg opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all" />
        <p>© 2026 Vacatio - Direito Prime. Todos os direitos reservados.</p>
      </div>
      <div className="flex gap-6">
        <Link to="/termos" className="hover:text-primary transition-colors">Termos de Uso</Link>
        <Link to="/privacidade" className="hover:text-primary transition-colors">Privacidade</Link>
        <Link to="/suporte-publico" className="hover:text-primary transition-colors">Suporte</Link>
      </div>
    </footer>
  );
};
export default GlobalDesktopFooter;
