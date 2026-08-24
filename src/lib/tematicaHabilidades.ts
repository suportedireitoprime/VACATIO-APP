import {
  Crown,
  Megaphone,
  Mic,
  Handshake,
  MessagesSquare,
  Target,
  Scale,
  Mountain,
  Search,
  PenLine,
  type LucideIcon,
} from "lucide-react";

export type HabilidadeId =
  | "lideranca"
  | "persuasao"
  | "oratoria"
  | "negociacao"
  | "argumentacao"
  | "estrategia"
  | "etica"
  | "resiliencia"
  | "investigacao"
  | "escrita";

export interface Habilidade {
  id: HabilidadeId;
  label: string;
  short: string;
  descricao: string;
  icon: LucideIcon;
  /** Cor principal (tailwind base) */
  tone: string;
  /** Classe de fundo do chip inativo */
  chipBg: string;
  /** Classe de fundo do chip ativo */
  chipActive: string;
  /** Gradiente para o hero */
  heroGradient: string;
}

export const HABILIDADES: Habilidade[] = [
  {
    id: "lideranca",
    label: "Liderança",
    short: "Liderar",
    descricao: "Filmes que ensinam a inspirar, decidir sob pressão e conduzir pessoas em direção a um objetivo comum.",
    icon: Crown,
    tone: "amber",
    chipBg: "bg-amber-950/40 border-amber-500/25 text-amber-100",
    chipActive: "bg-amber-500 border-amber-400 text-black",
    heroGradient: "linear-gradient(135deg, hsl(35 90% 22%), hsl(15 70% 12%))",
  },
  {
    id: "persuasao",
    label: "Persuasão",
    short: "Persuadir",
    descricao: "Aprenda com personagens que convencem, vendem ideias, mudam opiniões e movem massas.",
    icon: Megaphone,
    tone: "red",
    chipBg: "bg-red-950/40 border-red-500/25 text-red-100",
    chipActive: "bg-red-500 border-red-400 text-white",
    heroGradient: "linear-gradient(135deg, hsl(0 75% 25%), hsl(355 60% 12%))",
  },
  {
    id: "oratoria",
    label: "Oratória & Dicção",
    short: "Oratória",
    descricao: "Discursos memoráveis, técnica vocal, presença de palco e a arte de falar em público.",
    icon: Mic,
    tone: "rose",
    chipBg: "bg-rose-950/40 border-rose-500/25 text-rose-100",
    chipActive: "bg-rose-500 border-rose-400 text-white",
    heroGradient: "linear-gradient(135deg, hsl(345 70% 24%), hsl(340 55% 12%))",
  },
  {
    id: "negociacao",
    label: "Negociação",
    short: "Negociar",
    descricao: "Táticas de barganha, gestão de conflitos e acordos que parecem impossíveis.",
    icon: Handshake,
    tone: "emerald",
    chipBg: "bg-emerald-950/40 border-emerald-500/25 text-emerald-100",
    chipActive: "bg-emerald-500 border-emerald-400 text-black",
    heroGradient: "linear-gradient(135deg, hsl(155 60% 20%), hsl(160 55% 10%))",
  },
  {
    id: "argumentacao",
    label: "Argumentação",
    short: "Argumentar",
    descricao: "Sustentação oral, retórica jurídica e construção lógica em tribunal.",
    icon: MessagesSquare,
    tone: "sky",
    chipBg: "bg-sky-950/40 border-sky-500/25 text-sky-100",
    chipActive: "bg-sky-500 border-sky-400 text-white",
    heroGradient: "linear-gradient(135deg, hsl(210 70% 22%), hsl(215 55% 10%))",
  },
  {
    id: "estrategia",
    label: "Estratégia",
    short: "Estratégia",
    descricao: "Xadrez, jogos de poder, planejamento de longo prazo e decisões de alto risco.",
    icon: Target,
    tone: "violet",
    chipBg: "bg-violet-950/40 border-violet-500/25 text-violet-100",
    chipActive: "bg-violet-500 border-violet-400 text-white",
    heroGradient: "linear-gradient(135deg, hsl(265 60% 22%), hsl(270 55% 10%))",
  },
  {
    id: "etica",
    label: "Ética",
    short: "Ética",
    descricao: "Dilemas morais, integridade profissional e coragem de fazer o certo quando ninguém está olhando.",
    icon: Scale,
    tone: "teal",
    chipBg: "bg-teal-950/40 border-teal-500/25 text-teal-100",
    chipActive: "bg-teal-500 border-teal-400 text-black",
    heroGradient: "linear-gradient(135deg, hsl(175 60% 20%), hsl(180 55% 10%))",
  },
  {
    id: "resiliencia",
    label: "Resiliência",
    short: "Resiliência",
    descricao: "Superação, disciplina e a força de continuar quando tudo parece perdido.",
    icon: Mountain,
    tone: "orange",
    chipBg: "bg-orange-950/40 border-orange-500/25 text-orange-100",
    chipActive: "bg-orange-500 border-orange-400 text-black",
    heroGradient: "linear-gradient(135deg, hsl(25 75% 22%), hsl(20 60% 10%))",
  },
  {
    id: "investigacao",
    label: "Investigação",
    short: "Investigar",
    descricao: "Análise profunda, coleta de evidências e raciocínio dedutivo para desvendar a verdade.",
    icon: Search,
    tone: "slate",
    chipBg: "bg-slate-800/60 border-slate-500/30 text-slate-100",
    chipActive: "bg-slate-500 border-slate-400 text-white",
    heroGradient: "linear-gradient(135deg, hsl(215 25% 22%), hsl(220 30% 10%))",
  },
  {
    id: "escrita",
    label: "Escrita",
    short: "Escrever",
    descricao: "Peças, discursos e narrativas que persuadem no papel — a base de todo grande jurista.",
    icon: PenLine,
    tone: "cyan",
    chipBg: "bg-cyan-950/40 border-cyan-500/25 text-cyan-100",
    chipActive: "bg-cyan-500 border-cyan-400 text-black",
    heroGradient: "linear-gradient(135deg, hsl(190 65% 20%), hsl(195 55% 10%))",
  },
];

export const HABILIDADES_MAP: Record<HabilidadeId, Habilidade> = HABILIDADES.reduce(
  (acc, h) => ({ ...acc, [h.id]: h }),
  {} as Record<HabilidadeId, Habilidade>,
);

export function isHabilidadeId(v: string): v is HabilidadeId {
  return v in HABILIDADES_MAP;
}
