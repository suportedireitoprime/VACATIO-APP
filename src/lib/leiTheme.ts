// Central theme (accent color + hero cover) per legislation.
// Reused by CategoriaLegislacao header and ArtigoCard badge.

import { COVERS } from './coverLoader';

const COLOR_MAP: Record<string, string> = {
  cf88: '#059669', // Emerald 600
  cp:   '#DC2626', // Red 600
  cpm:  '#DC2626',
  cc:   '#2563EB', // Blue 600
  cpc:  '#0284C7', // Sky 600
  cpp:  '#EA580C', // Orange 600
  clt:  '#0D9488', // Teal 600
  cdc:  '#E11D48', // Rose 600
  eca:  '#4F46E5', // Indigo 600
  ctn:  '#D97706', // Amber 600
};

const TIPO_COLOR: Record<string, string> = {
  constituicao:   '#059669',
  codigo:         '#2563EB',
  estatuto:       '#E11D48',
  'lei-especial': '#D97706',
  sumula:         '#EA580C',
  jurisprudencia: '#EA580C',
};

const FALLBACK = ['#059669','#2563EB','#D97706','#EA580C','#E11D48','#0D9488','#4F46E5','#EC4899','#DC2626','#0284C7'];
function hash(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return FALLBACK[h % FALLBACK.length];
}

export function getLeiColor(id?: string | null, tipo?: string | null): string {
  if (id && COLOR_MAP[id]) return COLOR_MAP[id];
  if (tipo && TIPO_COLOR[tipo]) return TIPO_COLOR[tipo];
  return hash(id || tipo || 'default');
}

const COVER_MAP: Record<string, string> = {
  cf88: COVERS.cf88,
  cp:   COVERS.cp,
  cpm:  COVERS.cp,
  cc:   COVERS.cc,
  cpc:  COVERS.cpc,
  cpp:  COVERS.cp,
  clt:  COVERS.clt,
  cdc:  COVERS.cdc,
  ctn:  COVERS.ctn,
  // Estatutos temáticos
  eca:  COVERS.eca,
  ei:   COVERS.ei,
  epd:  COVERS.epd,
  eir:  COVERS.eir,
  ec:   COVERS.ec,
  ed:   COVERS.ed,
  eoab: COVERS.eoab,
};


export function getLeiCover(id?: string | null, _tipo?: string | null): string {
  if (id && COVER_MAP[id]) return COVER_MAP[id];
  return COVERS.default;
}

// Utility: darken/lighten a hex color by amount (-1..1). Used for gradient endpoints.
export function shade(hex: string, amt: number): string {
  const h = hex.replace('#', '');
  const num = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  r = Math.round((t - r) * p + r);
  g = Math.round((t - g) * p + g);
  b = Math.round((t - b) * p + b);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
