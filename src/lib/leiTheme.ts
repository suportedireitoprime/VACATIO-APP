// Central theme (accent color + hero cover) per legislation.
// Reused by CategoriaLegislacao header and ArtigoCard badge.

import { COVERS } from './coverLoader';

const COLOR_MAP: Record<string, string> = {
  'cf88': '#059669',
  'cf1969': '#D97706',
  'cf1967': '#D97706',
  'cf1946': '#B45309',
  'cf1937': '#B45309',
  'cf1934': '#92400E',
  'cf1891': '#92400E',
  'cf1824': '#78350F',
  'cp': '#DC2626',
  'cc': '#2563EB',
  'cpc': '#0284C7',
  'cpp': '#EA580C',
  'ctn': '#D97706',
  'cdc': '#E11D48',
  'clt': '#0D9488',
  'ctb': '#0EA5E9',
  'ce': '#16A34A',
  'cpm': '#DC2626',
  'cppm': '#B91C1C',
  'cflor': '#16A34A',
  'ccom': '#A16207',
  'cba': '#0284C7',
  'cagua': '#0891B2',
  'cmin': '#78716C',
  'ctel': '#7C3AED',
  'eca': '#4F46E5',
  'ei': '#8B5CF6',
  'epd': '#06B6D4',
  'eir': '#F59E0B',
  'ec': '#10B981',
  'ed': '#EF4444',
  'eoab': '#1D4ED8',
  'et': '#16A34A',
  'ej': '#D946EF',
  'em': '#475569',
  'eind': '#B45309',
  'eterra': '#65A30D',
  'emig': '#0891B2',
  'eref': '#7C3AED',
  'emet': '#64748B',
  'emus': '#A855F7',
  'eme': '#EA580C',
  'epc': '#E11D48',
  'lep': '#DC2626',
  'lmp': '#E11D48',
  'ld': '#B91C1C',
  'loc': '#991B1B',
  'laa': '#9F1239',
  'lit': '#7C3AED',
  'l8112': '#2563EB',
  'lia': '#1D4ED8',
  'nll': '#0369A1',
  'lms': '#4338CA',
  'lacp': '#6D28D9',
  'lje': '#059669',
  'lgpd': '#0891B2',
  'mci': '#0E7490',
  'lf': '#A16207',
  'la': '#CA8A04',
  'li': '#EA580C',
  'lrp': '#78716C',
  'loman': '#475569',
  'lat': '#BE123C',
  'lindb': '#6366F1',
  'lch': '#991B1B',
  'ltort': '#7F1D1D',
  'lca': '#166534',
  'lrac': '#92400E',
  'llav': '#4C1D95',
  'lpaf': '#1E40AF',
  'lrf': '#065F46',
  'lai': '#0E7490',
  'lap': '#7C3AED',
  'lcp': '#B91C1C',
  'ldb': '#0369A1',
  'lomp': '#4338CA',
  'lsa': '#A16207',
  'lpi': '#CA8A04',
  'lda': '#D97706',
  'lace': '#DC2626',
  'lcon': '#0284C7',
  'lppp': '#0369A1',
  'lhd': '#6D28D9',
  'lmi': '#7C3AED',
  'lpp': '#6366F1',
  'lele': '#4F46E5',
  'lfl': '#059669',
  'lcsf': '#B45309',
  'lpt': '#475569',
  'lpsu': '#65A30D',
  'lalp': '#E11D48',
  'lalim': '#F43F5E',
  'lcade': '#1D4ED8',
  'lsus': '#0D9488',
  'lbio': '#15803D',
  'lci': '#0E7490',
  'line': '#7C3AED',
  'lotcu': '#1E3A8A',
  'lle': '#CA8A04',
  'ces': '#475569',
  'lmls': '#EA580C',
  'lrt': '#065F46',
  'lei-desapropriacao': '#D97706',
  'lei-identificacao-criminal': '#4F46E5',
  'lei-adpf': '#2563EB',
  'lei-adi-adc': '#1D4ED8',
  'lei-juizados-fazenda': '#059669',
  'lei-juizados-federais': '#0D9488',
  'lei-crimes-responsabilidade': '#B91C1C',
  'lei-crimes-tributario': '#B45309',
  'lei-defensoria': '#0369A1',
  'lei-governo-digital': '#0891B2',
  'lei-residuos-solidos': '#16A34A',
  'lei-superendividamento': '#F97316',
  'lei-greve': '#DC2626',
  'lei-prisao-temporaria': '#991B1B',
  'lei-pacote-anticrime': '#7F1D1D',
  'lei-meio-ambiente': '#15803D',
  'lei-recursos-hidricos': '#0284C7',
  'lei-mediacao': '#4338CA',
  'lei-execucao-fiscal': '#047857',
  'lei-henry-borel': '#E11D48',
  'lei-escuta-protegida': '#BE123C',
  'lei-sinase': '#8B5CF6',
  'lei-oscip': '#6366F1',
  'lbps': '#0D9488',
  'lcss': '#14B8A6',
  'lpc': '#2DD4BF',
  'loas': '#0D9488',
  'ced2015': '#EF4444',
  'ced1995': '#EF4444',
  'reg_oab': '#10B981',
  'prov205': '#F59E0B',
  'prov188': '#F59E0B',
  'prov112': '#F59E0B',
  'prov144': '#F59E0B',
  'res02': '#8B5CF6',
  'res01': '#8B5CF6',
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
  cf:   COVERS.cf88,
  cp:   COVERS.cp,
  cpm:  COVERS.cp,
  cc:   COVERS.cc,
  cpc:  COVERS.cpc,
  cpp:  COVERS.cpp,
  cppm: COVERS.cpp,
  clt:  COVERS.clt,
  cdc:  COVERS.cdc,
  ctn:  COVERS.ctn,
  ctb:  COVERS.default,
  ce:   COVERS.ce,
  // Estatutos temáticos (slugs oficiais e aliases)
  eca:                           COVERS.eca,
  'estatuto-eca':                COVERS.eca,
  ei:                            COVERS.ei,
  'estatuto-idoso':              COVERS.ei,
  epd:                           COVERS.epd,
  'estatuto-pessoa-deficiencia': COVERS.epd,
  eir:                           COVERS.eir,
  'estatuto-igualdade-racial':   COVERS.eir,
  ec:                            COVERS.ec,
  'estatuto-cidade':             COVERS.ec,
  ed:                            COVERS.ed,
  'estatuto-desarmamento':       COVERS.ed,
  eoab:                          COVERS.eoab,
  'estatuto-oab':                COVERS.eoab,
  'estatuto-militares':          COVERS.cp,
  'estatuto-indio':              COVERS.eir,
  'estatuto-juventude':          COVERS.eca,
  'estatuto-metropole':          COVERS.ec,
  'estatuto-cancer':             COVERS.epd,
  'estatuto-refugiado':          COVERS.eir,
  'estatuto-seguranca-privada':  COVERS.ed,
  'lei-servidor':                COVERS.eoab,
  'estatuto-torcedor':           COVERS.ce,
  'estatuto-terra':              COVERS.ec,
  'estatuto-mpe':                COVERS.cdc,
  eggm:                          COVERS.ed,
  emot:                          COVERS.default,
};


export function getLeiCover(id?: string | null, _tipo?: string | null): string {
  if (!id) return COVERS.default;
  const key = id.toLowerCase().trim();
  if (COVER_MAP[key]) return COVER_MAP[key];
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
