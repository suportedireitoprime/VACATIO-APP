import {
  Landmark, Leaf, Users, Building2, Scale, Trophy, Briefcase, Vote, Globe,
  Gavel, Shield, HeartPulse, Receipt, Baby, Car, Home, ScrollText, Wallet,
  Handshake, FileText, Mic, Crown, Languages, FlaskConical, Compass,
  type LucideIcon,
} from 'lucide-react';

const AREA_STYLE: Record<string, { icon: LucideIcon; color: string }> = {
  administrativo: { icon: Landmark, color: '#38bdf8' },
  ambiental: { icon: Leaf, color: '#34d399' },
  civil: { icon: Users, color: '#60a5fa' },
  concorrencial: { icon: Building2, color: '#22d3ee' },
  constitucional: { icon: Scale, color: '#c2274a' },
  desportivo: { icon: Trophy, color: '#fb923c' },
  trabalho: { icon: Briefcase, color: '#fb7185' },
  eleitoral: { icon: Vote, color: '#a78bfa' },
  internacional: { icon: Globe, color: '#2dd4bf' },
  penal: { icon: Gavel, color: '#f87171' },
  processo: { icon: ScrollText, color: '#818cf8' },
  processual: { icon: ScrollText, color: '#818cf8' },
  previdenciario: { icon: Shield, color: '#c2274a' },
  tributario: { icon: Receipt, color: '#a3e635' },
  empresarial: { icon: Building2, color: '#e879f9' },
  consumidor: { icon: Wallet, color: '#f472b6' },
  familia: { icon: Baby, color: '#f472b6' },
  transito: { icon: Car, color: '#fb923c' },
  imobiliario: { icon: Home, color: '#c2274a' },
  saude: { icon: HeartPulse, color: '#fb7185' },
  humanos: { icon: Handshake, color: '#34d399' },
};

const PERFORMANCE_STYLE: Record<string, { icon: LucideIcon; color: string }> = {
  'fora-da-toga': { icon: Compass, color: '#f59e0b' },
  oratoria: { icon: Mic, color: '#60a5fa' },
  lideranca: { icon: Crown, color: '#fbbf24' },
  portugues: { icon: Languages, color: '#34d399' },
  pesquisa: { icon: FlaskConical, color: '#a78bfa' },
};

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function styleForArea(area: string) {
  const n = normalize(area);
  for (const key of Object.keys(AREA_STYLE)) {
    if (n.includes(key)) return AREA_STYLE[key];
  }
  return { icon: FileText, color: '#e5c34a' };
}

export function styleForPerformance(id: string) {
  return PERFORMANCE_STYLE[id] ?? { icon: FileText, color: '#e5c34a' };
}
