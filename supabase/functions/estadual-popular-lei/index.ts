// Edge Function: estadual-popular-lei
// Baixa texto integral via Browserless e cria vade_mecum_leis + vade_mecum_artigos.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { extrairEmentaSP, extrairNumeroAnoSP } from '../_shared/estaduais/sp.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// HTML → texto/markdown simples
function htmlToMarkdown(html: string): string {
  let s = html;
  // remove scripts/styles/nav/footer/header
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '')
       .replace(/<style[\s\S]*?<\/style>/gi, '')
       .replace(/<(nav|footer|header|aside|form)[\s\S]*?<\/\1>/gi, '');
  // quebras de linha em blocos
  s = s.replace(/<\/(p|div|li|tr|h[1-6]|br)>/gi, '\n')
       .replace(/<br\s*\/?>/gi, '\n');
  // remove todas tags
  s = s.replace(/<[^>]+>/g, '');
  // decode entidades básicas
  s = s.replace(/&nbsp;/g, ' ')
       .replace(/&amp;/g, '&')
       .replace(/&lt;/g, '<')
       .replace(/&gt;/g, '>')
       .replace(/&quot;/g, '"')
       .replace(/&ordm;/gi, 'º')
       .replace(/&ordf;/gi, 'ª')
       .replace(/&deg;/gi, '°')
       .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(parseInt(n, 10)));
  // normaliza "N.º" / "N.°" / "N .º" comuns em portais oficiais → "Nº"
  s = s.replace(/(\d)\s*[.·]\s*[ºo°]/g, '$1º')
       .replace(/(\d)\s*[.·]\s*[ªa]/g, '$1ª');
  // normaliza espaços em branco
  s = s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return s;
}

async function browserlessScrape(url: string): Promise<string> {
  const key = Deno.env.get('BROWSERLESS_API_KEY');
  if (!key) throw new Error('BROWSERLESS_API_KEY não configurada');
  const endpoint = `https://production-sfo.browserless.io/content?token=${encodeURIComponent(key)}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      gotoOptions: { waitUntil: 'networkidle2', timeout: 45000 },
    }),
  });
  if (!res.ok) throw new Error(`Browserless ${res.status}: ${await res.text()}`);
  const html = await res.text();
  return htmlToMarkdown(html);
}

// Regex de hierarquia — mesmo padrão do federal (reextrair-lei-planalto),
// aceita caixa alta e mista, exige marcador válido (romano, ÚNICO, número).
const HIER_RE =
  /^(PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O)(?:\s+(?:[IVXLCDM]+|[ÚU]NICO|[ÚU]NICA|PRELIMINAR|GERAL|ESPECIAL|PRIMEIRA|SEGUNDA|TERCEIRA|QUARTA|QUINTA|SEXTA|S[ÉE]TIMA|OITAVA|NONA|D[ÉE]CIMA|\d+[ºª°]?)\b[\s\S]*|\s*)$/i;

// "Artigo 1º", "Art. 15", "Art. 5º-A", "Artigo 1.368-C"
const ART_RE = /^(?:Art(?:igo)?\.?)\s*(\d+(?:\.\d+)*(?:-[A-Z0-9]+)?)/i;

interface Bloco { tipo: 'hier' | 'art'; numero: string; texto: string }

function normalizeHierLabel(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toLocaleUpperCase('pt-BR');
}

// Divide markdown em blocos hier/art seguindo o mesmo padrão do federal.
function parseBlocos(md: string): Bloco[] {
  const linhas = md.split(/\n+/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);

  // pula preâmbulo até primeiro cabeçalho/artigo
  const startIdx = linhas.findIndex(l => HIER_RE.test(l) || ART_RE.test(l));
  const uteis = startIdx > 0 ? linhas.slice(startIdx) : linhas;

  const blocos: Bloco[] = [];
  let i = 0;
  while (i < uteis.length) {
    const linha = uteis[i];

    // Hierarquia
    if (HIER_RE.test(linha)) {
      let sigla = linha;
      let nome = '';
      const proxima = uteis[i + 1];
      const eSoLabel = /^(PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O)\s*$/i.test(linha);
      const romano = proxima ? proxima.match(/^([IVXLCDM]+|[ÚU]NICO|PRELIMINAR)$/i) : null;
      if (eSoLabel && romano) {
        sigla = `${linha} ${romano[1]}`;
        const nomeLinha = uteis[i + 2];
        if (nomeLinha && !HIER_RE.test(nomeLinha) && !ART_RE.test(nomeLinha) && nomeLinha.length < 200) {
          nome = nomeLinha; i += 3;
        } else { i += 2; }
      } else if (proxima && !HIER_RE.test(proxima) && !ART_RE.test(proxima) && proxima.length < 200) {
        nome = proxima; i += 2;
      } else {
        i += 1;
      }
      const siglaNorm = normalizeHierLabel(sigla);
      blocos.push({ tipo: 'hier', numero: siglaNorm, texto: nome ? `${siglaNorm}\n${nome}` : siglaNorm });
      continue;
    }

    // Artigo
    const am = linha.match(ART_RE);
    if (am) {
      const numero = am[1].replace(/[º°ª]/g, '');
      // Normaliza cabeçalho para "Art. Nº"
      const cabeca = linha
        // remove ".º" / ".°" / " . º" residual após o número
        .replace(/^(Art(?:igo)?\.?\s*\d+(?:\.\d+)*(?:-[A-Z0-9]+)?)\s*[.·]\s*[ºo°]/i, '$1º')
        .replace(/^Artigo\.?\s*/i, 'Art. ')
        .replace(/^Art\.\s*(\d{2,})[º°]/i, (_, n) => `Art. ${n}`)
        .replace(/^Art\.\s*([1-9])(?![\dº°\w\-.])/i, (_, n) => `Art. ${n}º`)
        // remove traços/pontos soltos que sobram entre número e ementa: "Art. 2º - ." → "Art. 2º"
        .replace(/^(Art\.\s*\d+(?:\.\d+)*(?:-[A-Z0-9]+)?[º°]?)\s*[-–—]\s*\.\s*/i, '$1 — ');
      const partes: string[] = [cabeca];
      let j = i + 1;
      while (j < uteis.length) {
        const l2 = uteis[j];
        if (HIER_RE.test(l2) || ART_RE.test(l2)) break;
        partes.push(l2);
        j += 1;
      }
      blocos.push({ tipo: 'art', numero, texto: partes.join('\n').trim() });
      i = j;
      continue;
    }

    i += 1;
  }
  return blocos;
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { catalog_id } = await req.json();
    if (!catalog_id) throw new Error('catalog_id obrigatório');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: cat, error: catErr } = await supabase
      .from('vade_mecum_leis_estaduais_catalog')
      .select('*')
      .eq('id', catalog_id)
      .maybeSingle();
    if (catErr || !cat) throw new Error('Catálogo não encontrado');

    const md = await browserlessScrape(cat.url_original);
    if (!md || md.length < 200) throw new Error('Conteúdo insuficiente do portal');

    const { numero: nEx, ano: aEx } = cat.numero && cat.ano
      ? { numero: cat.numero, ano: cat.ano }
      : extrairNumeroAnoSP(cat.url_original, md);
    const ementa = cat.ementa ?? extrairEmentaSP(md);

    const tipoLabel: Record<string, string> = {
      constituicao_estadual: 'Constituição Estadual',
      lei_complementar: 'Lei Complementar',
      lei: 'Lei',
      decreto: 'Decreto',
      decreto_lei: 'Decreto-Lei',
    };
    const nome = `${tipoLabel[cat.tipo] ?? cat.tipo} ${nEx ? `nº ${nEx}` : ''}${aEx ? `/${aEx}` : ''} - ${cat.uf}`.trim();
    const slug = `${cat.uf.toLowerCase()}-${cat.tipo}-${nEx ?? 'x'}-${aEx ?? 'y'}`.replace(/[^a-z0-9-]/g, '-');
    const categoria = `estadual_${cat.uf.toLowerCase()}`;

    // Cria/atualiza a lei
    const { data: leiUp, error: leiErr } = await supabase
      .from('vade_mecum_leis')
      .upsert({
        slug,
        nome,
        nome_curto: nEx ? `${tipoLabel[cat.tipo] ?? cat.tipo} ${nEx}/${aEx}` : nome,
        categoria,
        planalto_url: cat.url_original,
      } as any, { onConflict: 'slug' })
      .select('id')
      .single();
    if (leiErr) throw leiErr;

    // Limpa artigos anteriores e insere novos
    await supabase.from('vade_mecum_artigos').delete().eq('lei_id', leiUp.id);

    const blocos = parseBlocos(md);
    const nArt = blocos.filter(b => b.tipo === 'art').length;
    const nHier = blocos.filter(b => b.tipo === 'hier').length;

    if (blocos.length > 0) {
      const rows = blocos.map((b, i) => ({
        lei_id: leiUp.id,
        numero: b.numero,
        texto: b.texto,
        ordem: i + 1,
      }));
      for (let i = 0; i < rows.length; i += 500) {
        await supabase.from('vade_mecum_artigos').insert(rows.slice(i, i + 500) as any);
      }
    }

    await supabase.from('vade_mecum_leis')
      .update({ total_artigos: nArt } as any)
      .eq('id', leiUp.id);

    await supabase.from('vade_mecum_leis_estaduais_catalog').update({
      status: 'populado',
      lei_id: leiUp.id,
      ementa,
      numero: nEx ?? cat.numero,
      ano: aEx ?? cat.ano,
    } as any).eq('id', catalog_id);

    return new Response(JSON.stringify({ ok: true, lei_id: leiUp.id, artigos: nArt, hierarquia: nHier }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
