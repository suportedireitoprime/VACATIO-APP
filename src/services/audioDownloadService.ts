/**
 * Download seletivo de áudios de narração para uso offline.
 * Persiste em Dexie (`narracoes` table) — funciona em web e nativo.
 */
import { db } from './offlineDb';
import { supabase } from '@/integrations/supabase/client';

export interface NarracaoRow {
  id: string;
  tabela_nome: string;
  artigo_numero: string;
  titulo_artigo: string | null;
  audio_url: string;
}

/**
 * Lista narrações disponíveis (do servidor) para uma tabela.
 * Retorna array vazio se offline / erro.
 */
export async function fetchNarracoesDisponiveis(tabelaNome: string): Promise<NarracaoRow[]> {
  const { data, error } = await supabase
    .from('narracoes_artigos')
    .select('id, tabela_nome, artigo_numero, titulo_artigo, audio_url')
    .eq('tabela_nome', tabelaNome)
    .order('artigo_numero');
  if (error) return [];
  return (data ?? []) as NarracaoRow[];
}

export async function isAudioDownloaded(tabelaNome: string, artigoNumero: string): Promise<boolean> {
  const rows = await db.narracoes.where('[tabelaNome+artigoNumero]').equals([tabelaNome, artigoNumero]).count();
  return rows > 0;
}

export async function getDownloadedAudioIds(tabelaNome: string): Promise<Set<string>> {
  const rows = await db.narracoes.filter(r => r.tabelaNome === tabelaNome).toArray().catch(() => []);
  return new Set(rows.map(r => r.artigoNumero));
}

export async function downloadAudio(row: NarracaoRow, onProgress?: (pct: number) => void): Promise<boolean> {
  try {
    onProgress?.(5);
    const res = await fetch(row.audio_url);
    if (!res.ok) return false;
    const blob = await res.blob();
    onProgress?.(85);
    await db.narracoes.put({
      id: `${row.tabela_nome}::${row.artigo_numero}`,
      tabelaNome: row.tabela_nome,
      artigoNumero: row.artigo_numero,
      audioBlob: blob,
    });
    onProgress?.(100);
    return true;
  } catch (e) {
    console.warn('[audioDownload] falhou', row.id, e);
    return false;
  }
}

export async function removeAudio(tabelaNome: string, artigoNumero: string) {
  await db.narracoes.delete(`${tabelaNome}::${artigoNumero}`).catch(() => {});
}

export async function removeAllAudios() {
  await db.narracoes.clear().catch(() => {});
}

export async function estimateAudiosSize(): Promise<{ count: number; bytes: number }> {
  const all: any[] = await db.narracoes.toArray().catch(() => []);
  const bytes: number = all.reduce((sum: number, r: any) => sum + (r?.audioBlob?.size || 0), 0);
  return { count: all.length, bytes };
}

