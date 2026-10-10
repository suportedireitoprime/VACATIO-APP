import {
  Scale, BookOpen, Gavel, Landmark, ShieldCheck, Handshake, Users, Baby, Briefcase,
  Building2, Leaf, Vote, Globe2, Receipt, ShoppingCart, HeartPulse, Car, Home,
  Fingerprint, FileText, Stamp, Siren, Lock, Banknote, GraduationCap, Truck,
  Accessibility, Cpu, Landmark as Bank, BadgeCheck, BookMarked, Library, ScrollText,
  type LucideIcon,
} from 'lucide-react';

/** Palavras-chave → ícone. A primeira correspondência no rótulo/chave vence. */
const REGRAS: Array<[RegExp, LucideIcon]> = [
  [/constitui/i, Landmark],
  [/processo penal|processual penal/i, Siren],
  [/processo civil|processual civil/i, ScrollText],
  [/penal|crime|contravenc/i, Fingerprint],
  [/civil/i, Handshake],
  [/tribut|fiscal|imposto/i, Receipt],
  [/consumidor/i, ShoppingCart],
  [/trabalh|clt/i, Briefcase],
  [/previdenc|seguridade/i, HeartPulse],
  [/ambient|floresta|clima/i, Leaf],
  [/eleitor/i, Vote],
  [/internacional|migra|estrangeir/i, Globe2],
  [/administrativ|licita|improbidade|servidor/i, Building2],
  [/empresarial|societ|falenc|recupera/i, Bank],
  [/crianca|adolescente|eca|menor/i, Baby],
  [/idoso|deficien|inclus|acessib/i, Accessibility],
  [/mulher|maria da penha|violenc/i, ShieldCheck],
  [/familia|casamento|uniao/i, Users],
  [/transito|ctb|veicul/i, Car],
  [/imob|inquilin|locac|registro publico/i, Home],
  [/dados|lgpd|internet|digital|informatic/i, Cpu],
  [/educac|ensino|lei de diretrizes|ldb/i, GraduationCap],
  [/transporte|carga|aeronaut/i, Truck],
  [/financ|banc|monetari|mercado de capitais|licitatori/i, Banknote],
  [/lavagem|drogas|organizac criminosa|arma/i, Lock],
  [/etica|oab|advocacia|estatuto da advocacia/i, BadgeCheck],
  [/sumula|precedent|repercussao|repetitiv|controle concentrado|habeas/i, Gavel],
  [/teoria geral|hermeneut|introduc/i, BookMarked],
  [/codigo/i, BookOpen],
  [/estatuto/i, Stamp],
  [/lei|decreto/i, FileText],
];

/** Retorna um ícone representativo do item (lei, matéria ou tema de jurisprudência). */
export function iconeDoItem(key: string, label: string, sub?: string): LucideIcon {
  const alvo = `${label} ${sub ?? ''} ${key}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  for (const [re, icone] of REGRAS) if (re.test(alvo)) return icone;
  if (key.startsWith('juris:')) return Gavel;
  if (key.startsWith('materia:')) return Library;
  return Scale;
}
