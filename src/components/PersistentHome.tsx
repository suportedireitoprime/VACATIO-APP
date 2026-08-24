import { useLocation } from "react-router-dom";
import Index from "@/pages/Index";
import { useAuth } from "@/hooks/useAuth";

/**
 * Mantém a Home montada em memória o tempo todo, apenas alternando
 * display none/block conforme a rota atual. Ao voltar de uma lei (POP),
 * o browser só precisa reexibir o DOM já pintado — sem remount do
 * `MobileHomeSections`/`IndexDesktop`, sem re-fetch, sem re-hidratação.
 *
 * Precisa ficar FORA de <Routes> porque o `<Routes key={pathname}>` do App
 * remonta todo o subárvore a cada navegação.
 */
const PersistentHome = () => {
  const location = useLocation();
  const { user, loading } = useAuth();

  // Só monta depois que a auth resolveu e temos usuário — evita rodar
  // efeitos da Home no fluxo público (auth/landing/etc).
  if (loading || !user) return null;

  const publicPaths = new Set([
    "/auth",
    "/landing",
    "/privacidade",
    "/termos",
    "/excluir-conta",
    "/suporte-publico",
    "/reset-password",
    "/onboarding",
  ]);
  const isPublic =
    publicPaths.has(location.pathname) ||
    location.pathname.startsWith("/desktop-link/");
  if (isPublic) return null;

  const visible = location.pathname === "/";
  return (
    <div
      style={{ display: visible ? "block" : "none" }}
      aria-hidden={!visible}
    >
      <Index />
    </div>
  );
};

export default PersistentHome;
