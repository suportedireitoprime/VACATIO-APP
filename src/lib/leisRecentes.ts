import { supabase } from '@/integrations/supabase/client';
import { LEIS_CATALOG } from '@/data/leisCatalog';

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

/** Normaliza códigos técnicos e nomes com underscores como 'EOAB_ESTATUTO_OAB' para nomes amigáveis */
export function formatFriendlyLeiName(raw?: string | null): string {
  if (!raw) return 'Legislação';
  const trimmed = raw.trim();
  const match = LEIS_CATALOG.find(
    (l) =>
      l.id.toLowerCase() === trimmed.toLowerCase() ||
      l.tabela_nome?.toLowerCase() === trimmed.toLowerCase()
  );
  if (match?.nome) return match.nome;

  if (trimmed.includes('_')) {
    const cleaned = trimmed
      .replace(/^[A-Z0-9]+_/, '')
      .replace(/_/g, ' ')
      .trim();
    return cleaned
      .split(' ')
      .map((w, idx) => {
        const lower = w.toLowerCase();
        if (idx > 0 && ['de', 'da', 'do', 'das', 'dos', 'e', 'em'].includes(lower)) return lower;
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join(' ');
  }
  return trimmed;
}

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

// Lê o cache local síncrono e sanitiza contra UUIDs residuais e códigos crus como EOAB_ESTATUTO_OAB
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
      const match = LEIS_CATALOG.find(
        (l) =>
          l.id.toLowerCase() === item.leiId?.toLowerCase() ||
          l.tabela_nome?.toLowerCase() === item.leiId?.toLowerCase() ||
          l.tabela_nome?.toLowerCase() === item.tabela_nome?.toLowerCase() ||
          l.id.toLowerCase() === item.tabela_nome?.toLowerCase()
      );
      let nome = item.nome;
      let leiId = item.leiId;
      let tipo = item.tipo;
      const tabelaNome = item.tabela_nome || (match?.tabela_nome ?? leiId);

      if (match) {
        if (nome !== match.nome) { nome = match.nome; needsRewrite = true; }
        if (leiId !== match.id) { leiId = match.id; needsRewrite = true; }
        if (tipo !== match.tipo) { tipo = match.tipo; needsRewrite = true; }
      } else if (nome && nome.includes('_')) {
        const friendly = formatFriendlyLeiName(nome);
        if (friendly !== nome) { nome = friendly; needsRewrite = true; }
      }

      return {
        ...item,
        tipo: tipo || 'lei',
        leiId: leiId || item.leiId,
        nome: nome || item.nome,
        tabela_nome: tabelaNome,
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
    .limit(150);
    
  if (data && data.length > 0) {
    // 1) Mescla com o local priorizando as datas mais recentes para as Leis na Home ("Continuar Leitura")
    const local = getRecentes();
    const map = new Map<string, LeiRecente>();
    
    // Adiciona locais no map (preserva metadados)
    // Chave única composta por lei + artigo
    local.forEach(l => map.set(`${l.leiId}-${cleanArtigoNumero(l.artigoNumero) || 'CAPA'}`, l));
    
    // Atualiza/Adiciona baseados no Supabase
    data.forEach(row => {
      const artClean = cleanArtigoNumero(row.numero_artigo);
      const match = LEIS_CATALOG.find(
        l => l.tabela_nome?.toLowerCase() === row.tabela_codigo?.toLowerCase() ||
             l.id.toLowerCase() === row.tabela_codigo?.toLowerCase()
      );
      const resolvedLeiId = match?.id || row.tabela_codigo;
      const resolvedNome = match?.nome || formatFriendlyLeiName(row.tabela_codigo);
      const resolvedTipo = match?.tipo || 'lei';
      const key = `${resolvedLeiId}-${artClean || 'CAPA'}`;
      const existing = map.get(key);
      const sbTime = new Date(row.visualizado_em).getTime();
      
      if (!existing || existing.openedAt < sbTime) {
        map.set(key, {
          tipo: existing?.tipo || resolvedTipo,
          leiId: resolvedLeiId,
          nome: match?.nome || existing?.nome || resolvedNome,
          descricao: existing?.descricao || match?.descricao || '',
          tabela_nome: match?.tabela_nome || existing?.tabela_nome || row.tabela_codigo,
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

    // 2) Sincroniza os artigos recentes específicos de cada legislação (alimenta o carrossel RECENTES dentro da lei)
    try {
      const { LEIS_CATALOG } = await import('@/data/leisCatalog');
      const tabelaMap = new Map<string, string[]>();

      data.forEach(row => {
        const artClean = cleanArtigoNumero(row.numero_artigo);
        if (artClean && row.tabela_codigo) {
          const list = tabelaMap.get(row.tabela_codigo) || [];
          if (!list.includes(artClean)) {
            list.push(artClean);
            tabelaMap.set(row.tabela_codigo, list);
          }
        }
      });

      tabelaMap.forEach((numeros, tabela) => {
        try {
          const localRaw = localStorage.getItem(`recentes_artigos_${tabela}`);
          const localList = localRaw ? (JSON.parse(localRaw) as string[]) : [];
          const mergedList = [...numeros, ...localList.filter(l => !numeros.includes(l))].slice(0, 30);
          localStorage.setItem(`recentes_artigos_${tabela}`, JSON.stringify(mergedList));

          const cat = LEIS_CATALOG.find(l => l.tabela_nome === tabela || l.id === tabela);
          if (cat) {
            if (cat.id && cat.id !== tabela) {
              localStorage.setItem(`recentes_artigos_${cat.id}`, JSON.stringify(mergedList));
            }
            if (cat.tabela_nome && cat.tabela_nome !== tabela) {
              localStorage.setItem(`recentes_artigos_${cat.tabela_nome}`, JSON.stringify(mergedList));
            }
          }
        } catch {}
      });
    } catch {}
  }
}

/**
 * Salva a visualização de um artigo de lei no Supabase e no cache local
 */
export async function registrarArtigoRecente(params: {
  tabelaCodigo: string;
  leiId?: string;
  numeroArtigo: string;
}) {
  const { tabelaCodigo, leiId, numeroArtigo } = params;
  if (!numeroArtigo) return;

  const cleanNum = cleanArtigoNumero(numeroArtigo) || numeroArtigo;

  // 1. Salva localmente para resposta imediata
  try {
    const keys = Array.from(new Set([tabelaCodigo, leiId].filter(Boolean) as string[]));
    for (const key of keys) {
      const raw = localStorage.getItem(`recentes_artigos_${key}`);
      const list = raw ? (JSON.parse(raw) as string[]) : [];
      const updated = [cleanNum, ...list.filter(x => x !== cleanNum)].slice(0, 30);
      localStorage.setItem(`recentes_artigos_${key}`, JSON.stringify(updated));
    }
  } catch {}

  // 2. Persiste no Supabase para sincronização na conta do usuário
  try {
    const { data: session } = await supabase.auth.getSession();
    const user = session?.session?.user;
    if (user) {
      await supabase.from('artigos_visualizacoes').insert({
        user_id: user.id,
        tabela_codigo: tabelaCodigo || leiId || '',
        numero_artigo: cleanNum,
        origem: 'artigo_recente',
        visualizado_em: new Date().toISOString()
      });
    }
  } catch {}
}

/**
 * Busca artigos recentes de uma legislação no Supabase (com cache local)
 */
export async function getArtigosRecentesDaLei(
  tabelaCodigo?: string | null,
  leiId?: string | null
): Promise<string[]> {
  const codigos = Array.from(new Set([tabelaCodigo, leiId].filter(Boolean) as string[]));
  if (codigos.length === 0) return [];

  // Primeiro lê do cache local síncrono
  let localResult: string[] = [];
  try {
    for (const key of codigos) {
      const raw = localStorage.getItem(`recentes_artigos_${key}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localResult = parsed;
          break;
        }
      }
    }
  } catch {}

  // Busca no Supabase
  try {
    const { data: session } = await supabase.auth.getSession();
    const user = session?.session?.user;
    if (!user) return localResult;

    const { data, error } = await supabase
      .from('artigos_visualizacoes')
      .select('numero_artigo, visualizado_em')
      .eq('user_id', user.id)
      .in('tabela_codigo', codigos)
      .neq('numero_artigo', 'CAPA')
      .neq('numero_artigo', 'BUSCA')
      .order('visualizado_em', { ascending: false })
      .limit(40);

    if (error || !data) return localResult;

    const remoteNumeros: string[] = [];
    for (const row of data) {
      const num = cleanArtigoNumero(row.numero_artigo) || row.numero_artigo?.trim();
      if (num && !remoteNumeros.includes(num)) {
        remoteNumeros.push(num);
      }
    }

    if (remoteNumeros.length > 0) {
      const merged = [...remoteNumeros, ...localResult.filter(l => !remoteNumeros.includes(l))].slice(0, 30);
      try {
        for (const key of codigos) {
          localStorage.setItem(`recentes_artigos_${key}`, JSON.stringify(merged));
        }
      } catch {}
      return merged;
    }
  } catch {}

  return localResult;
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

