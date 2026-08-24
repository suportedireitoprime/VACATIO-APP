import {
  Library, Highlighter, Sparkles, Layers, Heart, Radar, GraduationCap, Bot, Download,
  type LucideIcon,
} from 'lucide-react';

export interface BeneficioPremium {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** Lista padrão de benefícios — usada por todos os cards flutuantes de assinatura. */
export const BENEFICIOS_PREMIUM: BeneficioPremium[] = [
  { icon: Library, title: 'Biblioteca completa', description: 'Leitura nativa, PDF, versão folheada, offline e desktop em todo o acervo.' },
  { icon: Highlighter, title: 'Vade Mecum sem limites', description: 'Grifos, anotações, narração, explicações e exemplos ilimitados.' },
  { icon: Sparkles, title: 'Funções de IA no artigo', description: 'Jurisprudência, videoaulas, termos, perguntar e grafo de conexões.' },
  { icon: Layers, title: 'Praticar ilimitado', description: 'Questões e flashcards gerados a partir de qualquer conteúdo.' },
  { icon: Heart, title: 'Favoritos e lembretes ilimitados', description: 'Salve quantos artigos quiser e programe alertas por hora ou local.' },
  { icon: Radar, title: 'Radar Legislativo e Blog', description: 'Projetos de lei em tempo real e todos os artigos exclusivos do blog.' },
  { icon: GraduationCap, title: 'Trilha Aprender ilimitada', description: 'Estude com trilhas guiadas e conteúdo sem limite diário.' },
  { icon: Bot, title: 'Horus 24h no WhatsApp', description: 'Sua assistente jurídica pessoal, com imagem, áudio e PDF.' },
  { icon: Download, title: 'Modo offline e desktop', description: 'Baixe conteúdos para ler sem internet e continue no computador.' },
];
