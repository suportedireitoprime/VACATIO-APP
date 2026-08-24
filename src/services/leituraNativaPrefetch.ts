import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Network } from '@capacitor/network';
import { supabase } from '@/integrations/supabase/client';

/**
 * Pré-download da leitura nativa (markdown + sumário + imagens do OCR)
 * apenas para as 3 coleções alvo: biblioteca_estudos (Áreas), biblioteca_classicos, biblioteca_lideranca.
 *
 * Estrutura:
 *   Directory.Data/leitura-nativa/{tabela}__{livro_id}/content.json
 *   Directory.Data/leitura-nativa/{tabela}__{livro_id}/img/{hash}.{ext}
 * O markdown salvo tem URLs de imagens já reescritas para capacitor://.
 */

const DIR = 'leitura-nativa';
const KEY_DONE = 'leitura-nativa:done:v2';

const TABELAS_ALVO = [
  { tabela: 'biblioteca_estudos', tituloField: 'tema' },
  { tabela: 'biblioteca_classicos', tituloField: 'livro' },
  { tabela: 'biblioteca_lideranca', tituloField: 'livro' },
  { tabela: 'biblioteca_oab', tituloField: 'tema' },
  { tabela: 'biblioteca_fora_da_toga', tituloField: 'livro' },
  { tabela: 'biblioteca_oratoria', tituloField: 'livro' },
  { tabela: 'biblioteca_portugues', tituloField: 'livro' },
  { tabela: 'biblioteca_pesquisa_cientifica', tituloField: 'livro' },
];

export interface LeituraNativaLocal {
  conteudo_md: string;
  sumario_json: any[] | null;
  total_paginas: number | null;
  refino_status?: 'pronto';
}

export interface NativoPrefetchProgress {
  done: number;
  total: number;
  status: 'idle' | 'running' | 'complete' | 'error';
  currentTitle?: string;
  errorMsg?: string;
}

type Listener = (p: NativoPrefetchProgress) => void;
const listeners = new Set<Listener>();
let currentProgress: NativoPrefetchProgress = { done: 0, total: 0, status: 'idle' };

function emit(next: Partial<NativoPrefetchProgress>) {
  currentProgress = { ...currentProgress, ...next };
  listeners.forEach((l) => l(currentProgress));
}

export function subscribeNativoProgress(l: Listener) {
  l(currentProgress);
  listeners.add(l);
  return () => listeners.delete(l);
}

function bookDir(tabela: string, id: string | number) {
  return `${DIR}/${tabela}__${id}`;
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(r.error);
    r.onload = () => {
      const s = String(r.result || '');
      const i = s.indexOf(',');
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.readAsDataURL(blob);
  });
}

async function ensureDir(path: string) {
  try { await Filesystem.mkdir({ path, directory: Directory.Data, recursive: true }); } catch { /* ok */ }
}

async function bookAlreadyCached(tabela: string, id: string | number): Promise<boolean> {
  try {
    await Filesystem.stat({ path: `${bookDir(tabela, id)}/content.json`, directory: Directory.Data });
    return true;
  } catch { return false; }
}

async function downloadImage(imgUrl: string, dir: string): Promise<string | null> {
  try {
    const extMatch = imgUrl.split('?')[0].match(/\.(png|jpe?g|webp|gif|svg)$/i);
    const ext = (extMatch?.[1] || 'png').toLowerCase();
    const name = `${hashCode(imgUrl).toString(36)}.${ext}`;
    const path = `${dir}/img/${name}`;
    try {
      const stat = await Filesystem.stat({ path, directory: Directory.Data });
      return Capacitor.convertFileSrc(stat.uri);
    } catch { /* precisa baixar */ }
    const res = await fetch(imgUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    const b64 = await blobToBase64(blob);
    const wrote = await Filesystem.writeFile({
      path,
      data: b64,
      directory: Directory.Data,
      recursive: true,
    });
    return Capacitor.convertFileSrc(wrote.uri);
  } catch {
    return null;
  }
}

async function rewriteMarkdownImages(md: string, dir: string): Promise<string> {
  // Encontra ![alt](url) com http(s)://
  const re = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
  const matches: { full: string; alt: string; url: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) matches.push({ full: m[0], alt: m[1], url: m[2] });
  if (matches.length === 0) return md;
  const uniqueUrls = Array.from(new Set(matches.map((x) => x.url)));
  const mapping = new Map<string, string>();
  for (const u of uniqueUrls) {
    const local = await downloadImage(u, dir);
    if (local) mapping.set(u, local);
  }
  return md.replace(re, (_full, alt, url) => {
    const local = mapping.get(url);
    return `![${alt}](${local || url})`;
  });
}

async function cacheOne(tabela: string, id: string | number): Promise<boolean> {
  if (await bookAlreadyCached(tabela, id)) return true;
  const { data, error } = await supabase
    .from('biblioteca_leitura_nativa')
    .select('conteudo_md_refinado, sumario_json, total_paginas, status, refino_status')
    .eq('livro_tabela', tabela)
    .eq('livro_id', String(id))
    .maybeSingle();
  if (error || !data || data.status !== 'pronto' || data.refino_status !== 'pronto' || !data.conteudo_md_refinado) return false;

  const dir = bookDir(tabela, id);
  await ensureDir(`${dir}/img`);
  const rewritten = await rewriteMarkdownImages(data.conteudo_md_refinado, dir);
  const payload: LeituraNativaLocal = {
    conteudo_md: rewritten,
    sumario_json: (data.sumario_json as any) || null,
    total_paginas: data.total_paginas ?? null,
    refino_status: 'pronto',
  };
  await Filesystem.writeFile({
    path: `${dir}/content.json`,
    data: JSON.stringify(payload),
    directory: Directory.Data,
    encoding: 'utf8' as any,
    recursive: true,
  });
  return true;
}

export async function getLocalLeituraNativa(
  tabela: string,
  id: string | number,
): Promise<LeituraNativaLocal | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const res = await Filesystem.readFile({
      path: `${bookDir(tabela, id)}/content.json`,
      directory: Directory.Data,
      encoding: 'utf8' as any,
    });
    return JSON.parse(String(res.data));
  } catch {
    return null;
  }
}

/** Cacheia sob demanda (usado quando o usuário abre um livro fora das 3 coleções alvo). */
export async function cacheLeituraOnDemand(tabela: string, id: string | number): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try { await cacheOne(tabela, id); } catch { /* silencioso */ }
}

let running = false;

export async function startLeituraNativaPrefetch(opts?: { wifiOnly?: boolean }) {
  if (!Capacitor.isNativePlatform()) return;
  if (running) return;
  const doneFlag = await Preferences.get({ key: KEY_DONE });
  if (doneFlag.value === '1') {
    emit({ status: 'complete' });
    return;
  }
  running = true;
  try {
    if (opts?.wifiOnly !== false) {
      const net = await Network.getStatus();
      if (net.connectionType !== 'wifi') { running = false; return; }
    }
    await ensureDir(DIR);
    // Coleta IDs das 3 tabelas alvo
    const alvos: { tabela: string; id: string }[] = [];
    for (const t of TABELAS_ALVO) {
      const { data } = await supabase.from(t.tabela as any).select('id').limit(5000);
      for (const row of (data as any[]) || []) alvos.push({ tabela: t.tabela, id: String(row.id) });
    }
    emit({ status: 'running', done: 0, total: alvos.length });

    let done = 0;
    const CONC = 2; // download pesado, concorrência baixa
    let i = 0;
    async function worker() {
      while (i < alvos.length) {
        const item = alvos[i++];
        try { await cacheOne(item.tabela, item.id); } catch { /* skip */ }
        done++;
        emit({ done });
      }
    }
    await Promise.all(Array.from({ length: CONC }, worker));
    await Preferences.set({ key: KEY_DONE, value: '1' });
    emit({ status: 'complete', done: alvos.length });
  } catch (e: any) {
    emit({ status: 'error', errorMsg: e?.message || 'erro' });
  } finally {
    running = false;
  }
}

export async function resetLeituraNativaCache() {
  try { await Filesystem.rmdir({ path: DIR, directory: Directory.Data, recursive: true }); } catch { /* ok */ }
  await Preferences.remove({ key: KEY_DONE });
  emit({ status: 'idle', done: 0, total: 0 });
}
