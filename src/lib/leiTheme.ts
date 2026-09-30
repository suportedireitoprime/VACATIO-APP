// Central theme (accent color + hero cover) per legislation.
// Reused by CategoriaLegislacao header and ArtigoCard badge.

import { COVERS } from './coverLoader';

const COLOR_MAP: Record<string, string> = {
  cf88: '#10B981', // Emerald 500
  cp:   '#EF4444', // Red 500
  cpm:  '#EF4444',
  cc:   '#3B82F6', // Blue 500
  cpc:  '#0EA5E9', // Sky 500
  cpp:  '#F97316', // Orange 500
  clt:  '#14B8A6', // Teal 500
  cdc:  '#F43F5E', // Rose 500
  eca:  '#6366F1', // Indigo 500
  ctn:  '#F59E0B', // Amber 500
};

const TIPO_COLOR: Record<string, string> = {
  constituicao:   '#10B981',
  codigo:         '#3B82F6',
  estatuto:       '#F43F5E',
  'lei-especial': '#F59E0B',
  sumula:         '#F97316',
  jurisprudencia: '#F97316',
};

const FALLBACK = ['#10B981','#3B82F6','#F59E0B','#F97316','#F43F5E','#14B8A6','#8B5CF6','#EC4899','#EF4444','#0EA5E9'];
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
