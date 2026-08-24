// Serviço para "Jurisprudência em Teses" (STJ/STF) com SWR + IndexedDB.
import { supabaseCloud } from '@/integrations/supabase/cloudClient';
import { getMem, swr, onChange, hydrateFromIDB } from '@/services/jurisCacheStore';

export type TesesTribunal = 'STJ' | 'STF';

export interface TeseEdicaoRow {
  id: string;
  tribunal: string;
  edicao: number;
  titulo: string;
  ramo: string | null;
  data_publicacao: string | null;
  total_teses: number;
}

export interface TeseItemRow {
  id: string;
  edicao_id: string;
  edicao: number;
  numero: number;
  tese: string;
  julgados: string | null;
}

const edicoesKey = (t: TesesTribunal) => `teses-edicoes:${t}`;
const itensKey = (t: TesesTribunal, ed: number) => `teses-itens:${t}:${ed}`;

async function fetchEdicoesRemote(tribunal: TesesTribunal): Promise<TeseEdicaoRow[]> {
  const { data, error } = await (supabaseCloud as any)
    .from('jurisprudencia_teses_edicoes')
    .select('id, tribunal, edicao, titulo, ramo, data_publicacao, total_teses')
    .eq('tribunal', tribunal)
    .order('edicao', { ascending: false });
  if (error) throw error;
  return (data ?? []) as TeseEdicaoRow[];
}

async function fetchItensRemote(tribunal: TesesTribunal, edicao: number): Promise<TeseItemRow[]> {
  const { data, error } = await (supabaseCloud as any)
    .from('jurisprudencia_teses_itens')
    .select('id, edicao_id, edicao, numero, tese, julgados')
    .eq('tribunal', tribunal)
    .eq('edicao', edicao)
    .order('numero', { ascending: true });
  if (error) throw error;
  return (data ?? []) as TeseItemRow[];
}

export function getTesesEdicoesCached(tribunal: TesesTribunal) {
  return getMem<TeseEdicaoRow>(edicoesKey(tribunal));
}
export function warmTesesEdicoesFromIDB(tribunal: TesesTribunal) {
  return hydrateFromIDB<TeseEdicaoRow>(edicoesKey(tribunal));
}
export function subscribeTesesEdicoes(tribunal: TesesTribunal, cb: (rows: TeseEdicaoRow[]) => void) {
  return onChange<TeseEdicaoRow>(edicoesKey(tribunal), cb);
}
export async function fetchTesesEdicoes(tribunal: TesesTribunal): Promise<TeseEdicaoRow[]> {
  return swr<TeseEdicaoRow>(edicoesKey(tribunal), () => fetchEdicoesRemote(tribunal));
}

export function getTesesItensCached(tribunal: TesesTribunal, edicao: number) {
  return getMem<TeseItemRow>(itensKey(tribunal, edicao));
}
export function subscribeTesesItens(tribunal: TesesTribunal, edicao: number, cb: (rows: TeseItemRow[]) => void) {
  return onChange<TeseItemRow>(itensKey(tribunal, edicao), cb);
}
export async function fetchTesesItens(tribunal: TesesTribunal, edicao: number): Promise<TeseItemRow[]> {
  return swr<TeseItemRow>(itensKey(tribunal, edicao), () => fetchItensRemote(tribunal, edicao));
}
