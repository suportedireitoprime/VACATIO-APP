// Auto-descoberta de corpus_lei_id no Corpus927 (Enfam) a partir de dados da lei local.
// Público. Se apply=true e a confiança for suficiente, faz upsert no jurisprudencia_leis_map.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const CORPUS_BASE = 'https://corpus927.enfam.jus.br';

interface Norma {
  id: number;
  ramo: string;
  tipo: string; // LEI, DEL, LC, CF...
  numero: number;
  ano: number;
  nome: string;
  apelido?: string;
  titulo?: string;
  ativo?: number;
}

let cachedNormas: Norma[] | null = null;
let cachedAt = 0;

async function loadNormas(): Promise<Norma[]> {
  if (cachedNormas && Date.now() - cachedAt < 3600_000) return cachedNormas;
  const r = await fetch(`${CORPUS_BASE}/api/normas`, {
    headers: { Accept: 'application/json', 'User-Agent': 'Vacatio-VadeMecum/1.0' },
  });
  if (!r.ok) throw new Error(`api/normas ${r.status}`);
  const arr = (await r.json()) as Norma[];
  cachedNormas = arr.filter((n) => n?.ativo !== 0);
  cachedAt = Date.now();
  return cachedNormas;
}

function norm(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(s: string): string[] {
  return norm(s).split(' ').filter((t) => t.length > 2 && !['lei', 'del', 'dec', 'del-', 'de', 'do', 'da', 'dos', 'das', 'sobre'].includes(t));
}

function scoreCandidate(input: { nome: string; slug: string; numero?: string | null; ano?: number | null }, n: Norma): number {
  let sc = 0;
  const nomeN = norm(input.nome || '');
  const nomeC = norm(n.nome || '');
  const slugN = norm(input.slug || '');
  const slugParts = slugN.split(' ').filter(Boolean);

  // Match numero+ano exato (forte)
  if (input.numero && String(n.numero) === String(input.numero).replace(/\D/g, '')) {
    sc += 60;
    if (input.ano && Number(n.ano) === Number(input.ano)) sc += 20;
  }

  // Apelido bate com slug local (ex.: cp, cpp, cpc, cc, clt, cdc).
  // Corpus927 usa "cpp-41", "cpc-15", "cc-02" etc. — o prefixo antes do "-" é a sigla.
  const apel = String(n.apelido || '').toLowerCase().split('-')[0].trim();
  const slugFirst = slugParts.find((p) => p !== 'lei' && p !== 'codigo') || '';
  if (apel && slugFirst && apel === slugFirst) sc += 70;
  if (apel && slugParts.includes(apel)) sc += 20;
  // slug exato = apelido inteiro (ex.: "cpp-41" == "cpp-41")
  if (String(n.apelido || '').toLowerCase() === slugN.replace(/\s+/g, '-')) sc += 80;
  if (apel === 'cp' && slugN.includes('codigo penal') && !slugN.includes('processo')) sc += 25;
  if (apel === 'cpp' && slugN.includes('processo penal')) sc += 25;
  if (apel === 'cpc' && slugN.includes('processo civil')) sc += 25;
  if (apel === 'cc' && slugN.includes('codigo civil')) sc += 25;
  if (apel === 'clt' && slugN.includes('consolidacao') && slugN.includes('trabalho')) sc += 25;
  if (apel === 'cdc' && slugN.includes('consumidor')) sc += 25;
  if (apel === 'ctb' && slugN.includes('transito')) sc += 25;
  if (apel === 'ctn' && slugN.includes('tributario')) sc += 25;
  if (apel === 'eca' && slugN.includes('crianca')) sc += 25;
  if (apel === 'lmp' && slugN.includes('maria') && slugN.includes('penha')) sc += 25;
  if (apel === 'ldr' && slugN.includes('drogas')) sc += 25;
  if (apel === 'lep' && slugN.includes('execucao') && slugN.includes('penal')) sc += 25;
  if (apel === 'lia' && slugN.includes('improbidade')) sc += 25;
  if (apel === 'lacp' && slugN.includes('acao') && slugN.includes('civil')) sc += 25;

  // Sobreposição de tokens do nome
  const tA = new Set(tokens(input.nome));
  const tB = new Set(tokens(n.nome));
  let inter = 0;
  for (const t of tA) if (tB.has(t)) inter++;
  const uni = new Set([...tA, ...tB]).size || 1;
  sc += (inter / uni) * 40;

  // Nome idêntico
  if (nomeN && nomeN === nomeC) sc += 30;
  // Substring
  if (nomeN && (nomeC.includes(nomeN) || nomeN.includes(nomeC))) sc += 10;
  // slug contém tokens do nome corpus
  for (const t of tokens(n.nome)) if (slugN.includes(t)) sc += 2;

  return sc;
}

// Slugs de leis que o Corpus927 não indexa (Constituição, códigos estaduais, etc.).
// Retornamos corpus_lei_id = -1 como marcador para o front usar fallback direto STF/STJ.
function unsupportedCorpus(slug: string, nome: string): boolean {
  const s = (slug || '').toLowerCase();
  const n = norm(nome || '');
  if (s === 'cf' || s === 'constituicao' || s === 'constituicao-federal') return true;
  if (n.startsWith('constituicao ')) return true;
  if (/^(sp|mg|rj|rs|pr|sc|ba|pe|ce|go|df|es|am|pa|ma|mt|ms|pi|pb|rn|al|se|to|ac|ap|ro|rr)-/.test(s)) return true;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const slug = String(body.slug_local || body.slug || '').trim();
    const nome = String(body.nome || '').trim();
    const numero = body.numero_lei != null ? String(body.numero_lei) : null;
    const ano = body.ano_lei != null ? Number(body.ano_lei) : null;
    const apply = !!body.apply;

    if (!slug && !nome) {
      return new Response(JSON.stringify({ error: 'slug_local ou nome é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fallback direto — Constituição e leis estaduais não estão no Corpus927.
    if (unsupportedCorpus(slug, nome)) {
      const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      let applied: any = null;
      if (apply && slug) {
        const { data } = await admin
          .from('jurisprudencia_leis_map')
          .upsert(
            { slug_local: slug, corpus_lei_id: -1, nome_exibicao: nome || slug, ativo: true },
            { onConflict: 'slug_local' },
          )
          .select()
          .maybeSingle();
        applied = data;
      }
      return new Response(
        JSON.stringify({
          matched: { corpus_lei_id: -1, nome: nome || slug, apelido: slug, score: 100 },
          confident: true,
          unsupported: true,
          applied,
          candidates: [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const normas = await loadNormas();
    const ranked = normas
      .map((n) => ({ n, score: scoreCandidate({ nome, slug, numero, ano }, n) }))
      .filter((r) => r.score > 15)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    const top = ranked[0];
    const gap = ranked.length > 1 ? top.score - ranked[1].score : top ? top.score : 0;
    const confident = !!top && (top.score >= 55 || gap >= 25);

    const candidates = ranked.map((r) => ({
      corpus_lei_id: r.n.id,
      nome: r.n.nome,
      apelido: r.n.apelido,
      tipo: r.n.tipo,
      numero: r.n.numero,
      ano: r.n.ano,
      score: Math.round(r.score),
    }));

    let applied: any = null;
    if (apply && confident && slug) {
    const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data, error } = await admin
        .from('jurisprudencia_leis_map')
        .upsert(
          {
            slug_local: slug,
            corpus_lei_id: top!.n.id,
            nome_exibicao: nome || top!.n.nome,
            ativo: true,
          },
          { onConflict: 'slug_local' },
        )
        .select()
        .maybeSingle();
      if (error) throw error;
      applied = data;
    }

    return new Response(
      JSON.stringify({
        matched: top ? { corpus_lei_id: top.n.id, nome: top.n.nome, apelido: top.n.apelido, score: Math.round(top.score) } : null,
        confident,
        applied,
        candidates,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
