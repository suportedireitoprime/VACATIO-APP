import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, nome, sigla, tipo, descricao, url_planalto, tabela_nome } = await req.json();

    if (!url || !nome || !sigla || !tipo || !tabela_nome) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: url, nome, sigla, tipo, tabela_nome" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch HTML directly (Planalto serves static HTML)
    console.log(`Scraping (fetch direto): ${url}`);
    const response = await fetch(url, { headers: FETCH_HEADERS });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Fetch falhou: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rawBytes = new Uint8Array(await response.arrayBuffer());
    let html: string;
    try {
      html = new TextDecoder("utf-8", { fatal: true }).decode(rawBytes);
    } catch {
      html = new TextDecoder("windows-1252").decode(rawBytes);
    }
    html = html.normalize("NFC").replace(/\uFFFD/g, " ").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
    console.log(`HTML recebido: ${html.length} caracteres`);

    // 2. Parse HTML to extract articles
    const artigos = parseHtmlLegislacao(html);
    console.log(`Artigos encontrados: ${artigos.length}`);

    if (artigos.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum artigo encontrado no HTML", htmlLength: html.length }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Clear existing data
    const deleteRes = await fetch(
      `${supabaseUrl}/rest/v1/${encodeURIComponent(tabela_nome)}?ordem=gte.0`,
      {
        method: "DELETE",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
      }
    );
    console.log(`Delete existing rows: ${deleteRes.status}`);

    // 4. Insert articles in batches
    let totalArtigos = 0;

    for (let i = 0; i < artigos.length; i += 50) {
      const batch = artigos.slice(i, i + 50);
      const rows = batch.map((art) => ({
        numero: art.numero,
        rotulo: art.rotulo,
        texto: art.texto,
        ordem_numero: art.ordem_numero,
        caput: art.texto.split("\n")[0] || "",
        ordem: Math.floor(art.ordem_numero),
        titulo: art.titulo || null,
        capitulo: art.capitulo || null,
      }));

      const insertRes = await fetch(
        `${supabaseUrl}/rest/v1/${encodeURIComponent(tabela_nome)}`,
        {
          method: "POST",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify(rows),
        }
      );

      if (insertRes.ok) {
        totalArtigos += batch.length;
      } else {
        const errText = await insertRes.text();
        console.error(`Erro batch ${i}:`, errText);
      }
    }

    // Log some sample articles for validation
    for (const art of artigos.slice(0, 3)) {
      console.log(`${art.rotulo}: ${art.texto.substring(0, 120)}...`);
    }
    const art7 = artigos.find(a => a.numero === "Art. 7");
    if (art7) {
      console.log(`=== ART 7 FULL ===`);
      console.log(art7.texto);
      console.log(`=== END ART 7 ===`);
    }

    const result = {
      success: true,
      lei: nome,
      sigla,
      tabela_nome,
      totalArtigos,
    };

    console.log("Resultado:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro geral:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

interface ArtigoParsed {
  numero: string;
  rotulo: string;
  texto: string;
  ordem_numero: number;
  titulo: string;
  capitulo: string;
}

function decodeHtmlText(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function extractNumeroOrdem(artMatch: string): { numero: string; rotulo: string; ordem: number } {
  const normalizedLabel = artMatch.trim().replace(/°/g, "º").replace(/(\d)o\b/gi, "$1º");
  const clean = artMatch.replace(/[º°o]/g, "").replace(/\./g, "").trim();
  const suffixMatch = clean.match(/^(\d+)-([A-Z])$/i);
  if (suffixMatch) {
    const base = parseInt(suffixMatch[1]);
    const suffix = suffixMatch[2].toUpperCase().charCodeAt(0) - 64;
    return {
      numero: `Art. ${clean}`,
      rotulo: `Art. ${normalizedLabel}`,
      ordem: base + suffix * 0.1,
    };
  }
  const num = parseInt(clean);
  return {
    numero: `Art. ${clean}`,
    rotulo: `Art. ${normalizedLabel}`,
    ordem: isNaN(num) ? 0 : num,
  };
}

function parseHtmlLegislacao(html: string): ArtigoParsed[] {
  const textBlocks: string[] = [];
  const blockRegex = /<(?:p|h[1-6]|center)[^>]*>([\s\S]*?)<\/(?:p|h[1-6]|center)>/gi;
  let match;
  while ((match = blockRegex.exec(html)) !== null) {
    const cleaned = match[1]
      .replace(/<(?:strike|s|del)\b[^>]*>[\s\S]*?<\/(?:strike|s|del)\b>/gi, "")
      .replace(/<(?:br|hr)\s*\/?>/gi, "\n");
    const decoded = decodeHtmlText(cleaned);
    if (decoded) textBlocks.push(decoded);
  }

  const artigos: ArtigoParsed[] = [];
  const artRegex = /^Art\.\s*(\d+(?:\.\d+)*[º°o]?(?:-[A-Z])?)\s*[.–\-\s]/i;
  const capituloRegex = /^CAP[ÍI]TULO\s+/i;
  const tituloRegex = /^T[ÍI]TULO\s+/i;

  interface RawArticle {
    artMatchStr: string;
    headerText: string;
    lines: string[];
    nomenJuris: string;
    titulo: string;
    capitulo: string;
    isADCT: boolean;
  }

  const rawArticles: RawArticle[] = [];
  let pendingNomenJuris = "";
  let currentTitulo = "";
  let currentCapitulo = "";
  let isADCT = false;
  const adctRegex = /ATO\s+DAS\s+DISPOSI[ÇC][ÕO]ES\s+CONSTITUCIONAIS\s+TRANSIT[ÓO]RIAS/i;

  for (let i = 0; i < textBlocks.length; i++) {
    const block = textBlocks[i];

    if (!isADCT && rawArticles.length > 0 && adctRegex.test(block)) {
      isADCT = true;
      currentTitulo = "ADCT - Ato das Disposições Constitucionais Transitórias";
      currentCapitulo = "";
      continue;
    }

    if (tituloRegex.test(block)) {
      let fullTitulo = block;
      if (i + 1 < textBlocks.length) {
        const next = textBlocks[i + 1];
        const isDescription = /^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÚÇ]/.test(next)
          && !artRegex.test(next)
          && !tituloRegex.test(next)
          && !capituloRegex.test(next)
          && next.replace(/\s*\([^)]*\)\s*/g, "").trim().length < 120
          && !/^[IVXLC]+\s*[-–.]/i.test(next)
          && !/^(§|Parágrafo|[a-z]\))/i.test(next);
        if (isDescription) {
          fullTitulo = block + " " + next;
          i++;
        }
      }
      if (!isADCT) {
        currentTitulo = fullTitulo;
      }
      currentCapitulo = "";
      continue;
    }
    if (capituloRegex.test(block)) {
      let fullCapitulo = block;
      if (i + 1 < textBlocks.length) {
        const next = textBlocks[i + 1];
        const isDescription = /^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÚÇ]/.test(next)
          && !artRegex.test(next)
          && !tituloRegex.test(next)
          && !capituloRegex.test(next)
          && next.replace(/\s*\([^)]*\)\s*/g, "").trim().length < 120
          && !/^[IVXLC]+\s*[-–.]/i.test(next)
          && !/^(§|Parágrafo|[a-z]\))/i.test(next);
        if (isDescription) {
          fullCapitulo = block + " " + next;
          i++;
        }
      }
      currentCapitulo = fullCapitulo;
      continue;
    }

    let blockToProcess = block;
    const livroInlineRegex = /^(LIVRO\s+[IVXLC]+(?:\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÚÇ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÚÇa-záàâãéèêíïóôõúç\s,]+?))\s+(Art\.\s*\d)/i;
    const livroInlineMatch = block.match(livroInlineRegex);
    if (livroInlineMatch) {
      currentTitulo = livroInlineMatch[1].trim();
      currentCapitulo = "";
      blockToProcess = block.substring(livroInlineMatch[1].length).trim();
    }

    const artMatch = blockToProcess.match(artRegex);
    if (artMatch) {
      rawArticles.push({
        artMatchStr: artMatch[1],
        headerText: blockToProcess,
        lines: [],
        nomenJuris: pendingNomenJuris,
        titulo: currentTitulo,
        capitulo: currentCapitulo,
        isADCT,
      });
      pendingNomenJuris = "";
      continue;
    }

    if (rawArticles.length > 0) {
      if (isNomenJuris(block)) {
        pendingNomenJuris = block;
        continue;
      }
      rawArticles[rawArticles.length - 1].lines.push(block);
    } else {
      if (isNomenJuris(block)) {
        pendingNomenJuris = block;
      }
    }
  }

  for (const raw of rawArticles) {
    const { artMatchStr, headerText, lines, titulo, capitulo, isADCT: artIsADCT } = raw;
    const { numero, rotulo, ordem } = extractNumeroOrdem(artMatchStr);
    const finalOrdem = artIsADCT ? ordem + 10000 : ordem;

    const textParts: string[] = [];
    const caputText = headerText.replace(artRegex, "").replace(/^[oº]\s*/, "").trim();
    if (caputText) textParts.push(caputText);
    for (const line of lines) textParts.push(line);

    const textoRaw = textParts.join("\n");
    const texto = textoRaw.replace(/(\d)o\b/g, "$1º").replace(/°/g, "º");

    if (texto.trim()) {
      artigos.push({ numero, rotulo, texto, ordem_numero: finalOrdem, titulo, capitulo });
    }
  }

  const deduped = new Map<number, ArtigoParsed>();
  for (const art of artigos) {
    deduped.set(art.ordem_numero, art);
  }
  return Array.from(deduped.values());
}

function isNomenJuris(text: string): boolean {
  const cleaned = text.replace(/\s*\([^)]*\)\s*/g, "").trim();
  if (cleaned.length > 100 || cleaned.length < 3) return false;
  if (/^Art\./i.test(cleaned)) return false;
  if (/^[IVXLC]+\s*[-–.]/i.test(cleaned)) return false;
  if (/^(§|Parágrafo)/i.test(cleaned)) return false;
  if (/^CAP[ÍI]TULO/i.test(cleaned)) return false;
  if (/^T[ÍÍ]TULO/i.test(cleaned)) return false;
  if (/^[a-z]\)/i.test(cleaned)) return false;
  if (/^\(/.test(cleaned)) return false;
  if (!/^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÚÇ]/.test(cleaned)) return false;
  return true;
}
