import React from 'react';
import {
  Target,
  Layers,
  Search,
  PenTool,
  Puzzle,
  CheckCircle2,
  Split,
  Briefcase,
  AlertTriangle,
  Timer,
  Mic,
  Flame,
  ChevronRight,
  GraduationCap,
  Pencil,
  LucideIcon
} from 'lucide-react';

export type ModoPraticarId =
  | 'questoes'
  | 'flashcards'
  | 'licoes'
  | 'complete'
  | 'monte'
  | 'verdadeiro_falso'
  | 'caca_palavras'
  | 'relacione'
  | 'casos_praticos'
  | 'identifique_erro'
  | 'contra_relogio'
  | 'ouca_recite'
  | 'combo';

export interface ModoPraticarItem {
  id: ModoPraticarId;
  label: string;
  desc: string;
  icon: LucideIcon;
  color: string;
  badge?: string;
  fase: number;
}

export const MODOS_PRATICAR: ModoPraticarItem[] = [
  // Modos Principais de Prática (Cores e ícones idênticos ao início da lei)
  {
    id: 'questoes',
    label: 'Questões',
    desc: 'Múltipla escolha com comentários, gabarito e exemplos',
    icon: Target,
    color: '#FACC15',
    fase: 1,
  },
  {
    id: 'flashcards',
    label: 'Flashcards',
    desc: 'Cards com flip animado, síntese e exemplos práticos',
    icon: Layers,
    color: '#34D399',
    fase: 1,
  },
  {
    id: 'licoes',
    label: 'Lições',
    desc: 'Fixação da lei: complete o artigo, quebra-cabeça e desafios em sequência',
    icon: Pencil,
    color: '#38BDF8',
    badge: 'Super Interativo',
    fase: 1,
  },

  // Modos de Texto e Lacunas
  {
    id: 'complete',
    label: 'Complete o Artigo',
    desc: 'Preencha as palavras-chave ocultadas no texto da lei',
    icon: PenTool,
    color: '#3B82F6',
    fase: 1,
  },
  {
    id: 'monte',
    label: 'Monte o Artigo',
    desc: 'Quebra-cabeça sequencial: ordene os fragmentos da norma',
    icon: Puzzle,
    color: '#8B5CF6',
    fase: 1,
  },
  {
    id: 'verdadeiro_falso',
    label: 'Verdadeiro ou Falso',
    desc: 'Acerte afirmativas rápidas e pegadinhas de concursos',
    icon: CheckCircle2,
    color: '#10B981',
    fase: 1,
  },

  // Gamificação e Análise
  {
    id: 'caca_palavras',
    label: 'Caça-Palavras Jurídico',
    desc: 'Encontre termos e institutos jurídicos escondidos na grade',
    icon: Search,
    color: '#06B6D4',
    fase: 2,
  },
  {
    id: 'relacione',
    label: 'Relacione as Colunas',
    desc: 'Ligue os incisos e alíneas aos seus conceitos corretos',
    icon: Split,
    color: '#EC4899',
    fase: 2,
  },
  {
    id: 'identifique_erro',
    label: 'Identifique o Erro',
    desc: 'Descubra a palavra ou prazo sutilmente trocado no texto',
    icon: AlertTriangle,
    color: '#EF4444',
    fase: 2,
  },

  // Prática Avançada
  {
    id: 'casos_praticos',
    label: 'Casos Práticos',
    desc: 'Situações da vida real resolvidas com a regra deste artigo',
    icon: Briefcase,
    color: '#6366F1',
    fase: 3,
  },
  {
    id: 'contra_relogio',
    label: 'Desafio Contra o Relógio',
    desc: 'Perguntas de tiro rápido antes que o tempo esgote',
    icon: Timer,
    color: '#F97316',
    fase: 3,
  },

  // Voz e Maratona
  {
    id: 'ouca_recite',
    label: 'Ouça e Complete / Recite',
    desc: 'Treine a fala e recite trechos da lei por reconhecimento de voz',
    icon: Mic,
    color: '#14B8A6',
    fase: 4,
  },
  {
    id: 'combo',
    label: 'Combo Desafio Total',
    desc: 'Maratona com todas as modalidades em uma única sessão',
    icon: Flame,
    color: '#E11D48',
    fase: 4,
  },
];
