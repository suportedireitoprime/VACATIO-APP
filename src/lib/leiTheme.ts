// Central theme (accent color + hero cover) per legislation.
// Reused by CategoriaLegislacao header and ArtigoCard badge.

import { COVERS } from './coverLoader';

const COLOR_MAP: Record<string, string> = {
  cf88: '#0B6E4F',
  cp:   '#7B1E1E',
  cpm:  '#7B1E1E',
  cc:   '#1E3A5F',
  cpc:  '#6B4423',
  cpp:  '#8B3A1F',
  clt:  '#0F5F5C',
  cdc:  '#9F1239',
  eca:  '#2C5282',
  ctn:  '#78350F',
};

const TIPO_COLOR: Record<string, string> = {
  constituicao:   '#0B6E4F',
  codigo:         '#1E3A5F',
  estatuto:       '#9F1239',
  'lei-especial': '#6B4423',
  sumula:         '#8B3A1F',
  jurisprudencia: '#8B3A1F',
};

const FALLBACK = ['#0B6E4F','#1E3A5F','#6B4423','#8B3A1F','#9F1239','#0F5F5C','#78350F','#2C5282','#7B1E1E','#4C1D95'];
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
  cpc:  COVERS.cc,
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
