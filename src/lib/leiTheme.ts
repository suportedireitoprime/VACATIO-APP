// Central theme (accent color + hero cover) per legislation.
// Reused by CategoriaLegislacao header and ArtigoCard badge.

import { COVERS, getR2CoverUrl } from './coverLoader';

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
  // Códigos Oficiais
  cp:                            COVERS.cp,
  'codigo-penal':                COVERS.cp,
  'codigo_penal':                COVERS.cp,
  CP_CODIGO_PENAL:               COVERS.cp,

  cpc:                           COVERS.cpc,
  'codigo-processo-civil':       COVERS.cpc,
  'codigo_processo_civil':       COVERS.cpc,
  CPC_CODIGO_PROCESSO_CIVIL:     COVERS.cpc,

  cc:                            COVERS.cc,
  'codigo-civil':                COVERS.cc,
  'codigo_civil':                COVERS.cc,
  CC_CODIGO_CIVIL:               COVERS.cc,

  clt:                           COVERS.clt,
  'consolidacao-leis-trabalho':  COVERS.clt,
  CLT_CONSOLIDACAO_LEIS_TRABALHO: COVERS.clt,

  cdc:                           COVERS.cdc,
  'codigo-defesa-consumidor':    COVERS.cdc,
  'codigo-consumidor':           COVERS.cdc,
  CDC_CODIGO_DEFESA_CONSUMIDOR:  COVERS.cdc,

  ctn:                           COVERS.ctn,
  'codigo-tributario-nacional':  COVERS.ctn,
  'codigo-tributario':           COVERS.ctn,
  CTN_CODIGO_TRIBUTARIO_NACIONAL: COVERS.ctn,

  ctb:                           COVERS.ctb,
  'codigo-transito-brasileiro':  COVERS.ctb,
  'codigo-transito':             COVERS.ctb,
  CTB_CODIGO_TRANSITO_BRASILEIRO: COVERS.ctb,

  ce:                            COVERS.ce,
  'codigo-eleitoral':            COVERS.ce,
  CE_CODIGO_ELEITORAL:           COVERS.ce,

  cpm:                           COVERS.cpm,
  'codigo-penal-militar':        COVERS.cpm,
  CPM_CODIGO_PENAL_MILITAR:      COVERS.cpm,

  cpp:                           COVERS.cpp,
  'codigo-processo-penal':       COVERS.cpp,
  CPP_CODIGO_PROCESSO_PENAL:     COVERS.cpp,

  cppm:                          COVERS.cppm,
  'codigo-processo-penal-militar': COVERS.cppm,
  CPPM_CODIGO_PROCESSO_PENAL_MILITAR: COVERS.cppm,

  cflor:                         COVERS.cflor,
  'codigo-florestal':            COVERS.cflor,
  CFLOR_CODIGO_FLORESTAL:        COVERS.cflor,

  ccom:                          COVERS.ccom,
  'codigo-comercial':            COVERS.ccom,
  CCOM_CODIGO_COMERCIAL:         COVERS.ccom,

  cba:                           COVERS.cba,
  'codigo-brasileiro-aeronautica': COVERS.cba,
  'codigo-aeronautica':          COVERS.cba,
  CBA_CODIGO_BRASILEIRO_AERONAUTICA: COVERS.cba,

  cagua:                         COVERS.cagua,
  'codigo-aguas':                COVERS.cagua,
  CAGUA_CODIGO_AGUAS:            COVERS.cagua,

  cmin:                          COVERS.cmin,
  'codigo-minas':                COVERS.cmin,
  'codigo-mineracao':            COVERS.cmin,
  CMIN_CODIGO_MINAS:             COVERS.cmin,

  ctel:                          COVERS.ctel,
  'codigo-telecomunicacoes':     COVERS.ctel,
  'codigo-brasileiro-telecomunicacoes': COVERS.ctel,
  CTEL_CODIGO_TELECOMUNICACOES:  COVERS.ctel,

  // Constituições do Brasil
  cf88:                          COVERS.cf88,
  cf:                            COVERS.cf88,
  constituicao:                  COVERS.cf88,
  'constituicao-federal':        COVERS.cf88,
  'constituicao-1988':           COVERS.cf88,
  CF_CONSTITUICAO_FEDERAL:       COVERS.cf88,

  cf1824:                        COVERS.cf1824,
  'constituicao-1824':           COVERS.cf1824,
  cf1891:                        COVERS.cf1891,
  'constituicao-1891':           COVERS.cf1891,
  cf1934:                        COVERS.cf1934,
  'constituicao-1934':           COVERS.cf1934,
  cf1937:                        COVERS.cf1937,
  'constituicao-1937':           COVERS.cf1937,
  cf1946:                        COVERS.cf1946,
  'constituicao-1946':           COVERS.cf1946,
  cf1967:                        COVERS.cf1967,
  'constituicao-1967':           COVERS.cf1967,
  cf1969:                        COVERS.cf1969,
  'constituicao-1969':           COVERS.cf1969,
  'ec-01-69':                    COVERS.cf1969,

  // Estatutos Temáticos
  eca:                           COVERS.eca,
  'estatuto-eca':                COVERS.eca,
  'estatuto-crianca-adolescente': COVERS.eca,
  ECA_ESTATUTO_CRIANCA_ADOLESCENTE: COVERS.eca,

  ei:                            COVERS.ei,
  'estatuto-idoso':              COVERS.ei,
  'estatuto-pessoa-idosa':       COVERS.ei,
  EI_ESTATUTO_IDOSO:             COVERS.ei,

  epd:                           COVERS.epd,
  'estatuto-pessoa-deficiencia': COVERS.epd,
  'estatuto-pcd':                COVERS.epd,
  EPD_ESTATUTO_PESSOA_DEFICIENCIA: COVERS.epd,

  eir:                           COVERS.eir,
  'estatuto-igualdade-racial':   COVERS.eir,
  EIR_ESTATUTO_IGUALDADE_RACIAL: COVERS.eir,

  ec:                            COVERS.ec,
  'estatuto-cidade':             COVERS.ec,
  EC_ESTATUTO_CIDADE:            COVERS.ec,

  ed:                            COVERS.ed,
  'estatuto-desarmamento':       COVERS.ed,
  ED_ESTATUTO_DESARMAMENTO:      COVERS.ed,

  eoab:                          COVERS.eoab,
  'estatuto-oab':                COVERS.eoab,
  EOAB_ESTATUTO_OAB:             COVERS.eoab,

  ej:                            COVERS.ej,
  'estatuto-juventude':          COVERS.ej,
  EJ_ESTATUTO_JUVENTUDE:         COVERS.ej,

  em:                            COVERS.em,
  'estatuto-militares':          COVERS.em,
  EM_ESTATUTO_MILITARES:         COVERS.em,

  eme:                           COVERS.eme,
  'estatuto-mpe':                COVERS.eme,
  'estatuto-microempresa':       COVERS.eme,
  'estatuto-micro-empresa':      COVERS.eme,

  emet:                          COVERS.emet,
  'estatuto-metropole':          COVERS.emet,
  EMET_ESTATUTO_METROPOLE:       COVERS.emet,

  emig:                          COVERS.emig,
  'estatuto-migrante':           COVERS.emig,
  'lei-migracao':                COVERS.emig,
  EMIG_ESTATUTO_MIGRANTE:        COVERS.emig,

  emus:                          COVERS.emus,
  'estatuto-museus':             COVERS.emus,
  EMUS_ESTATUTO_MUSEUS:          COVERS.emus,

  epc:                           COVERS.epc,
  'estatuto-cancer':             COVERS.epc,
  'estatuto-pessoa-cancer':      COVERS.epc,
  EPC_ESTATUTO_CANCER:           COVERS.epc,

  eref:                          COVERS.eref,
  'estatuto-refugiado':          COVERS.eref,
  'estatuto-refugiados':         COVERS.eref,
  EREF_ESTATUTO_REFUGIADO:       COVERS.eref,

  et:                            COVERS.et,
  'estatuto-torcedor':           COVERS.et,
  ET_ESTATUTO_TORCEDOR:          COVERS.et,

  eterra:                        COVERS.eterra,
  'estatuto-terra':              COVERS.eterra,
  ETERRA_ESTATUTO_TERRA:         COVERS.eterra,

  eind:                          COVERS.eind,
  'estatuto-indio':              COVERS.eind,
  'estatuto-indigena':           COVERS.eind,
  EIND_ESTATUTO_INDIO:           COVERS.eind,

  // Legislação Específica e Ética
  ced1995:                       COVERS.ced1995,
  'codigo-etica-oab-1995':       COVERS.ced1995,
  'codigo-etica-1995':           COVERS.ced1995,

  ced2015:                       COVERS.ced2015,
  ced:                           COVERS.ced2015,
  'codigo-etica-oab-2015':       COVERS.ced2015,
  'codigo-etica-oab':            COVERS.ced2015,
  'codigo-etica':                COVERS.ced2015,

  ces:                           COVERS.ces,
  'codigo-etica-servidor':       COVERS.ces,
  CES_CODIGO_ETICA_SERVIDOR:     COVERS.ces,

  l8112:                         COVERS.l8112,
  'lei-8112':                    COVERS.l8112,
  'lei-servidor':                COVERS.l8112,
  'estatuto-servidor-uniao':     COVERS.l8112,
  L8112_SERVIDOR_PUBLICO:        COVERS.l8112,

  la:                            COVERS.la,
  'lei-arbitragem':              COVERS.la,
  LA_ARBITRAGEM:                 COVERS.la,

  laa:                           COVERS.laa,
  'lei-abuso-autoridade':        COVERS.laa,
  LAA_ABUSO_AUTORIDADE:          COVERS.laa,

  lace:                          COVERS.lace,
  'lei-anticorrupcao':           COVERS.lace,
  'lei-anticorrupcao-empresarial': COVERS.lace,
  LACE_ANTICORRUPCAO:            COVERS.lace,

  // Fallbacks de estatutos com capa compartilhada aproximada
  'estatuto-seguranca-privada':  COVERS.ed,
  'estatuto-policial':           COVERS.cp,
  eggm:                          COVERS.ed,
  emot:                          COVERS.default,
};

export function getLeiCover(id?: string | null, tipo?: string | null): string {
  if (!id && !tipo) return COVERS.default;
  const key = (id || tipo || '').toLowerCase().trim();
  if (COVER_MAP[key]) return COVER_MAP[key];

  // Tenta remover prefixos comuns como 'lei-', 'codigo-', 'estatuto-'
  const cleanKey = key.replace(/^(lei|codigo|estatuto)-/, '');
  if (COVER_MAP[cleanKey]) return COVER_MAP[cleanKey];

  return COVERS.default;
}

/**
 * Retorna diretamente a URL pública no Cloudflare R2 para qualquer lei
 */
export function getLeiCoverR2Url(id?: string | null, tipo?: string | null): string {
  if (!id && !tipo) return getR2CoverUrl('default');
  const key = (id || tipo || '').toLowerCase().trim();
  const cleanKey = key.replace(/^(lei|codigo|estatuto)-/, '');
  return getR2CoverUrl(cleanKey);
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
