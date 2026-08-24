import m1 from '@/assets/aprender-mascotes/direito-adm-1.png.asset.json';
import m2 from '@/assets/aprender-mascotes/direito-adm-2.png.asset.json';
import m3 from '@/assets/aprender-mascotes/direito-adm-3.png.asset.json';
import m4 from '@/assets/aprender-mascotes/direito-adm-4.png.asset.json';
import m5 from '@/assets/aprender-mascotes/direito-adm-5.png.asset.json';
import m6 from '@/assets/aprender-mascotes/direito-adm-6.png.asset.json';
import m7 from '@/assets/aprender-mascotes/direito-adm-7.png.asset.json';
import nDominante from '@/assets/aprender-mascotes/nivel-dominante.png.asset.json';
import nMediano from '@/assets/aprender-mascotes/nivel-mediano.png.asset.json';
import nIniciante from '@/assets/aprender-mascotes/nivel-iniciante.png.asset.json';

const direitoAdministrativo = [m1, m2, m3, m4, m5, m6, m7].map((a) => a.url);

export const mascotesPorArea: Record<string, string[]> = {
  'direito-administrativo': direitoAdministrativo,
};

export function getMascotesArea(slug: string | undefined | null): string[] {
  if (!slug) return direitoAdministrativo;
  return mascotesPorArea[slug] ?? direitoAdministrativo;
}

export type NivelDominio = 'dominante' | 'mediano' | 'iniciante';

export const mascotesNivel: Record<NivelDominio, string> = {
  dominante: nDominante.url,
  mediano: nMediano.url,
  iniciante: nIniciante.url,
};

export function calcularNivel(pct: number, totalRespondidas: number): NivelDominio {
  if (totalRespondidas < 5) return 'iniciante';
  if (pct >= 80) return 'dominante';
  if (pct >= 50) return 'mediano';
  return 'iniciante';
}

export const rotuloNivel: Record<NivelDominio, string> = {
  dominante: 'Dominante',
  mediano: 'Mediano',
  iniciante: 'Iniciante',
};
