import { supabase } from '@/integrations/supabase/client';

const LOCAL_KEY = (t: string, i: string) => `leitura-nativa:${t}:${i}`;

const notify = (key: string) => {
  try {
    window.dispatchEvent(new CustomEvent('biblioteca:tracking', { detail: { key } }));
  } catch {
    /* ignore */
  }
};

export function readLocalLeituraProgress(table: string, id: string): Record<string, any> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_KEY(table, id));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

const readLocal = readLocalLeituraProgress;

let pulled = false;

/** Baixa o progresso de leitura salvo no Supabase e mescla no localStorage. */
export async function pullLeituraProgress(force = false): Promise<void> {
  if (typeof window === 'undefined') return;
  if (pulled && !force) return;
  pulled = true;
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return;

    const { data, error } = await supabase
      .from('biblioteca_leitura_progresso')
      .select('*')
      .eq('user_id', uid)
      .order('updated_at', { ascending: false })
      .limit(200);
    if (error || !data) return;

    for (const row of data as any[]) {
      const key = LOCAL_KEY(row.livro_tabela, String(row.livro_id));
      const remoteAt = new Date(row.updated_at).getTime();
      const prev = readLocal(row.livro_tabela, String(row.livro_id));
      const localAt = Number(prev?.updatedAt || 0);
      if (localAt >= remoteAt) continue;
      const merged = {
        ...prev,
        index: typeof row.pagina_atual === 'number' ? row.pagina_atual : (prev?.index ?? 0),
        ocrPage: typeof row.scroll_offset === 'number' ? row.scroll_offset : prev?.ocrPage,
        total: row.total_paginas ?? prev?.total ?? null,
        totalOcr: row.total_ocr ?? prev?.totalOcr ?? null,
        readTimeMs: Math.max(Number(prev?.readTimeMs || 0), Number(row.read_time_ms || 0)),
        bookmarks: Array.isArray(row.bookmark_ids) ? row.bookmark_ids : (prev?.bookmarks ?? []),
        titulo: row.titulo || prev?.titulo || 'Continuar leitura',
        autor: row.autor ?? prev?.autor ?? null,
        capa: row.capa ?? prev?.capa ?? null,
        updatedAt: remoteAt,
      };
      try {
        localStorage.setItem(key, JSON.stringify(merged));
        notify(key);
      } catch {
        /* storage quota */
      }
    }
    notify('leitura-nativa:sync');
  } catch {
    /* ignore */
  }
}

const timers = new Map<string, number>();

/** Envia (com debounce) o progresso local do livro para o Supabase. */
export function pushLeituraProgress(livroTabela: string, livroId: string, delay = 2500) {
  if (typeof window === 'undefined') return;
  const mapKey = `${livroTabela}:${livroId}`;
  const existing = timers.get(mapKey);
  if (existing) window.clearTimeout(existing);
  const t = window.setTimeout(() => {
    timers.delete(mapKey);
    void flush(livroTabela, livroId);
  }, delay);
  timers.set(mapKey, t);
}

async function flush(livroTabela: string, livroId: string) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return;
    const local = readLocal(livroTabela, livroId) as any;
    if (!local || !local.updatedAt) return;
    await supabase.from('biblioteca_leitura_progresso').upsert(
      {
        user_id: uid,
        livro_tabela: livroTabela,
        livro_id: String(livroId),
        pagina_atual: typeof local.index === 'number' ? local.index : 0,
        scroll_offset: typeof local.ocrPage === 'number' ? local.ocrPage : null,
        total_paginas: typeof local.total === 'number' ? local.total : null,
        total_ocr: typeof local.totalOcr === 'number' ? local.totalOcr : null,
        read_time_ms: Math.round(Number(local.readTimeMs || 0)),
        bookmark_ids: Array.isArray(local.bookmarks) ? local.bookmarks : [],
        titulo: local.titulo ?? null,
        autor: local.autor ?? null,
        capa: local.capa ?? null,
        updated_at: new Date(Number(local.updatedAt)).toISOString(),
      },
      { onConflict: 'user_id,livro_tabela,livro_id' },
    );
  } catch {
    /* ignore */
  }
}

/** Reseta o estado de sincronização (usar ao trocar de usuário). */
export function resetLeituraSync() {
  pulled = false;
}

// Ao trocar de conta, permite um novo pull do progresso do novo usuário.
supabase.auth.onAuthStateChange(() => {
  pulled = false;
});
