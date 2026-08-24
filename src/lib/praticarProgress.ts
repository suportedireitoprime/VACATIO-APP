// Progresso do Praticar (por artigo). Persistência híbrida:
// - Cache local em localStorage para UI instantânea.
// - Sync com Supabase (`praticar_progresso_artigo`) quando o usuário está logado.

import { supabase } from '@/integrations/supabase/client';

const KEY = 'praticar_progress_v2';

export type ArtigoProgress = {
  acertos: number;
  tentativas: number;
  dominado: boolean;
  estrelas: number;      // 0..3 — melhor sessão
  melhor_pct: number;    // 0..100 — melhor sessão
  updated_at: string;
};

type Store = Record<string, ArtigoProgress>;

function read(): Store {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') as Store;
  } catch {
    return {};
  }
}

function write(s: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch { /* ignore */ }
}

export function getProgressoArtigos(ids: string[]): Record<string, ArtigoProgress> {
  const store = read();
  const out: Record<string, ArtigoProgress> = {};
  for (const id of ids) if (store[id]) out[id] = store[id];
  return out;
}

export type NivelDominio = 'dominante' | 'mediano' | 'aprendiz' | 'novo';

export function nivelDoArtigo(p?: ArtigoProgress): NivelDominio {
  if (!p || p.tentativas === 0) return 'novo';
  if (p.dominado || p.estrelas >= 3) return 'dominante';
  const acc = p.acertos / p.tentativas;
  if (acc >= 0.5 || p.estrelas >= 2) return 'mediano';
  return 'aprendiz';
}

export function nivelGeral(pct: number, tentativasTotais: number): NivelDominio {
  if (tentativasTotais === 0) return 'novo';
  if (pct >= 80) return 'dominante';
  if (pct >= 40) return 'mediano';
  return 'aprendiz';
}

// Converte percentual de acerto em estrelas (0..3).
export function estrelasDoPct(pct: number): 0 | 1 | 2 | 3 {
  if (pct >= 100) return 3;
  if (pct >= 70) return 2;
  if (pct > 0) return 1;
  return 0;
}

export function registrarResultado(artigoId: string, acertou: boolean) {
  const store = read();
  const prev = store[artigoId] ?? {
    acertos: 0, tentativas: 0, dominado: false,
    estrelas: 0, melhor_pct: 0, updated_at: '',
  };
  const acertos = prev.acertos + (acertou ? 1 : 0);
  const tentativas = prev.tentativas + 1;
  const dominado = acertos >= 3 && acertos / tentativas >= 0.7;
  store[artigoId] = {
    ...prev,
    acertos, tentativas, dominado,
    updated_at: new Date().toISOString(),
  };
  write(store);
}

// Registra o resultado final de uma sessão de um artigo específico.
// Salva no cache local imediatamente e envia para o Supabase se logado.
export async function registrarResultadoSessao(params: {
  artigoId: string;
  leiId?: string | null;
  acertos: number;
  total: number;
}) {
  const { artigoId, leiId, acertos, total } = params;
  const pct = total > 0 ? Math.round((acertos / total) * 100) : 0;
  const estrelas = estrelasDoPct(pct);

  const store = read();
  const prev = store[artigoId] ?? {
    acertos: 0, tentativas: 0, dominado: false,
    estrelas: 0, melhor_pct: 0, updated_at: '',
  };
  const novasEstrelas = Math.max(prev.estrelas, estrelas) as 0 | 1 | 2 | 3;
  const novoPct = Math.max(prev.melhor_pct, pct);
  store[artigoId] = {
    acertos: prev.acertos + acertos,
    tentativas: prev.tentativas + total,
    dominado: novasEstrelas >= 3,
    estrelas: novasEstrelas,
    melhor_pct: novoPct,
    updated_at: new Date().toISOString(),
  };
  write(store);

  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) return { estrelas, pct };

    // upsert manual: pega existente para preservar máximos
    const { data: existente } = await supabase
      .from('praticar_progresso_artigo')
      .select('id, estrelas, melhor_pct, tentativas, acertos_total')
      .eq('user_id', user.id)
      .eq('artigo_id', artigoId)
      .maybeSingle();

    if (existente) {
      await supabase
        .from('praticar_progresso_artigo')
        .update({
          estrelas: Math.max(existente.estrelas ?? 0, estrelas),
          melhor_pct: Math.max(existente.melhor_pct ?? 0, pct),
          tentativas: (existente.tentativas ?? 0) + total,
          acertos_total: (existente.acertos_total ?? 0) + acertos,
          ultima_sessao_em: new Date().toISOString(),
          lei_id: leiId ?? null,
        })
        .eq('id', existente.id);
    } else {
      await supabase.from('praticar_progresso_artigo').insert({
        user_id: user.id,
        artigo_id: artigoId,
        lei_id: leiId ?? null,
        estrelas,
        melhor_pct: pct,
        tentativas: total,
        acertos_total: acertos,
      });
    }
  } catch (e) {
    // silencioso — cache local já preservou
    console.warn('[praticar] falha ao sincronizar progresso', e);
  }
  return { estrelas, pct };
}

// Hidrata o cache local a partir do Supabase para um conjunto de artigos.
export async function hidratarProgressoDoSupabase(artigoIds: string[]) {
  if (artigoIds.length === 0) return;
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) return;
    const { data } = await supabase
      .from('praticar_progresso_artigo')
      .select('artigo_id, estrelas, melhor_pct, tentativas, acertos_total, ultima_sessao_em')
      .eq('user_id', user.id)
      .in('artigo_id', artigoIds);
    if (!data) return;
    const store = read();
    for (const row of data) {
      const prev = store[row.artigo_id];
      // Mantém o maior entre local e servidor
      store[row.artigo_id] = {
        acertos: Math.max(prev?.acertos ?? 0, row.acertos_total ?? 0),
        tentativas: Math.max(prev?.tentativas ?? 0, row.tentativas ?? 0),
        dominado: (row.estrelas ?? 0) >= 3,
        estrelas: Math.max(prev?.estrelas ?? 0, row.estrelas ?? 0),
        melhor_pct: Math.max(prev?.melhor_pct ?? 0, row.melhor_pct ?? 0),
        updated_at: row.ultima_sessao_em ?? new Date().toISOString(),
      };
    }
    write(store);
  } catch (e) {
    console.warn('[praticar] falha ao hidratar progresso', e);
  }
}

export function calcularProgressoPct(artigoIds: string[]): { dominados: number; total: number; pct: number } {
  const total = artigoIds.length;
  if (!total) return { dominados: 0, total: 0, pct: 0 };
  const store = read();
  let dominados = 0;
  for (const id of artigoIds) if (store[id]?.dominado || (store[id]?.estrelas ?? 0) >= 3) dominados++;
  return { dominados, total, pct: Math.round((dominados / total) * 100) };
}
