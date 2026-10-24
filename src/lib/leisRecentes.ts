import { supabase } from '@/integrations/supabase/client';

export type LeiRecente = {
  tipo: string;
  leiId: string;
  nome: string;
  descricao: string;
  tabela_nome: string;
  artigoNumero?: string;
  openedAt: number;
};

const KEY = 'leis_recentes_v1';
const MAX = 20;

// Detecta se a string parece um UUID (ex: '17e8abb2-80c3-4317-96b8-d62192e37545')
// Artigos de lei NUNCA são UUIDs.
export function isUuidLike(val?: string | null): boolean {
  if (!val) return false;
  const s = String(val).trim();
  if (!s) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return true;
  if (s.length >= 20 && /^[0-9a-f-]+$/i.test(s)) return true;
  return false;
}

export function cleanArtigoNumero(val?: string | null): string | undefined {
  if (!val) return undefined;
  const s = String(val).trim();
  if (!s || s === 'CAPA' || s === 'BUSCA' || isUuidLike(s)) return undefined;
  return s;
}

// Lê o cache local síncrono e sanitiza contra UUIDs residuais
export function getRecentes(): LeiRecente[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    let needsRewrite = false;
    const sanitized: LeiRecente[] = parsed.map((item: any) => {
      const cleaned = cleanArtigoNumero(item.artigoNumero);
      if (item.artigoNumero && item.artigoNumero !== cleaned) {
        needsRewrite = true;
      }
      return {
        ...item,
        artigoNumero: cleaned,
      };
    });
    if (needsRewrite) {
      try { localStorage.setItem(KEY, JSON.stringify(sanitized)); } catch {}
    }
    return sanitized;
  } catch {
    return [];
  }
}

// Sincroniza do Supabase para o cache local (chame no login ou app load)
export async function syncRecentesFromSupabase() {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user) return;
  
  // Busca visualizações de leis e artigos
  const { data } = await supabase
    .from('artigos_visualizacoes')
    .select('tabela_codigo, numero_artigo, visualizado_em')
    .eq('user_id', session.session.user.id)
    .order('visualizado_em', { ascending: false })
    .limit(50);
    
  if (data && data.length > 0) {
    // Mescla com o local priorizando as datas mais recentes
    const local = getRecentes();
    const map = new Map<string, LeiRecente>();
    
    // Adiciona locais no map (preserva metadados)
    // Chave única composta por lei + artigo
    local.forEach(l => map.set(`${l.leiId}-${cleanArtigoNumero(l.artigoNumero) || 'CAPA'}`, l));
    
    // Atualiza/Adiciona baseados no Supabase
    data.forEach(row => {
      const artClean = cleanArtigoNumero(row.numero_artigo);
      const key = `${row.tabela_codigo}-${artClean || 'CAPA'}`;
      const existing = map.get(key);
      const sbTime = new Date(row.visualizado_em).getTime();
      
      if (!existing || existing.openedAt < sbTime) {
        map.set(key, {
          tipo: existing?.tipo || 'lei',
          leiId: row.tabela_codigo,
          nome: existing?.nome || row.tabela_codigo.toUpperCase(),
          descricao: existing?.descricao || '',
          tabela_nome: existing?.tabela_nome || row.tabela_codigo,
          artigoNumero: artClean,
          openedAt: sbTime
        });
      }
    });

    const merged = Array.from(map.values())
      .sort((a, b) => b.openedAt - a.openedAt)
      .slice(0, MAX);
      
    localStorage.setItem(KEY, JSON.stringify(merged));
    notifyRecentesUpdated();
  }
}

export const LEIS_RECENTES_EVENT = 'LEIS_RECENTES_UPDATED';

export function notifyRecentesUpdated() {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(LEIS_RECENTES_EVENT));
    window.dispatchEvent(new Event('storage'));
  } catch {}
}

// Adiciona no cache local e envia para o Supabase assincronamente
export function pushRecente(lei: Omit<LeiRecente, 'openedAt'>) {
  if (typeof window === 'undefined') return;
  try {
    const list = getRecentes();
    const cleanNovo = cleanArtigoNumero(lei.artigoNumero);
    // Preserva o artigo existente se a chamada atual não forneceu um novo válido
    const existing = list.find((l) => l.leiId === lei.leiId && cleanArtigoNumero(l.artigoNumero));
    const existingClean = cleanArtigoNumero(existing?.artigoNumero);
    const artigoNumeroResolvido = cleanNovo || existingClean;

    const filtered = list.filter((l) => l.leiId !== lei.leiId);
    filtered.unshift({ ...lei, artigoNumero: artigoNumeroResolvido, openedAt: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(filtered.slice(0, MAX)));
    notifyRecentesUpdated();
    
    // Sincroniza em background
    void (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user) {
        await supabase.from('artigos_visualizacoes').insert({
          user_id: session.session.user.id,
          tabela_codigo: lei.leiId,
          numero_artigo: artigoNumeroResolvido || 'CAPA', // Flag especial ou o artigo em si
          origem: 'leis_recentes',
          visualizado_em: new Date().toISOString()
        });
      }
    })();
  } catch {}
}

export function clearRecentes() {
  try {
    localStorage.removeItem(KEY);
    notifyRecentesUpdated();
  } catch {}
}

// ---- Popularidade de busca (leis mais procuradas) ----
const POP_KEY = 'leis_populares_v1';

type PopMap = Record<string, number>;

function readPop(): PopMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(POP_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}

export function bumpLeiSearch(leiId: string) {
  if (typeof window === 'undefined' || !leiId) return;
  try {
    const map = readPop();
    map[leiId] = (map[leiId] || 0) + 1;
    localStorage.setItem(POP_KEY, JSON.stringify(map));
    
    // Também podemos registrar a busca como uma visualização especial se desejado
    void (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user) {
        await supabase.from('artigos_visualizacoes').insert({
          user_id: session.session.user.id,
          tabela_codigo: leiId,
          numero_artigo: 'BUSCA',
          origem: 'pesquisa',
          visualizado_em: new Date().toISOString()
        });
      }
    })();
  } catch {}
}

/** Retorna leiIds ordenados por popularidade (desc). */
export function getPopularLeiIds(): string[] {
  const map = readPop();
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}

