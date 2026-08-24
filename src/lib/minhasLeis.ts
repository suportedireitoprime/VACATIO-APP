// Fonte única do conjunto "Minhas leis" — usada tanto no contador do Meu Espaço
// quanto na listagem /pessoal/leis, para que nunca divirjam.
import { LEIS_CATALOG } from '@/data/leisCatalog';
import { getFavoritos } from '@/lib/leisFavoritos';
import { getRecentes } from '@/lib/leisRecentes';

export type MinhaLeiFonte = 'favorito' | 'artigos' | 'recente';

export interface MinhaLei {
  leiId: string;
  nome: string;
  descricao: string;
  tabela_nome: string;
  tipo: string;
  sigla?: string;
  iconColor?: string;
  fonte: MinhaLeiFonte;
  artigosCount: number;
  ts: number;
}

function norm(v: unknown) {
  return String(v ?? '').trim().toUpperCase();
}

/**
 * Junta as leis favoritadas, as leis com artigos favoritados (vindas do banco)
 * e as leis abertas recentemente, deduplicando por lei.
 */
export function buildMinhasLeis(tabelasComArtigos: string[] = []): MinhaLei[] {
  const byKey = new Map<string, MinhaLei>();

  const push = (base: Partial<MinhaLei> & { tabela_nome?: string; leiId?: string }, fonte: MinhaLeiFonte, ts: number) => {
    const cat =
      LEIS_CATALOG.find((l) => l.id === base.leiId) ??
      LEIS_CATALOG.find((l) => norm(l.tabela_nome) === norm(base.tabela_nome));
    const key = cat?.id ?? base.leiId ?? norm(base.tabela_nome);
    if (!key) return;
    const prev = byKey.get(key);
    const item: MinhaLei = {
      leiId: key,
      nome: base.nome || cat?.nome || String(base.tabela_nome || key),
      descricao: base.descricao || cat?.descricao || '',
      tabela_nome: cat?.tabela_nome || String(base.tabela_nome || ''),
      tipo: cat?.tipo || base.tipo || 'lei',
      sigla: cat?.sigla,
      iconColor: cat?.iconColor,
      fonte: prev?.fonte === 'favorito' ? 'favorito' : fonte,
      artigosCount: (prev?.artigosCount ?? 0) + (base.artigosCount ?? 0),
      ts: Math.max(prev?.ts ?? 0, ts),
    };
    byKey.set(key, item);
  };

  // 1) Favoritadas explicitamente (coração na lei)
  getFavoritos().forEach((f) => push({ ...f }, 'favorito', f.favoritedAt || 0));

  // 2) Leis com artigos favoritados (banco)
  const contagem = new Map<string, number>();
  tabelasComArtigos.forEach((t) => {
    const k = norm(t);
    if (!k) return;
    contagem.set(k, (contagem.get(k) ?? 0) + 1);
  });
  contagem.forEach((qtd, tabela) => push({ tabela_nome: tabela, artigosCount: qtd }, 'artigos', 0));

  // 3) Leis abertas recentemente
  getRecentes().forEach((r) => push({ ...r }, 'recente', r.openedAt || 0));

  return Array.from(byKey.values()).sort((a, b) => {
    const rank = (x: MinhaLei) => (x.fonte === 'favorito' ? 0 : x.fonte === 'artigos' ? 1 : 2);
    return rank(a) - rank(b) || b.artigosCount - a.artigosCount || b.ts - a.ts;
  });
}