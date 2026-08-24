// Serviço para Informativos STJ/STF com SWR + IDB.
import { supabaseCloud } from '@/integrations/supabase/cloudClient';
import { getMem, swr, onChange, hydrateFromIDB } from '@/services/jurisCacheStore';

export type InformativoTribunal = 'STJ' | 'STF';

export interface EdicaoRow {
  edicao: number;
  edicao_titulo: string | null;
  data_publicacao: string | null;
}

export interface VerbeteRow {
  id: string;
  edicao: number;
  ordem: number;
  processo: string;
  tema: string | null;
  secao: string | null;
  ramo_direito: string | null;
  destaque: string | null;
  inteiro_teor: string | null;
  informacoes_adicionais: string | null;
}

const TABLE: Record<InformativoTribunal, 'informativos_stj' | 'informativos_stf'> = {
  STJ: 'informativos_stj',
  STF: 'informativos_stf',
};

const edicoesKey = (t: InformativoTribunal) => `informativos-edicoes:${t}`;
const edicaoKey = (t: InformativoTribunal, ed: number) => `informativos-edicao:${t}:${ed}`;

async function fetchEdicoesRemote(tribunal: InformativoTribunal): Promise<EdicaoRow[]> {
  const { data, error } = await (supabaseCloud as any)
    .from(TABLE[tribunal])
    .select('edicao, edicao_titulo, data_publicacao')
    .order('edicao', { ascending: false });
  if (error) throw error;
  return (data ?? []) as EdicaoRow[];
}

async function fetchVerbetesRemote(tribunal: InformativoTribunal, edicao: number): Promise<VerbeteRow[]> {
  const { data, error } = await (supabaseCloud as any)
    .from(TABLE[tribunal])
    .select('*')
    .eq('edicao', edicao)
    .order('ordem', { ascending: true });
  if (error) throw error;
  return (data ?? []) as VerbeteRow[];
}

export function getEdicoesCached(tribunal: InformativoTribunal) {
  return getMem<EdicaoRow>(edicoesKey(tribunal));
}
export function warmEdicoesFromIDB(tribunal: InformativoTribunal) {
  return hydrateFromIDB<EdicaoRow>(edicoesKey(tribunal));
}
export function subscribeEdicoes(tribunal: InformativoTribunal, cb: (rows: EdicaoRow[]) => void) {
  return onChange<EdicaoRow>(edicoesKey(tribunal), cb);
}
export async function fetchEdicoes(tribunal: InformativoTribunal): Promise<EdicaoRow[]> {
  return swr<EdicaoRow>(edicoesKey(tribunal), () => fetchEdicoesRemote(tribunal));
}

export function getVerbetesCached(tribunal: InformativoTribunal, edicao: number) {
  return getMem<VerbeteRow>(edicaoKey(tribunal, edicao));
}
export function subscribeVerbetes(tribunal: InformativoTribunal, edicao: number, cb: (rows: VerbeteRow[]) => void) {
  return onChange<VerbeteRow>(edicaoKey(tribunal, edicao), cb);
}
export async function fetchVerbetes(tribunal: InformativoTribunal, edicao: number): Promise<VerbeteRow[]> {
  return swr<VerbeteRow>(edicaoKey(tribunal, edicao), () => fetchVerbetesRemote(tribunal, edicao));
}