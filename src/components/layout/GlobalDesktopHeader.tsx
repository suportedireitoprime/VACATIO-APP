import { useLocation } from 'react-router-dom';
import { useIsDesktop } from '@/hooks/use-desktop';
import DesktopTopHeader from '@/components/vademecum/DesktopTopHeader';
import DesktopBreadcrumb from '@/components/vademecum/DesktopBreadcrumb';

// Rotas onde NÃO queremos o cabeçalho amarelo global:
// - Index (`/`) já renderiza o próprio DesktopTopHeader
// - Rotas públicas/onboarding/auth: o cabeçalho não faz sentido
const EXCLUDED_EXACT = new Set<string>([
  '/',
  '/auth',
  '/landing',
  '/privacidade',
  '/termos',
  '/excluir-conta',
  '/reset-password',
  '/onboarding',
]);

const EXCLUDED_PREFIXES = ['/desktop-link/'];

const GlobalDesktopHeader = () => {
  const isDesktop = useIsDesktop();
  const location = useLocation();

  if (!isDesktop) return null;
  if (EXCLUDED_EXACT.has(location.pathname)) return null;
  if (EXCLUDED_PREFIXES.some((p) => location.pathname.startsWith(p))) return null;

  return (
    <>
      <DesktopTopHeader />
      <DesktopBreadcrumb />
    </>
  );
};

export default GlobalDesktopHeader;
