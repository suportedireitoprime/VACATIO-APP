import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

// Mapa de segmentos "crus" → rótulos legíveis
const LABEL_MAP: Record<string, string> = {
  legislacao: 'Legislação',
  constituicao: 'Constituição',
  codigos: 'Códigos',
  estatutos: 'Estatutos',
  sumulas: 'Súmulas',
  'leis-ordinarias': 'Leis Ordinárias',
  'leis-especiais': 'Principais Leis',
  decretos: 'Decretos',
  aprender: 'Aprender',
  ferramentas: 'Ferramentas',
  noticias: 'Notícias',
  blog: 'Blog',
  boletins: 'Boletins',
  newsletter: 'Newsletter',
  radar: 'Radar',
  'radar-360': 'Radar 360',
  assistente: 'Assistente',
  'assistente-horus': 'Horus',
  estudos: 'Estudar',
  estudar: 'Estudar',
  dicionario: 'Dicionário Jurídico',
  'dicionario-juridico': 'Dicionário Jurídico',
  tematica: 'Temática Jurídica',
  locais: 'Locais',
  pessoal: 'Pessoal',
  artigos: 'Artigos',
  anotacoes: 'Anotações',
  perfil: 'Perfil',
  configuracoes: 'Configurações',
  assinatura: 'Assinatura',
  admin: 'Admin',
  offline: 'Offline',
  'modo-offline': 'Modo Offline',
};

function humanize(seg: string): string {
  const decoded = decodeURIComponent(seg);
  if (LABEL_MAP[decoded]) return LABEL_MAP[decoded];
  // Rótulos genéricos: converter kebab-case em Title Case
  return decoded
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const DesktopBreadcrumb = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  // Home page: não mostrar nada (redundante)
  if (segments.length === 0) return null;

  const trail = segments.map((seg, i) => {
    const path = '/' + segments.slice(0, i + 1).join('/');
    return { label: humanize(seg), path };
  });

  return (
    <nav
      key={location.pathname}
      aria-label="Breadcrumb"
      className="relative z-30 w-full border-b border-border/60 bg-background/85 backdrop-blur-md"
    >
      <ol className="mx-auto flex max-w-7xl items-center gap-1.5 px-8 xl:px-12 py-2 text-[12px] font-body">
        <li>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="sr-only">Início</span>
          </button>
        </li>
        {trail.map((step, i) => {
          const isLast = i === trail.length - 1;
          return (
            <li key={step.path} className="flex items-center gap-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
              {isLast ? (
                <span className="font-semibold text-foreground truncate max-w-[240px]">
                  {step.label}
                </span>
              ) : (
                <button
                  onClick={() => navigate(step.path)}
                  className="text-muted-foreground hover:text-primary transition-colors truncate max-w-[180px]"
                >
                  {step.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default DesktopBreadcrumb;
