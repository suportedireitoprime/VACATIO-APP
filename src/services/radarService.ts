import { supabase } from '@/integrations/supabase/client';

const CAMARA_API = 'https://dadosabertos.camara.leg.br/api/v2';
const SENADO_API = 'https://legis.senado.leg.br/dadosabertos';

// ---- CACHE LAYER ----
const TTL = 10 * 60 * 1000; // 10 min
interface CacheEntry<T> { data: T; ts: number; }
const cache = new Map<string, CacheEntry<any>>();

function cached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < TTL) return entry.data as T;
  cache.delete(key);
  return null;
}

function setCache<T>(key: string, data: T) {
  cache.set(key, { data, ts: Date.now() });
}

// ---- DEPUTADOS ----
export async function fetchDeputados(busca?: string, partido?: string, uf?: string) {
  const cacheKey = `deputados:${busca || ''}:${partido || ''}:${uf || ''}`;
  const hit = cached<any[]>(cacheKey);
  if (hit) return hit;
  let query = (supabase as any).from('radar_deputados').select('id,nome,sigla_partido,sigla_uf,foto_url,email').order('nome');
  if (busca) query = query.ilike('nome', `%${busca}%`);
  if (partido) query = query.eq('sigla_partido', partido);
  if (uf) query = query.eq('sigla_uf', uf);
  
  const { data, error } = await query;
  
  if (error || !data || data.length === 0) {
    // Fallback to API
    let url = `${CAMARA_API}/deputados?ordem=ASC&ordenarPor=nome&itens=100`;
    if (busca) url += `&nome=${encodeURIComponent(busca)}`;
    if (partido) url += `&siglaPartido=${partido}`;
    if (uf) url += `&siglaUf=${uf}`;
    
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.dados || []).map((d: any) => ({
      id: d.id,
      nome: d.nome,
      sigla_partido: d.siglaPartido,
      sigla_uf: d.siglaUf,
      foto_url: d.urlFoto,
      email: d.email,
      dados_json: d,
    }));
  }
  
  setCache(cacheKey, data);
  return data;
}

export async function fetchDeputadoDetalhe(id: number) {
  const cacheKey = `depDetalhe:${id}`;
  const hit = cached<any>(cacheKey);
  if (hit) return hit;
  const url = `${CAMARA_API}/deputados/${id}`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) return null;
  const json = await res.json();
  const result = json.dados;
  if (result) setCache(cacheKey, result);
  return result;
}

export async function fetchDeputadoDespesas(id: number) {
  const url = `${CAMARA_API}/deputados/${id}/despesas?ordem=DESC&ordenarPor=ano&itens=30`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) return [];
  const json = await res.json();
  return json.dados || [];
}

// ---- SENADORES ----
export async function fetchSenadores(busca?: string, partido?: string, uf?: string) {
  const cacheKey = `senadores:${busca || ''}:${partido || ''}:${uf || ''}`;
  const hit = cached<any[]>(cacheKey);
  if (hit) return hit;
  let query = (supabase as any).from('radar_senadores').select('codigo,nome,sigla_partido,sigla_uf,foto_url,dados_json').order('nome');
  if (busca) query = query.ilike('nome', `%${busca}%`);
  if (partido) query = query.eq('sigla_partido', partido);
  if (uf) query = query.eq('sigla_uf', uf);
  
  const { data, error } = await query;
  
  if (error || !data || data.length === 0) {
    const res = await fetch(`${SENADO_API}/senador/lista/atual.json`, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return [];
    const json = await res.json();
    const parlamentares = json?.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar || [];
    return parlamentares
      .filter((p: any) => {
        const id = p.IdentificacaoParlamentar;
        if (busca && !id.NomeParlamentar?.toLowerCase().includes(busca.toLowerCase())) return false;
        if (partido && id.SiglaPartidoParlamentar !== partido) return false;
        if (uf && id.UfParlamentar !== uf) return false;
        return true;
      })
      .map((p: any) => {
        const id = p.IdentificacaoParlamentar;
        return {
          codigo: id.CodigoParlamentar,
          nome: id.NomeParlamentar,
          sigla_partido: id.SiglaPartidoParlamentar,
          sigla_uf: id.UfParlamentar,
          foto_url: id.UrlFotoParlamentar,
          dados_json: p,
        };
      });
  }
  
  setCache(cacheKey, data);
  return data;
}

// ---- PROPOSIÇÕES ----
export async function fetchProposicoes(tipo?: string, ano?: number, pagina = 1) {
  const { data, error } = await (supabase as any).from('radar_proposicoes')
    .select('*')
    .order('atualizado_em', { ascending: false })
    .range((pagina - 1) * 20, pagina * 20 - 1);
  
  if (error || !data || data.length === 0) {
    let url = `${CAMARA_API}/proposicoes?ordem=DESC&ordenarPor=id&itens=20&pagina=${pagina}`;
    if (tipo) url += `&siglaTipo=${tipo}`;
    if (ano) url += `&ano=${ano}`;
    
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.dados || []).map((d: any) => ({
      id_externo: String(d.id),
      fonte: 'camara',
      sigla_tipo: d.siglaTipo,
      numero: d.numero,
      ano: d.ano,
      ementa: d.ementa,
      dados_json: d,
    }));
  }
  
  return data;
}

export async function fetchProposicaoDetalhe(id: string) {
  const cacheKey = `propDetalhe:${id}`;
  const hit = cached<any>(cacheKey);
  if (hit) return hit;
  const url = `${CAMARA_API}/proposicoes/${id}`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) return null;
  const json = await res.json();
  const result = json.dados;
  if (result) setCache(cacheKey, result);
  return result;
}

export async function fetchProposicaoTramitacoes(id: string) {
  const cacheKey = `propTram:${id}`;
  const hit = cached<any[]>(cacheKey);
  if (hit) return hit;
  const url = `${CAMARA_API}/proposicoes/${id}/tramitacoes`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) return [];
  const json = await res.json();
  const result = json.dados || [];
  setCache(cacheKey, result);
  return result;
}

// ---- VOTAÇÕES ----
export async function fetchVotacoes() {
  const cacheKey = 'votacoes';
  const hit = cached<any[]>(cacheKey);
  if (hit) return hit;
  const { data, error } = await (supabase as any).from('radar_votacoes')
    .select('*')
    .order('data', { ascending: false })
    .limit(50);
  
  if (error || !data || data.length === 0) {
    const url = `${CAMARA_API}/votacoes?ordem=DESC&ordenarPor=dataHoraRegistro&itens=50`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.dados || []).map((v: any) => ({
      id_externo: String(v.id),
      fonte: 'camara',
      data: v.dataHoraRegistro,
      descricao: v.descricao,
      resultado: v.aprovacao === 1 ? 'Aprovado' : v.aprovacao === 0 ? 'Rejeitado' : null,
      dados_json: v,
    }));
  }
  
  setCache(cacheKey, data);
  return data;
}

export async function fetchVotacaoVotos(id: string) {
  const url = `${CAMARA_API}/votacoes/${id}/votos`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) return [];
  const json = await res.json();
  return json.dados || [];
}

// ---- AUTORES DE PROPOSIÇÃO ----
export async function fetchProposicaoAutores(id: string) {
  const url = `${CAMARA_API}/proposicoes/${id}/autores`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) return [];
  const json = await res.json();
  return json.dados || [];
}

// ---- HELPER: UFs e Partidos ----
export const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA',
  'PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'
];
