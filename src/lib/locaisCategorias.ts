import {
  Scale,
  ScrollText,
  Siren,
  Building2,
  Landmark,
  GraduationCap,
  Shield,
  BookMarked,
  Award,
  MapPin,
  type LucideIcon,
} from 'lucide-react';

export type CategoriaLocal =
  | 'tribunais'
  | 'cartorios'
  | 'delegacias'
  | 'presidios'
  | 'museus'
  | 'universidades'
  | 'oab'
  | 'defensoria'
  | 'ministerio_publico';

export const CATEGORIAS_LOCAIS: {
  id: CategoriaLocal;
  label: string;
  icon: LucideIcon;
  cor: string; // classe tailwind
  fonteOsm: boolean;
}[] = [
  { id: 'tribunais', label: 'Tribunais & Fóruns', icon: Scale, cor: 'bg-amber-500', fonteOsm: true },
  { id: 'cartorios', label: 'Cartórios', icon: ScrollText, cor: 'bg-orange-500', fonteOsm: true },
  { id: 'delegacias', label: 'Delegacias', icon: Siren, cor: 'bg-blue-500', fonteOsm: true },
  { id: 'presidios', label: 'Presídios', icon: Building2, cor: 'bg-zinc-500', fonteOsm: true },
  { id: 'museus', label: 'Museus', icon: Landmark, cor: 'bg-fuchsia-500', fonteOsm: true },
  { id: 'universidades', label: 'Faculdades', icon: GraduationCap, cor: 'bg-emerald-500', fonteOsm: true },
  { id: 'oab', label: 'OAB', icon: Award, cor: 'bg-red-500', fonteOsm: false },
  { id: 'defensoria', label: 'Defensoria', icon: Shield, cor: 'bg-teal-500', fonteOsm: false },
  { id: 'ministerio_publico', label: 'Ministério Público', icon: BookMarked, cor: 'bg-violet-500', fonteOsm: false },
];

export function corCategoria(c: string): string {
  return CATEGORIAS_LOCAIS.find((x) => x.id === c)?.cor ?? 'bg-primary';
}

export function labelCategoria(c: string): string {
  return CATEGORIAS_LOCAIS.find((x) => x.id === c)?.label ?? c;
}

export function iconCategoria(c: string): LucideIcon {
  return CATEGORIAS_LOCAIS.find((x) => x.id === c)?.icon ?? MapPin;
}

/** @deprecated use iconCategoria */
export function emojiCategoria(_c: string): string {
  return '';
}
