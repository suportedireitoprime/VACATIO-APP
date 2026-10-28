import {
  BookOpenText,
  ScanEye,
  Newspaper,
  Film,
  NotebookText,
  Clapperboard,
  MapPin,
  Radar,
  Camera,
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
  Headphones,
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
    label: 'Pesquisa e Áudio',
    hint: 'Consulta de conceitos, áudio-aulas e narrações da legislação',
    tools: [
      { id: 'audio-leis', label: 'Áudio Leis', desc: 'Narrações dos artigos de leis e códigos', icon: Mic, route: '/audio-leis', color: '#10B981' },
      { id: 'audioaulas', label: 'Audioaulas', desc: '124 aulas em áudio por área do Direito', icon: Headphones, route: '/audioaulas', color: '#EC4899' },
      { id: 'desktop', label: 'Modo Desktop', desc: 'Acesso via computador', icon: Monitor, route: '/desktop', color: '#10B981' },
      { id: 'biblioteca', label: 'Biblioteca', desc: 'Livros, manuais e doutrinas', icon: Library, route: '/biblioteca', color: '#F59E0B' },
      { id: 'dicionario', label: 'Dicionário Jurídico', desc: 'Termos e conceitos do Direito', icon: BookOpenText, route: '/ferramentas/dicionario', color: '#3B82F6' },
      { id: 'resumos', label: 'Resumos Jurídicos', desc: 'Biblioteca por área, tema e subtema', icon: NotebookText, route: '/resumos-juridicos', color: '#A855F7' },
    ],
  },
  {
    id: 'monitoramento',
    label: 'Monitoramento',
    hint: 'Acompanhe alterações legislativas e notícias',
    tools: [
      { id: 'radar-360', label: 'Radar 360', desc: 'Monitore votações, deputados e proposições', icon: ScanEye, route: '/radar', color: '#A78BFA' },
      { id: 'noticias', label: 'Notícias', desc: 'Notícias jurídicas e atualizações', icon: Newspaper, route: '/noticias', color: '#EC4899' },
      { id: 'boletins', label: 'Boletins Jurídicos', desc: 'Vídeo diário com as normas quentes', icon: Clapperboard, route: '/boletins', color: '#EF4444' },
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
