// Edge function: busca jurisprudência de um artigo no Corpus927 (Enfam/STJ)
// com cache no Supabase. Público (sem JWT).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const CORPUS_BASE = 'https://corpus927.enfam.jus.br';
const CACHE_TTL_DAYS = 30;

// Mapa dos códigos da Enfam → rótulo humano e tribunal.
// Códigos confirmados por inspeção da API pública de /jurisprudencia/nrm:X|art:Y.
// Fallback para códigos desconhecidos preserva o número em "Categoria X".
const TIPO_META: Record<string, { label: string; tribunal: string }> = {
  // temas
  '60':  { label: 'Recursos Repetitivos',           tribunal: 'STJ' },
  '80':  { label: 'Repercussão Geral',              tribunal: 'STF' },
  // jurisprudencias
  '70':  { label: 'Ação Declaratória de Constitucionalidade', tribunal: 'STF' },
  '90':  { label: 'Arguição de Descumprimento (ADPF)',        tribunal: 'STF' },
  '100': { label: 'Mandados de Injunção',           tribunal: 'STF' },
  '110': { label: 'Jurisprudência em Teses',        tribunal: 'STJ' },
  // (outros códigos aparecem eventualmente; caem no fallback)
};

function metaFor(codigo: string | number): { label: string; tribunal: string } {
  const key = String(codigo);
  return TIPO_META[key] || { label: `Categoria ${key}`, tribunal: '—' };
}

// Extrai todos os números de artigo mencionados num texto (ex.: "art. 91", "artigo 5º").
function extractArticleNumbers(text: string): Set<string> {
  const out = new Set<string>();
  if (!text) return out;
  const re = /\bart(?:igo|\.)?\s*n?º?\s*(\d{1,4})(?:[-–]?([A-Z]))?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const num = m[1].replace(/^0+/, '') || '0';
    const suf = (m[2] || '').toUpperCase();
    out.add(num + suf);
  }
  return out;
}

// Mantém apenas itens realmente relacionados ao artigo pedido:
// - se o texto cita algum "art. X" e X != pedido (e o pedido não aparece), descarta.
// - se não cita artigo nenhum, mantém (o Corpus927 já vinculou pelo índice).
function filterByArticleRelevance<T extends { titulo?: string; conteudo?: string; teses?: string[]; ementa?: string; descricao?: string; tese?: string }>(
  itens: T[],
  numeroPedido: string,
): T[] {
  const alvo = numeroPedido.toUpperCase().replace(/^0+/, '') || numeroPedido;
  return itens.filter((it) => {
    const blob = [it.titulo, it.conteudo, it.ementa, it.descricao, it.tese, ...(it.teses || [])]
      .filter(Boolean)
      .join(' \n ');
    const arts = extractArticleNumbers(blob);
    if (arts.size === 0) return true;
    if (arts.has(alvo)) return true;
    return false;
  });
}

function stfSearchUrl(numero_processo: string, sigla = 'ADPF'): string {
  const q = encodeURIComponent(`${sigla} ${numero_processo}`);
  return `https://portal.stf.jus.br/jurisprudencia/pesquisarInteiroTeor.asp?termo=${q}`;
}

function stjSearchUrl(numero_processo: string): string {
  const q = encodeURIComponent(numero_processo);
  return `https://scon.stj.jus.br/SCON/pesquisar.jsp?livre=${q}`;
}

function stripHtml(s: string): string {
  return (s || '')
    .replace(/<br\s*\/?>(?=)/gi, '\n')
    .replace(/<mark[^>]*>/gi, '')
    .replace(/<\/mark>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizePayload(raw: any) {
  const categorias: Array<{
    codigo: string;
    label: string;
    tribunal: string;
    itens: any[];
  }> = [];

  // jurisprudencias: objeto { "70": [...], "90": [...], "110": [...] }
  const juris = raw?.jurisprudencias || {};
  for (const [codigo, arr] of Object.entries<any>(juris)) {
    if (!Array.isArray(arr) || arr.length === 0) continue;
    const meta = metaFor(codigo);
    const itens = arr.map((it: any) => {
      const numero = it.numero_processo || '';
      const sigla = (it.titulo || '').split('/')[0]?.trim() || 'ADPF';
      const url_origem =
        it.url_origem ||
        it.cabecalho?.url_origem ||
        (meta.tribunal === 'STF' ? stfSearchUrl(numero, sigla) : stjSearchUrl(numero));
      return {
        id: it.id,
        titulo: it.titulo || (it.cabecalho?.titulo ?? `Item ${it.id}`),
        numero_processo: numero,
        conteudo: stripHtml(it.conteudo || (Array.isArray(it.teses) ? it.teses.join('\n\n') : '')),
        teses: Array.isArray(it.teses) ? it.teses.map(stripHtml).filter(Boolean) : [],
        data_publicacao: it.data_publicacao || null,
        situacao: it.situacao || null,
        url_origem,
      };
    });
    categorias.push({ codigo, label: meta.label, tribunal: meta.tribunal, itens });
  }

  // temas: dict { "60": [Tema...], "80": [Tema...] }  ou array (formato antigo)
  const temasRaw = raw?.temas;
  const temasEntries: Array<[string, any[]]> = [];
  if (Array.isArray(temasRaw)) {
    // Agrupa por codigo_tipo
    const byCode = new Map<string, any[]>();
    for (const t of temasRaw) {
      const k = String(t?.codigo_tipo ?? 'temas');
      if (!byCode.has(k)) byCode.set(k, []);
      byCode.get(k)!.push(t);
    }
    for (const [k, arr] of byCode) temasEntries.push([k, arr]);
  } else if (temasRaw && typeof temasRaw === 'object') {
    for (const [k, arr] of Object.entries<any>(temasRaw)) {
      if (Array.isArray(arr)) temasEntries.push([k, arr]);
    }
  }
  for (const [codigo, arr] of temasEntries) {
    if (!arr || arr.length === 0) continue;
    const meta = metaFor(codigo);
    // Ordena os temas do mais recente para o mais antigo (número maior primeiro).
    const sortedArr = [...arr].sort((a: any, b: any) => {
      const na = Number(a?.numero ?? a?.id ?? 0);
      const nb = Number(b?.numero ?? b?.id ?? 0);
      if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return nb - na;
      return String(b?.numero ?? b?.id ?? '').localeCompare(String(a?.numero ?? a?.id ?? ''));
    });
    categorias.push({
      codigo,
      label: meta.label,
      tribunal: meta.tribunal,
      itens: sortedArr.map((t: any) => {
        const tese = stripHtml(t.tese || '');
        const descricao = stripHtml(t.tema || t.descricao || '');
        const ementa = stripHtml(t.conteudo || '');
        const teses: string[] = [];
        if (tese) teses.push(tese);
        if (descricao && descricao !== tese) teses.push(descricao);
        return {
          id: t.id ?? t.numero,
          titulo: t.titulo || `Tema ${t.numero ?? t.id}`,
          numero_processo: String(t.numero ?? t.id ?? ''),
          descricao,
          tese,
          ementa,
          conteudo: ementa,
          teses,
          data_publicacao: t.data_publicacao || null,
          situacao: t.situacao ? stripHtml(t.situacao) : null,
          url_origem: t.url_origem || '',
        };
      }),
    });
  }

  // posicionamentos_agrupados_stj
  if (Array.isArray(raw?.posicionamentos_agrupados_stj) && raw.posicionamentos_agrupados_stj.length) {
    categorias.push({
      codigo: 'pos_agr',
      label: 'Posicionamentos Agrupados do STJ',
      tribunal: 'STJ',
      itens: raw.posicionamentos_agrupados_stj.map((it: any) => ({
        id: it.id,
        titulo: it.titulo || `Grupo ${it.id}`,
        numero_processo: it.numero_processo || '',
        conteudo: stripHtml(it.conteudo || it.ementa || ''),
        teses: Array.isArray(it.teses) ? it.teses.map(stripHtml).filter(Boolean) : [],
        data_publicacao: it.data_publicacao || null,
        url_origem: it.url_origem || stjSearchUrl(it.numero_processo || ''),
        similares_count: Array.isArray(it.similares) ? it.similares.length : (it.similares_count ?? null),
      })),
    });
  }

  if (Array.isArray(raw?.posicionamentos_agrupados_stj_emstj) && raw.posicionamentos_agrupados_stj_emstj.length) {
    categorias.push({
      codigo: 'pos_agr_stj',
      label: 'Posicionamentos Agrupados (STJ – interno)',
      tribunal: 'STJ',
      itens: raw.posicionamentos_agrupados_stj_emstj.map((it: any) => ({
        id: it.id,
        titulo: it.titulo || `Grupo ${it.id}`,
        numero_processo: it.numero_processo || '',
        conteudo: stripHtml(it.conteudo || it.ementa || ''),
        data_publicacao: it.data_publicacao || null,
        url_origem: it.url_origem || stjSearchUrl(it.numero_processo || ''),
      })),
    });
  }

  if (Array.isArray(raw?.posicionamentos_isolados_stj) && raw.posicionamentos_isolados_stj.length) {
    categorias.push({
      codigo: 'pos_iso',
      label: 'Posicionamentos Isolados do STJ',
      tribunal: 'STJ',
      itens: raw.posicionamentos_isolados_stj.map((it: any) => ({
        id: it.id,
        titulo: it.titulo || `Acórdão ${it.id}`,
        numero_processo: it.numero_processo || '',
        conteudo: stripHtml(it.conteudo || it.ementa || ''),
        data_publicacao: it.data_publicacao || null,
        url_origem: it.url_origem || stjSearchUrl(it.numero_processo || ''),
      })),
    });
  }

  if (Array.isArray(raw?.alteracoes) && raw.alteracoes.length) {
    categorias.push({
      codigo: 'alteracoes',
      label: 'Alterações Legislativas',
      tribunal: '—',
      itens: raw.alteracoes.map((a: any, i: number) => ({
        id: a.id ?? i,
        titulo: a.titulo || a.descricao || `Alteração ${i + 1}`,
        conteudo: stripHtml(a.conteudo || a.descricao || ''),
        data_publicacao: a.data_publicacao || null,
        url_origem: a.url_origem || '',
      })),
    });
  }

  // Ordem hierárquica (mais vinculante → mais indicativa)
  const PRIORITY = ['80', '60', '110', '70', '90', '100', 'pos_agr', 'pos_agr_stj', 'pos_iso', 'alteracoes'];
  categorias.sort((a, b) => {
    const ia = PRIORITY.indexOf(a.codigo);
    const ib = PRIORITY.indexOf(b.codigo);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });

  const total_itens = categorias.reduce((s, c) => s + c.itens.length, 0);
  return { categorias, total_itens };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    let corpus_lei_id: number | null = null;
    let numero_artigo = '';
    let force = false;

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      corpus_lei_id = Number(body.corpus_lei_id);
      numero_artigo = String(body.numero_artigo || '');
      force = !!body.force;
    } else {
      corpus_lei_id = Number(url.searchParams.get('corpus_lei_id'));
      numero_artigo = String(url.searchParams.get('numero_artigo') || '');
      force = url.searchParams.get('force') === '1';
    }

    if (!corpus_lei_id || !numero_artigo) {
      return new Response(JSON.stringify({ error: 'corpus_lei_id e numero_artigo são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // normaliza número do artigo: só letras+dígitos, tira "Art.", "º", espaços
    const numeroClean = numero_artigo
      .toUpperCase()
      .replace(/^ART\.?\s*/i, '')
      .replace(/[º°.\s]/g, '')
      .replace(/[-–]/g, '');

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1) cache?
    if (!force) {
      const { data: cached } = await admin
        .from('jurisprudencia_cache')
        .select('payload, total_itens, fetched_at, expires_at')
        .eq('corpus_lei_id', corpus_lei_id)
        .eq('numero_artigo', numeroClean)
        .maybeSingle();
      if (cached && new Date(cached.expires_at) > new Date()) {
        return new Response(
          JSON.stringify({ cached: true, ...cached.payload, total_itens: cached.total_itens, fetched_at: cached.fetched_at }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // 2) fetch upstream
    const upstreamUrl = `${CORPUS_BASE}/jurisprudencia/nrm:${corpus_lei_id}%7Cart:${encodeURIComponent(numeroClean)}`;
    const resp = await fetch(upstreamUrl, {
      headers: { Accept: 'application/json', 'User-Agent': 'Vacatio-VadeMecum/1.0' },
    });
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `Corpus927 respondeu ${resp.status}`, url: upstreamUrl }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const raw = await resp.json();
    const normalized = normalizePayload(raw);

    // 3) grava cache
    const expires_at = new Date(Date.now() + CACHE_TTL_DAYS * 86400_000).toISOString();
    await admin
      .from('jurisprudencia_cache')
      .upsert(
        {
          corpus_lei_id,
          numero_artigo: numeroClean,
          payload: normalized,
          total_itens: normalized.total_itens,
          fonte: 'corpus927',
          fetched_at: new Date().toISOString(),
          expires_at,
        },
        { onConflict: 'corpus_lei_id,numero_artigo' },
      );

    return new Response(
      JSON.stringify({ cached: false, ...normalized, fetched_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
