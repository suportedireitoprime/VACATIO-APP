import {
  BookOpenText,
  ScanEye,
  Newspaper,
  Film,
  NotebookText,
  Clapperboard,
  MapPin,
  Radar,
  Mic,
  Mail,
  CloudDownload,
  Library,
  GraduationCap,
  Bell,
  CreditCard,
  LifeBuoy,
  User,
  Sparkles,
  Layers,
  Monitor,
  type LucideIcon,
} from 'lucide-react';

export type DesktopTool = {
  id: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  route: string;
  color: string;
};

export type DesktopToolGroup = {
  id: string;
  label: string;
  hint: string;
  tools: DesktopTool[];
};

export const DESKTOP_TOOL_GROUPS: DesktopToolGroup[] = [
  {
    id: 'pesquisa',
    label: 'Pesquisa',
    hint: 'Consulta rápida de conceitos, resumos e referências',
    tools: [
      { id: 'desktop', label: 'Modo Desktop', desc: 'Acesso via computador', icon: Monitor, route: '/desktop', color: '#10B981' },
      { id: 'dicionario', label: 'Dicionário Jurídico', desc: 'Termos e conceitos do Direito', icon: BookOpenText, route: '/ferramentas/dicionario', color: '#3B82F6' },
      { id: 'resumos', label: 'Resumos Jurídicos', desc: 'Biblioteca por área, tema e subtema', icon: NotebookText, route: '/resumos-juridicos', color: '#A855F7' },
      { id: 'locais', label: 'Locais Jurídicos', desc: 'Tribunais, cartórios e delegacias', icon: MapPin, route: '/ferramentas/locais', color: '#14B8A6' },
    ],
  },
  {
    id: 'monitoramento',
    label: 'Monitoramento',
    hint: 'Acompanhe alterações legislativas e notícias',
    tools: [
      { id: 'noticias', label: 'Notícias', desc: 'Notícias jurídicas e atualizações', icon: Newspaper, route: '/noticias', color: '#EC4899' },
      { id: 'boletins', label: 'Boletins Jurídicos', desc: 'Vídeo diário com as normas quentes', icon: Clapperboard, route: '/boletins', color: '#EF4444' },
      { id: 'newsletter', label: 'Newsletter', desc: 'Receba o resumo por e-mail', icon: Mail, route: '/newsletter', color: '#F97316' },
    ],
  },
  {
    id: 'producao',
    label: 'Produção',
    hint: 'Escreva, grave e organize seu material',
    tools: [
      { id: 'tematica', label: 'Temática Jurídica', desc: 'Filmes, séries e documentários', icon: Film, route: '/tematica-juridica', color: '#0891B2' },
    ],
  },
  {
    id: 'estudo',
    label: 'Estudo e conta',
    hint: 'Sua trilha, seus materiais e sua assinatura',
    tools: [
      { id: 'offline', label: 'Modo Offline', desc: 'Baixe leis e livros para usar sem internet', icon: CloudDownload, route: '/modo-offline', color: '#64748B' },
    ],
  },
];

export const DESKTOP_TOOLS_FLAT: DesktopTool[] = DESKTOP_TOOL_GROUPS.flatMap((g) => g.tools);
