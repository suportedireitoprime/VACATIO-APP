// Persistência unificada de "artigos favoritos" — Supabase (quando logado) + espelho localStorage.
// Fonte única de verdade para o coração do bottom sheet do artigo e para as
// listagens em Meu Espaço → Meus Artigos e Meu Espaço → Minhas Leis (bottom sheet por lei).

import { supabase } from '@/integrations/supabase/client';

export type ArtigoFav = {
  tabela_codigo: string;
  numero_artigo: string;
  conteudo_preview?: string | null;
};

const LS_KEY = 'artigos_favoritos_v1';
export const ARTIGOS_FAV_EVENT = 'artigos:favoritos:changed';

function readLocal(): ArtigoFav[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeLocal(list: ArtigoFav[]) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {}
}

function emit() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ARTIGOS_FAV_EVENT));
  }
}

function makeArtigoId(tabela: string, numero: string) {
  return `${tabela}::${numero}`;
}

/** Retorna todos os favoritos do usuário (DB se logado, senão localStorage). */
export async function listArtigosFavoritos(): Promise<ArtigoFav[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return readLocal();
  const { data } = await supabase
    .from('artigos_favoritos')
    .select('tabela_codigo, numero_artigo, conteudo_preview')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  return (data ?? []) as ArtigoFav[];
}

/** Lista favoritos de uma lei específica (usado pelo bottom sheet de Minhas Leis). */
export async function listArtigosFavoritosByTabela(tabela: string): Promise<Array<ArtigoFav & { created_at?: string }>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return readLocal().filter((f) => f.tabela_codigo === tabela);
  const { data } = await supabase
    .from('artigos_favoritos')
    .select('tabela_codigo, numero_artigo, conteudo_preview, created_at')
    .eq('user_id', user.id)
    .eq('tabela_codigo', tabela)
    .order('created_at', { ascending: false });
  return (data ?? []) as any;
}

/** Lista somente os números favoritados numa lei (hidratação rápida de UI). */
export async function listNumerosFavoritosByTabela(tabela: string): Promise<string[]> {
  const rows = await listArtigosFavoritosByTabela(tabela);
  return rows.map((r) => r.numero_artigo);
}

/**
 * Alterna o estado de favorito. Persiste em Supabase quando logado e sempre
 * espelha em localStorage para funcionar offline / fallback.
 * Retorna `true` se ficou favoritado, `false` se foi removido.
 */
export class FavoritoLimitError extends Error {
  limite: number;
  constructor(limite: number) {
    super(`Limite de ${limite} artigos favoritos atingido`);
    this.name = 'FavoritoLimitError';
    this.limite = limite;
  }
}

/** Premium a partir do snapshot local do useSubscription (evita dependência de hook aqui). */
function isPremiumSnapshot(userId: string, email?: string | null): boolean {
  const adminEmails = ['wn7corporation@gmail.com', 'suporte.vacatio@gmail.com', 'wn7juridico@gmail.com'];
  if (email && adminEmails.includes(email.toLowerCase())) return true;
  try {
    const raw = localStorage.getItem(`vacatio:sub:${userId}`);
    if (!raw) return false;
    return !!JSON.parse(raw)?.isPremium;
  } catch { return false; }
}

/** Limite de favoritos ativos para contas gratuitas (0 = sem limite / desativado). */
async function favoritoLimit(): Promise<number> {
  const { data } = await supabase
    .from('feature_limits' as any)
    .select('limit_value, enabled')
    .eq('feature_key', 'lei_favorito')
    .maybeSingle();
  const row = data as any;
  if (!row || !row.enabled) return 0;
  return Number(row.limit_value) || 0;
}

export async function toggleArtigoFavorito(fav: ArtigoFav): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  const tabela = fav.tabela_codigo;
  const numero = fav.numero_artigo;

  // Sempre atualiza espelho local (instantâneo e offline-safe)
  const local = readLocal();
  const existsLocal = local.some((l) => l.tabela_codigo === tabela && l.numero_artigo === numero);
  let nowOn: boolean;

  if (user) {
    // Estado atual no DB
    const { data: existing } = await supabase
      .from('artigos_favoritos')
      .select('id')
      .eq('user_id', user.id)
      .eq('tabela_codigo', tabela)
      .eq('numero_artigo', numero)
      .maybeSingle();

    if (existing?.id) {
      await supabase.from('artigos_favoritos').delete().eq('id', existing.id);
      nowOn = false;
    } else {
      // Teto de favoritos ativos para contas gratuitas
      if (!isPremiumSnapshot(user.id, user.email)) {
        const limite = await favoritoLimit();
        if (limite > 0) {
          const { count } = await supabase
            .from('artigos_favoritos')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id);
          if ((count || 0) >= limite) throw new FavoritoLimitError(limite);
        }
      }
      await supabase.from('artigos_favoritos').insert({
        user_id: user.id,
        tabela_codigo: tabela,
        numero_artigo: numero,
        conteudo_preview: fav.conteudo_preview ?? null,
        artigo_id: makeArtigoId(tabela, numero),
      });
      nowOn = true;
    }
  } else {
    nowOn = !existsLocal;
  }

  const nextLocal = nowOn
    ? [{ ...fav }, ...local.filter((l) => !(l.tabela_codigo === tabela && l.numero_artigo === numero))]
    : local.filter((l) => !(l.tabela_codigo === tabela && l.numero_artigo === numero));
  writeLocal(nextLocal);
  emit();
  return nowOn;
}

/** Backfill: se houver dados no localStorage e o usuário estiver logado, envia para o DB. */
export async function syncLocalToRemote() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const local = readLocal();
    if (local.length === 0) return;
    for (const f of local) {
      await supabase.from('artigos_favoritos').upsert(
        {
          user_id: user.id,
          tabela_codigo: f.tabela_codigo,
          numero_artigo: f.numero_artigo,
          conteudo_preview: f.conteudo_preview ?? null,
          artigo_id: makeArtigoId(f.tabela_codigo, f.numero_artigo),
        },
        { onConflict: 'user_id,tabela_codigo,numero_artigo', ignoreDuplicates: true },
      );
    }
  } catch { /* silent */ }
}
