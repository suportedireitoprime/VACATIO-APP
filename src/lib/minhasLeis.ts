// Fonte única do conjunto "Minhas leis" — usada tanto no contador do Meu Espaço
// quanto na listagem /pessoal/leis, para que nunca divirjam.
import { LEIS_CATALOG } from '@/data/leisCatalog';
import { getFavoritos, addFavorito, removeFavorito, LEIS_FAVORITOS_EVENT } from '@/lib/leisFavoritos';
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

const ORDER_KEY = 'minhas_leis_custom_order_v1';
const EXCLUDED_KEY = 'minhas_leis_excluded_v1';

export function getMinhasLeisCustomOrder(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMinhasLeisCustomOrder(order: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ORDER_KEY, JSON.stringify(order));
    window.dispatchEvent(new CustomEvent(LEIS_FAVORITOS_EVENT));
  } catch {}
}

export function getMinhasLeisExcluded(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(EXCLUDED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addLeiToMinhasLeis(leiId: string): void {
  if (typeof window === 'undefined') return;
  try {
    // Remove de excluídos se estava excluída
    const excluded = getMinhasLeisExcluded().filter((id) => id !== leiId);
    localStorage.setItem(EXCLUDED_KEY, JSON.stringify(excluded));

    // Adiciona como favorita oficial
    const cat = LEIS_CATALOG.find((l) => l.id === leiId);
    if (cat) {
      addFavorito({
        leiId: cat.id,
        tipo: cat.tipo,
        nome: cat.nome,
        descricao: cat.descricao,
        tabela_nome: cat.tabela_nome,
      });
    }

    // Adiciona à lista de ordenação se ainda não estiver
    const order = getMinhasLeisCustomOrder();
    if (!order.includes(leiId)) {
      order.push(leiId);
      localStorage.setItem(ORDER_KEY, JSON.stringify(order));
    }

    window.dispatchEvent(new CustomEvent(LEIS_FAVORITOS_EVENT));
  } catch {}
}

export function removeLeiFromMinhasLeis(leiId: string): void {
  if (typeof window === 'undefined') return;
  try {
    // Remove dos favoritos
    removeFavorito(leiId);

    // Marca como excluída para ocultar de recentes/artigos
    const excluded = getMinhasLeisExcluded();
    if (!excluded.includes(leiId)) {
      excluded.push(leiId);
      localStorage.setItem(EXCLUDED_KEY, JSON.stringify(excluded));
    }

    // Remove da ordenação personalizada
    const order = getMinhasLeisCustomOrder().filter((id) => id !== leiId);
    localStorage.setItem(ORDER_KEY, JSON.stringify(order));

    window.dispatchEvent(new CustomEvent(LEIS_FAVORITOS_EVENT));
  } catch {}
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
  const excluded = new Set(getMinhasLeisExcluded());

  const push = (base: Partial<MinhaLei> & { tabela_nome?: string; leiId?: string }, fonte: MinhaLeiFonte, ts: number) => {
    const cat =
      LEIS_CATALOG.find((l) => l.id === base.leiId) ??
      LEIS_CATALOG.find((l) => norm(l.tabela_nome) === norm(base.tabela_nome));
    const key = cat?.id ?? base.leiId ?? norm(base.tabela_nome);
    if (!key || excluded.has(key)) return;
    const prev = byKey.get(key);
    const item: MinhaLei = {
      leiId: key,
      nome: cat?.nome || base.nome || String(base.tabela_nome || key),
      descricao: cat?.descricao || base.descricao || '',
      tabela_nome: cat?.tabela_nome || String(base.tabela_nome || ''),
      tipo: cat?.tipo || base.tipo || 'lei',
      sigla: cat?.sigla || base.sigla || (cat?.id?.toUpperCase() || key.toUpperCase()),
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

  const customOrder = getMinhasLeisCustomOrder();
  const orderMap = new Map(customOrder.map((id, index) => [id, index]));

  return Array.from(byKey.values()).sort((a, b) => {
    const hasA = orderMap.has(a.leiId);
    const hasB = orderMap.has(b.leiId);
    if (hasA && hasB) {
      return orderMap.get(a.leiId)! - orderMap.get(b.leiId)!;
    }
    if (hasA) return -1;
    if (hasB) return 1;

    const rank = (x: MinhaLei) => (x.fonte === 'favorito' ? 0 : x.fonte === 'artigos' ? 1 : 2);
    return rank(a) - rank(b) || b.artigosCount - a.artigosCount || b.ts - a.ts;
  });
}