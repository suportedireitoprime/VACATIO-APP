import { LEIS_SUPABASE_URL, LEIS_SUPABASE_ANON_KEY } from "@/lib/legislacaoBackend";
import { supabaseCloud } from "@/integrations/supabase/cloudClient";
import { getMem, swr, onChange, hydrateFromIDB } from "@/services/jurisCacheStore";
const supabaseUrl = LEIS_SUPABASE_URL;
const supabaseKey = LEIS_SUPABASE_ANON_KEY;

export interface Sumula {
  id: string;
  tribunal: string;
  numero: number;
  enunciado: string;
  situacao: string;
  data_publicacao: string | null;
  referencia: string | null;
  ordem: number;
  extras?: {
    precedentes_representativos?: string[];
    teses_repercussao_geral?: string[];
    jurisprudencia_selecionada?: string[];
    observacao?: string[];
  };
}

export const SUMULA_TRIBUNAIS = [
  { id: 'STF_VINCULANTE', nome: 'Súmulas Vinculantes', tribunal: 'STF', descricao: 'Efeito vinculante para o Judiciário e Administração Pública', iconColor: '#dc2626', count: 63 },
  { id: 'STF', nome: 'Súmulas do STF', tribunal: 'STF', descricao: 'Supremo Tribunal Federal', iconColor: '#1d4ed8', count: 736 },
  { id: 'STJ', nome: 'Súmulas do STJ', tribunal: 'STJ', descricao: 'Superior Tribunal de Justiça', iconColor: '#16a34a', count: 676 },
  { id: 'TST', nome: 'Súmulas do TST', tribunal: 'TST', descricao: 'Tribunal Superior do Trabalho', iconColor: '#9333ea', count: 460 },
  { id: 'TSE', nome: 'Súmulas do TSE', tribunal: 'TSE', descricao: 'Tribunal Superior Eleitoral', iconColor: '#ea580c', count: 70 },
  { id: 'STM', nome: 'Súmulas do STM', tribunal: 'STM', descricao: 'Superior Tribunal Militar', iconColor: '#475569', count: 20 },
];

type FavoritosAction =
  | { action: 'list'; tribunal: string; access_token: string }
  | { action: 'sync'; tribunal: string; access_token: string; numeros: number[] }
  | { action: 'toggle'; tribunal: string; access_token: string; numero: number };

async function callFavoritos<T>(body: FavoritosAction): Promise<T> {
  const { data, error } = await supabaseCloud.functions.invoke('sumulas-favoritos', { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export async function fetchSumulasFavoritas(tribunal: string, accessToken: string): Promise<number[]> {
  const data = await callFavoritos<{ numeros: number[] }>({
    action: 'list', tribunal, access_token: accessToken,
  });
  return data.numeros ?? [];
}

export async function syncSumulasFavoritas(tribunal: string, accessToken: string, numeros: number[]) {
  await callFavoritos<{ ok: boolean }>({
    action: 'sync', tribunal, access_token: accessToken, numeros,
  });
}

export async function toggleSumulaFavorita(tribunal: string, accessToken: string, numero: number) {
  return callFavoritos<{ favoritada: boolean }>({
    action: 'toggle', tribunal, access_token: accessToken, numero,
  });
}

// Cache SWR (memória → IDB → rede). Segue em `jurisCacheStore`.
const cacheKey = (tribunal: string) => `sumulas:${tribunal}`;

async function fetchSumulasRemote(tribunal: string): Promise<Sumula[]> {
  if (tribunal === 'STF_VINCULANTE') {
    const { data, error } = await (supabaseCloud as any)
      .from('sumulas_vinculantes')
      .select('numero, enunciado, situacao, data_publicacao, referencia, extras')
      .order('numero', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: `SV-${r.numero}`, tribunal: 'STF_VINCULANTE', numero: r.numero,
      enunciado: r.enunciado ?? '', situacao: r.situacao ?? 'vigente',
      data_publicacao: r.data_publicacao ?? null, referencia: r.referencia ?? null,
      ordem: r.numero, extras: r.extras ?? {},
    }));
  }
  if (tribunal === 'STJ') {
    const { data, error } = await (supabaseCloud as any)
      .from('sumulas_stj')
      .select('numero, enunciado, situacao, orgao_julgador, data_publicacao, observacao')
      .order('numero', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: `STJ-${r.numero}`, tribunal: 'STJ', numero: r.numero,
      enunciado: r.enunciado ?? '', situacao: r.situacao ?? 'vigente',
      data_publicacao: r.data_publicacao ?? null, referencia: r.orgao_julgador ?? null,
      ordem: r.numero, extras: r.observacao ? { observacao: [r.observacao] } : {},
    }));
  }
  if (tribunal === 'STF') {
    const { data, error } = await (supabaseCloud as any)
      .from('sumulas_stf')
      .select('numero, enunciado, situacao, orgao_julgador, ramo_direito, data_aprovacao, fonte_publicacao, observacao')
      .order('numero', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: `STF-${r.numero}`, tribunal: 'STF', numero: r.numero,
      enunciado: r.enunciado ?? '', situacao: r.situacao ?? 'vigente',
      data_publicacao: r.data_aprovacao ?? null,
      referencia: r.fonte_publicacao ?? r.orgao_julgador ?? null,
      ordem: r.numero, extras: r.observacao ? { observacao: [r.observacao] } : {},
    }));
  }
  const res = await fetch(
    `${supabaseUrl}/rest/v1/sumulas?tribunal=eq.${tribunal}&select=*&order=numero.asc&limit=10000`,
    { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } },
  );
  if (!res.ok) throw new Error(`sumulas ${tribunal}: ${res.status}`);
  return (await res.json()) as Sumula[];
}

/** Leitura síncrona da memória — use no useState inicial para render sem flash. */
export function getSumulasCached(tribunal: string): Sumula[] | null {
  return getMem<Sumula>(cacheKey(tribunal));
}

/** Aquece a partir do IndexedDB (chamado no boot). */
export function warmSumulasFromIDB(tribunal: string) {
  return hydrateFromIDB<Sumula>(cacheKey(tribunal));
}

/** Assina mudanças (para revalidações em background atualizarem a UI). */
export function subscribeSumulas(tribunal: string, cb: (rows: Sumula[]) => void) {
  return onChange<Sumula>(cacheKey(tribunal), cb);
}

export async function fetchSumulas(tribunal: string): Promise<Sumula[]> {
  return swr<Sumula>(cacheKey(tribunal), () => fetchSumulasRemote(tribunal));
}
