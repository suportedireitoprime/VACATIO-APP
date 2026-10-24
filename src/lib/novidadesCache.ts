import type { ArtigoLei } from '@/data/mockData';

export type ModItem = { 
  artigo: ArtigoLei; 
  tipo: string; 
  referencia: string; 
  ano: number; 
  parteModificada: string; 
  leiNome: string; 
  linhasModificadas: number[]; 
  fromMonitor?: boolean;
};

// Cache em memória para acesso síncrono imediato (0ms)
const novidadesMemoryCache = new Map<string, ModItem[]>();

export function getCachedNovidades(key?: string): ModItem[] | null {
  if (!key) return null;
  const k = key.toLowerCase();
  if (novidadesMemoryCache.has(k)) {
    return novidadesMemoryCache.get(k)!;
  }
  try {
    const raw = sessionStorage.getItem(`novidades_cache_${k}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        novidadesMemoryCache.set(k, parsed);
        return parsed;
      }
    }
  } catch {}
  return null;
}

export function saveCachedNovidades(key: string, items: ModItem[]): void {
  if (!key || !items || items.length === 0) return;
  const k = key.toLowerCase();
  novidadesMemoryCache.set(k, items);
  try {
    sessionStorage.setItem(`novidades_cache_${k}`, JSON.stringify(items.slice(0, 35)));
  } catch {}
}

export function parseNovidadesFromArtigos(
  artigos: ArtigoLei[],
  dbAlteracoes: Record<string, unknown>[] = []
): ModItem[] {
  if (!artigos || artigos.length === 0) return [];
  const modRegex = /\((?:Redação\s+dada|Incluíd[oa]|Acrescid[oa]|Revogad[oa]|Alterad[oa]|Vetad[oa]|Regulamento|Vide|Promulgação|Renumerado|Transformado|Suprimido|Restabelecido|Ressalvado|Produção de efeito)[^)\n]*(?:\)|$)/gi;
  const yearRegex = /\b(1\d{3}|20\d{2})\b/;
  const typeRegex = /^\((Redação\s+dada|Incluíd[oa]|Acrescid[oa]|Revogad[oa]|Alterad[oa]|Vetad[oa]|Regulamento|Vide|Promulgação|Renumerado|Transformado|Suprimido|Restabelecido|Ressalvado|Produção de efeito)/i;

  const items: ModItem[] = [];

  for (const artigo of artigos) {
    const lines = artigo.caput.split('\n').filter(l => l.trim());
    const refGroups = new Map<string, { indices: number[]; tipo: string; ref: string; ano: number }>();
    for (let li = 0; li < lines.length; li++) {
      const lineMatches = lines[li].match(modRegex);
      if (!lineMatches) continue;
      const ref = lineMatches[lineMatches.length - 1];
      const refKey = ref.replace(/^\(/, '').replace(/\)$/, '');
      const tm = ref.match(typeRegex);
      const ym = ref.match(yearRegex);
      let tipo = tm ? tm[1].replace(/\s+dada/i, '') : 'Alteração';
      if (/^redaç/i.test(tipo)) tipo = 'Alterada';
      const ano = ym ? parseInt(ym[1]) : 0;
      if (!refGroups.has(refKey)) {
        refGroups.set(refKey, { indices: [], tipo, ref: refKey, ano });
      }
      refGroups.get(refKey)!.indices.push(li);
    }
    if (refGroups.size === 0) continue;
    for (const [refKey, group] of refGroups) {
      let parteModificada = 'Artigo inteiro';
      if (group.indices.length < lines.length) {
        const firstModLine = lines[group.indices[0]];
        if (/^§\s*\d+[º°]?/i.test(firstModLine)) {
          const pMatch = firstModLine.match(/^(§\s*\d+[º°]?)/i);
          parteModificada = pMatch ? pMatch[1].replace(/°/g, 'º') : '§';
        } else if (/^[IVXLC]+\s*[-–.]/i.test(firstModLine)) {
          const iMatch = firstModLine.match(/^([IVXLC]+)/i);
          parteModificada = iMatch ? `Inciso ${iMatch[1]}` : 'Inciso';
        } else if (/^[a-z]\)/i.test(firstModLine)) {
          const aMatch = firstModLine.match(/^([a-z]\))/i);
          parteModificada = aMatch ? `Alínea ${aMatch[1]}` : 'Alínea';
        } else if (/^Parágrafo\s+único/i.test(firstModLine)) {
          parteModificada = 'Parágrafo único';
        } else if (/caput/i.test(refKey)) {
          parteModificada = 'Caput';
        }
        if (group.indices.length > 1) {
          parteModificada += ` (+${group.indices.length - 1})`;
        }
      }
      const leiMatch = refKey.match(/(?:Lei(?:\s+Complementar)?|Decreto(?:-Lei)?|Emenda\s+Constitucional|Medida\s+Provisória)\s+n[º°]?\s*[\d.]+(?:,\s*de\s*\d{4})?/i);
      const leiNome = leiMatch ? leiMatch[0] : refKey;
      items.push({ artigo, tipo: group.tipo, referencia: refKey, ano: group.ano, parteModificada, leiNome, linhasModificadas: group.indices });
    }
  }
  items.sort((a, b) => b.ano - a.ano);

  // Merge DB alteracoes
  const parsedKeys = new Set(items.map(i => `${i.artigo.numero}::${i.ano}`));
  for (const dbItem of dbAlteracoes as Record<string, unknown>[]) {
    const detectadoEm = typeof dbItem.detectado_em === 'string' ? dbItem.detectado_em : null;
    const ano = detectadoEm ? new Date(detectadoEm).getFullYear() : 0;
    const artigoNumero = String(dbItem.artigo_numero || '');
    const key = `${artigoNumero}::${ano}`;
    if (parsedKeys.has(key)) continue;
    const matchingArtigo = artigos.find(a => a.numero === artigoNumero);
    const tipoAlteracao = String(dbItem.tipo_alteracao || '');
    const tipoLabel = tipoAlteracao === 'artigo_revogado' ? 'Revogado'
      : tipoAlteracao === 'artigo_novo' ? 'Incluído'
      : tipoAlteracao === 'texto_alterado' ? 'Alterada'
      : 'Alteração';
    const textoAtual = typeof dbItem.texto_atual === 'string' ? dbItem.texto_atual : null;
    const textoAnterior = typeof dbItem.texto_anterior === 'string' ? dbItem.texto_anterior : null;
    const fonteAlteracao = typeof dbItem.fonte_alteracao === 'string' ? dbItem.fonte_alteracao : null;
    items.push({
      artigo: matchingArtigo || { id: artigoNumero, numero: artigoNumero, caput: textoAtual || textoAnterior || '' } as ArtigoLei,
      tipo: tipoLabel,
      referencia: fonteAlteracao || 'Monitoramento',
      ano,
      parteModificada: 'Artigo atualizado',
      leiNome: fonteAlteracao || 'Atualização Legislativa',
      linhasModificadas: [],
      fromMonitor: true
    });
  }
  return items;
}

