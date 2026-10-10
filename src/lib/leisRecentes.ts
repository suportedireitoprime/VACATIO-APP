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

// Lê o cache local síncrono
export function getRecentes(): LeiRecente[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
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
    local.forEach(l => map.set(`${l.leiId}-${l.artigoNumero || 'CAPA'}`, l));
    
    // Atualiza/Adiciona baseados no Supabase
    data.forEach(row => {
      const key = `${row.tabela_codigo}-${row.numero_artigo || 'CAPA'}`;
      const existing = map.get(key);
      const sbTime = new Date(row.visualizado_em).getTime();
      
      if (!existing || existing.openedAt < sbTime) {
        map.set(key, {
          tipo: existing?.tipo || 'lei',
          leiId: row.tabela_codigo,
          nome: existing?.nome || row.tabela_codigo.toUpperCase(),
          descricao: existing?.descricao || '',
          tabela_nome: existing?.tabela_nome || row.tabela_codigo,
          artigoNumero: row.numero_artigo === 'CAPA' ? undefined : row.numero_artigo,
          openedAt: sbTime
        });
      }
    });

    const merged = Array.from(map.values())
      .sort((a, b) => b.openedAt - a.openedAt)
      .slice(0, MAX);
      
    localStorage.setItem(KEY, JSON.stringify(merged));
  }
}

// Adiciona no cache local e envia para o Supabase assincronamente
export function pushRecente(lei: Omit<LeiRecente, 'openedAt'>) {
  if (typeof window === 'undefined') return;
  try {
    const list = getRecentes().filter((l) => l.leiId !== lei.leiId || l.artigoNumero !== lei.artigoNumero);
    list.unshift({ ...lei, openedAt: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
    
    // Sincroniza em background
    void (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user) {
        await supabase.from('artigos_visualizacoes').insert({
          user_id: session.session.user.id,
          tabela_codigo: lei.leiId,
          numero_artigo: lei.artigoNumero || 'CAPA', // Flag especial ou o artigo em si
          origem: 'leis_recentes',
          visualizado_em: new Date().toISOString()
        });
      }
    })();
  } catch {}
}

export function clearRecentes() {
  try { localStorage.removeItem(KEY); } catch {}
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

