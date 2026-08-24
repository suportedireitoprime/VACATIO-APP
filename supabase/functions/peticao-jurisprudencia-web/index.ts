// Agente PESQUISADOR de jurisprudência para a Petição Inicial (multi-agente).
//
// Pipeline em duas etapas:
//   1) CORPUS927 (fonte oficial da Enfam com STF/STJ):
//      • Um sub-agente Lovable AI lê os fatos + área do direito e escolhe
//        as combinações {slug_local, numero_artigo} mais relevantes dentre
//        as leis mapeadas em `jurisprudencia_leis_map`.
//      • Para cada combinação chama `corpus927-fetch` (que já cacheia no DB)
//        e coleta jurisprudências REAIS, com link oficial.
//   2) FALLBACK WEB (Gemini + google_search grounding) apenas quando o
//      Corpus927 não devolveu nada — pesquisa direta em stf.jus.br/stj.jus.br.
//
// Retorna o mesmo shape consumido pelo StepJurisprudencia do editor:
//   { jurisprudencias: [{ tribunal, tipo, numero, titulo, tese, ementa, link, ... }],
//     fonte: 'corpus927' | 'web', usou_fallback, selecoes, tentativas }
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { geminiFetch } from '../_shared/geminiFetch.ts';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY') ?? '';
const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY =
  Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '';
const MODEL_SELECAO = 'google/gemini-3.6-flash';

type LeiMap = { slug_local: string; corpus_lei_id: number; nome_exibicao: string };
type Selecao = { slug_local: string; numero_artigo: string; motivo?: string };
type JurisSaida = {
  tribunal: string;
  tipo: string;
  numero?: string;
  titulo: string;
  tese?: string;
  ementa?: string;
  link: string;
  relator?: string;
  data?: string;
  fonte_corpus?: { lei: string; artigo: string };
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function safeJson<T>(txt: string, fallback: T): T {
  try {
    return JSON.parse(txt) as T;
  } catch {
    const m = txt.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]) as T;
      } catch {
        /* ignore */
      }
    }
    return fallback;
  }
}

async function chamarLovableJson(system: string, user: string): Promise<string> {
  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL_SELECAO,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`gateway ${res.status}: ${err.slice(0, 200)}`);
  }
  const j = await res.json();
  return String(j.choices?.[0]?.message?.content ?? '{}');
}

async function fetchCorpus(corpus_lei_id: number, numero_artigo: string) {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/corpus927-fetch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ corpus_lei_id, numero_artigo }),
  });
  if (!r.ok) return null;
  return await r.json().catch(() => null);
}

function normalizarItens(cat: any, lei: LeiMap, artigo: string): JurisSaida[] {
  const itens: any[] = Array.isArray(cat?.itens) ? cat.itens : [];
  return itens
    .filter((it) => it.url_origem)
    .map((it) => ({
      tribunal: cat.tribunal || '—',
      tipo: cat.label || 'Jurisprudência',
      numero: it.numero_processo || String(it.id ?? ''),
      titulo: it.titulo || `${cat.label} — ${it.numero_processo ?? ''}`,
      tese: (it.teses && it.teses[0]) || (it.tese ?? ''),
      ementa: it.conteudo || it.ementa || '',
      link: it.url_origem,
      data: it.data_publicacao || undefined,
      fonte_corpus: { lei: lei.nome_exibicao, artigo },
    }));
}

function dedup(list: JurisSaida[]): JurisSaida[] {
  const seen = new Set<string>();
  const out: JurisSaida[] = [];
  for (const j of list) {
    const k = (j.link || j.titulo).trim().toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(j);
  }
  return out;
}

// Busca web via Gemini + google_search grounding (fallback).
async function buscaWeb(
  tema: string,
  area_direito: string,
  fatos_resumo: string,
  pontos_foco: string,
  quantidade: number,
): Promise<JurisSaida[]> {
  if (!GEMINI_KEY) return [];
  const query = `Encontre no site oficial do STF (stf.jus.br) e do STJ (stj.jus.br) até ${quantidade} jurisprudências REAIS sobre: ${tema || area_direito}. Contexto: ${fatos_resumo || ''}. ${pontos_foco ? 'Foco especial: ' + pontos_foco : ''}

Retorne APENAS um JSON válido (sem markdown, sem crase) com esta estrutura:
{
  "jurisprudencias": [
    { "tribunal": "STF"|"STJ", "tipo": "Repercussão Geral"|"Tema"|"Súmula"|"Acórdão"|"Recurso Repetitivo",
      "numero": "...", "titulo": "...", "relator": "...", "data": "AAAA-MM-DD ou AAAA",
      "tese": "1-3 frases", "ementa": "3-5 frases",
      "link": "URL OFICIAL stf.jus.br ou stj.jus.br" }
  ]
}

REGRAS:
- SÓ jurisprudências reais e verificáveis com link oficial (stf.jus.br/stj.jus.br).
- NUNCA invente número, tese ou link.
- Se nada for confiável, retorne {"jurisprudencias": []}.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
  const res = await geminiFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: query }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.2 },
    }),
  });
  if (!res.ok) return [];
  const j = await res.json().catch(() => ({}));
  const text: string =
    j.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
  const parsed = safeJson<{ jurisprudencias?: JurisSaida[] }>(text, {});
  const list = Array.isArray(parsed.jurisprudencias) ? parsed.jurisprudencias : [];
  const filtered = list.filter(
    (it: any) => typeof it?.link === 'string' && /https?:\/\/[^\s]*(stf|stj)\.jus\.br/i.test(it.link),
  );
  if (filtered.length) return filtered as JurisSaida[];

  // Último recurso: grounding URLs oficiais brutas.
  const groundingChunks = j.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const webLinks: string[] = groundingChunks.map((c: any) => c.web?.uri).filter(Boolean);
  const officials = webLinks
    .filter((u) => /(stf|stj)\.jus\.br/i.test(u))
    .slice(0, quantidade);
  return officials.map((u) => ({
    tribunal: /stf/i.test(u) ? 'STF' : 'STJ',
    tipo: 'Fonte oficial',
    titulo: 'Fonte oficial encontrada',
    tese: 'Consulte o link oficial para o inteiro teor.',
    ementa: '',
    link: u,
  }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY) return json({ error: 'LOVABLE_API_KEY missing' }, 500);

    const body = await req.json().catch(() => ({}));
    const {
      tema = '',
      area_direito = '',
      fatos_resumo = '',
      pontos_foco = '',
      quantidade = 4,
    } = body;
    const tema_final = String(tema || fatos_resumo || area_direito || '').trim();
    if (!tema_final) return json({ error: 'informe tema ou fatos_resumo' }, 400);

    // ─── ETAPA 1: PESQUISADOR NO CORPUS927 ───
    // Lê o mapa de leis via REST (a tabela tem policy public read).
    const leisResp = await fetch(
      `${SUPABASE_URL}/rest/v1/jurisprudencia_leis_map?select=slug_local,corpus_lei_id,nome_exibicao&ativo=eq.true`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      },
    );
    const leisAtivas: LeiMap[] = leisResp.ok ? await leisResp.json() : [];

    let selecoes: Selecao[] = [];
    if (leisAtivas.length > 0) {
      const leisListagem = leisAtivas
        .map((l) => `- ${l.nome_exibicao} (slug: ${l.slug_local})`)
        .join('\n');

      const promptSelecao = `Você é um advogado brasileiro sênior pesquisando jurisprudência para uma petição inicial.

CASO:
- Área: ${area_direito}
- Tema/pedidos: ${tema_final}
- Foco especial: ${pontos_foco || '(sem foco adicional)'}

LEIS DISPONÍVEIS na base oficial Corpus927/Enfam (banco real de jurisprudências STF/STJ):
${leisListagem}

Escolha até ${Math.min(6, quantidade * 2)} combinações {slug_local, numero_artigo} — os artigos-âncora que trarão as jurisprudências MAIS RELEVANTES para esse caso.

Regras:
- SÓ use slugs da lista acima. Não invente.
- numero_artigo é o número puro do artigo (ex: "186", "927", "5", "14"). Sem "Art.", sem "º".
- Priorize dispositivos-âncora do pedido (ex.: resp. civil → 186 e 927 CC; dano moral consumidor → 6 e 14 CDC; garantia constitucional → 5 CF).

Retorne APENAS JSON:
{ "selecoes": [ { "slug_local": "...", "numero_artigo": "...", "motivo": "..." } ] }`;

      try {
        const raw = await chamarLovableJson(
          'Você retorna apenas JSON válido, sem markdown.',
          promptSelecao,
        );
        const parsed = safeJson<{ selecoes?: Selecao[] }>(raw, {});
        selecoes = (parsed.selecoes ?? []).filter((s) => s && s.slug_local && s.numero_artigo);
      } catch (e) {
        console.error('selecao agente erro', e);
      }
    }

    const leiPorSlug = new Map(leisAtivas.map((l) => [l.slug_local, l]));
    const encontrados: JurisSaida[] = [];
    const tentativas: Array<{ lei: string; artigo: string; achou: number }> = [];

    for (const sel of selecoes) {
      const lei = leiPorSlug.get(sel.slug_local);
      if (!lei) continue;
      const artigo = String(sel.numero_artigo).replace(/[^0-9A-Za-z]/g, '');
      if (!artigo) continue;
      const payload = await fetchCorpus(lei.corpus_lei_id, artigo);
      const cats: any[] = Array.isArray(payload?.categorias) ? payload.categorias : [];
      let achouLocal = 0;
      for (const cat of cats) {
        for (const it of normalizarItens(cat, lei, artigo)) {
          encontrados.push(it);
          achouLocal++;
          if (encontrados.length >= quantidade * 3) break;
        }
        if (encontrados.length >= quantidade * 3) break;
      }
      tentativas.push({ lei: lei.nome_exibicao, artigo, achou: achouLocal });
      if (encontrados.length >= quantidade * 3) break;
    }

    let saida = dedup(encontrados).slice(0, quantidade);
    let usou_fallback = false;

    // ─── ETAPA 2: FALLBACK WEB ───
    if (saida.length === 0) {
      usou_fallback = true;
      saida = (await buscaWeb(tema_final, area_direito, fatos_resumo, pontos_foco, quantidade)).slice(
        0,
        quantidade,
      );
    }

    return json({
      jurisprudencias: saida,
      selecoes,
      tentativas,
      usou_fallback,
      fonte: usou_fallback ? 'web' : 'corpus927',
    });
  } catch (e) {
    console.error('juris-web erro', e);
    return json({ error: (e as Error).message }, 500);
  }
});