import { srcOf } from '@/lib/assetUrl';
import capaAudioaulas from '@/assets/atalho-audioaulas.webp.asset.json';
import capaPenal from '@/assets/direito-penal.webp.asset.json';
import capaCivil from '@/assets/direito-civil.webp.asset.json';
import capaConstituicao from '@/assets/direito-constituicao.webp.asset.json';
import capaClt from '@/assets/direito-clt.webp.asset.json';
import capaMedico from '@/assets/capa-direito-medico.webp';
import capaFilosofia from '@/assets/capa-filosofia.webp';
import capaLeiPenalEspecial from '@/assets/capa-lei-penal-especial.webp';
import capaProcessoPenal from '@/assets/capa-processo-penal.webp';

export const CAPA_HUB = srcOf(capaAudioaulas);
const CAPAS: { re: RegExp; url: string }[] = [
  { re: /médico|medico/i, url: capaMedico },
  { re: /filosofia/i, url: capaFilosofia },
  { re: /lei penal especial/i, url: capaLeiPenalEspecial },
  { re: /processo penal/i, url: capaProcessoPenal },
  { re: /penal/i, url: srcOf(capaPenal) },
  { re: /civil/i, url: srcOf(capaCivil) },
  { re: /constitu/i, url: srcOf(capaConstituicao) },
  { re: /trabalh|clt/i, url: srcOf(capaClt) },
];

export const capaDaArea = (area: string) => CAPAS.find((c) => c.re.test(area))?.url || CAPA_HUB;

export const normalizar = (s: string) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

export const VELOCIDADES = [1, 1.25, 1.5, 2];
