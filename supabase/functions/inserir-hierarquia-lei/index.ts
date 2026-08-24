// Insere APENAS as linhas de hierarquia (PARTE / LIVRO / TÍTULO / CAPÍTULO / SEÇÃO / SUBSEÇÃO)
// em vade_mecum_artigos, preservando 100% dos artigos já existentes (comentário,
// questões, flashcards, cache de IA, etc). Renumera `ordem` para intercalar os
// cabeçalhos na posição correta baseada no HTML do Planalto.
//
// Body: { slug: string, dry_run?: boolean }
// dry_run = true (default): retorna preview sem gravar.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
};

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

async function fetchHtml(url: string): Promise<string> {
  const fullUrl = url.replace(/^http:/, "https:");
  const res = await fetch(fullUrl, { headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${fullUrl}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  let html: string;
  try {
    html = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    html = new TextDecoder("windows-1252").decode(bytes);
  }
  return html
    .normalize("NFC")
    .replace(/\uFFFD/g, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

// Cabeçalhos hierárquicos — exclui "DISPOSIÇÕES" avulso para não gerar ruído
const HIER_RE =
  /^(PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O)\b[\s\S]*/i;
const HIER_LABEL_ONLY =
  /^(PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O)\s*$/i;
const ART_RE = /^Art\.\s*(\d+(?:\.\d+)*(?:-[A-Z0-9]+)?)/i;
const STRUCTURAL_PREFIXES = [
  "PARTE%",
  "LIVRO%",
  "TÍTULO%",
  "TITULO%",
  "CAPÍTULO%",
  "CAPITULO%",
  "SEÇÃO%",
  "SECAO%",
  "SUBSEÇÃO%",
  "SUBSECAO%",
];

interface Bloco {
  tipo: "hier" | "art";
  numero: string;         // ex "TÍTULO I" ou "1" / "1.368-C"
  texto: string;
}

function extractBlocos(html: string): Bloco[] {
  let body = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  const bm = body.match(/<body[^>]*>([\s\S]+)/i);
  if (bm) body = bm[1];

  body = body.replace(/<sup\b[^>]*>([\s\S]*?)<\/sup>/gi, (_, inner) => {
    const t = inner.replace(/<[^>]+>/g, "").trim().toLowerCase();
    if (t === "" || t === "o" || t === "a" || t === "º" || t === "°" || t === "ª") return "º";
    return inner;
  });

  body = body
    .replace(/<blockquote[^>]*>/gi, "")
    .replace(/<\/blockquote>/gi, "")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div>/gi, "\n\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  body = decodeHtmlEntities(body);

  const linhas = body
    .split(/\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0);

  const startIdx = linhas.findIndex((l) => HIER_RE.test(l) || ART_RE.test(l));
  const uteis = startIdx > 0 ? linhas.slice(startIdx) : linhas;

  let endIdx = -1;
  for (let k = uteis.length - 1; k >= 0; k--) {
    if (/Este texto não substitui/i.test(uteis[k])) { endIdx = k; break; }
  }
  const finais = endIdx > 0 ? uteis.slice(0, endIdx) : uteis;

  const blocos: Bloco[] = [];
  let i = 0;
  while (i < finais.length) {
    const linha = finais[i];
    const hm = linha.match(HIER_RE);
    if (hm) {
      let sigla = linha;
      let texto = linha;
      const proxima = finais[i + 1];
      const eSoLabel = HIER_LABEL_ONLY.test(linha);
      const romano = proxima ? proxima.match(/^([IVXLCDM]+|[ÚU]NICO|PRELIMINAR)$/i) : null;
      if (eSoLabel && romano) {
        sigla = `${linha} ${romano[1].toUpperCase()}`;
        const nome = finais[i + 2];
        if (nome && !HIER_RE.test(nome) && !ART_RE.test(nome) && nome.length < 200) {
          texto = `${sigla}\n${nome}`;
          i += 3;
        } else {
          texto = sigla;
          i += 2;
        }
      } else if (
        proxima && !HIER_RE.test(proxima) && !ART_RE.test(proxima) && proxima.length < 200
      ) {
        texto = `${linha}\n${proxima}`;
        i += 2;
      } else {
        i += 1;
      }
      blocos.push({ tipo: "hier", numero: sigla.toUpperCase(), texto });
      continue;
    }
    const am = linha.match(ART_RE);
    if (am) {
      // pular corpo do artigo — só interessa a posição
      blocos.push({ tipo: "art", numero: am[1], texto: linha });
      let j = i + 1;
      while (j < finais.length) {
        const l2 = finais[j];
        if (HIER_RE.test(l2) || ART_RE.test(l2)) break;
        j += 1;
      }
      i = j;
      continue;
    }
    i += 1;
  }
  return blocos;
}

// Normaliza número de artigo para casar entre DB e HTML.
// Tira ordinais, pontos de milhar e uniformiza sufixo alfabético.
// "1º" -> "1"; "1.368-C" -> "1368-C"; "1.000" -> "1000"; "10-a" -> "10-A"
function normArt(n: string): string {
  return String(n || "")
    .replace(/^Art\.?\s*/i, "")
    .replace(/[º°ª]/g, "")
    .replace(/\./g, "")
    .trim()
    .toUpperCase();
}

function oneLine(text: string): string {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripSuffix(text: string, suffix: string): string | null {
  const normalizedSuffix = oneLine(suffix);
  if (!normalizedSuffix) return null;
  const pattern = new RegExp(`\\s+${escapeRegExp(normalizedSuffix).replace(/\\ /g, "\\\\s+")}\\s*$`, "i");
  const cleaned = text.replace(pattern, "").trim();
  return cleaned !== text.trim() ? cleaned : null;
}

function stripFromHeaderMarker(text: string, headerNumero: string): string | null {
  const normalizedHeader = oneLine(headerNumero);
  if (!normalizedHeader) return null;
  const pattern = new RegExp(
    `(^|[.;:)])\\s+${escapeRegExp(normalizedHeader).replace(/\\ /g, "\\\\s+")}\\b[\\s\\S]*$`,
    "i",
  );
  const cleaned = text.replace(pattern, "$1").trim();
  return cleaned !== text.trim() ? cleaned : null;
}

function stripPendingHeaders(text: string, headers: { numero: string; texto: string }[]): string | null {
  const chain = headers.map((h) => oneLine(h.texto)).join(" ");
  const byChain = stripSuffix(text, chain);
  if (byChain) return byChain;

  let cleaned = text;
  let changed = false;
  for (const h of [...headers].reverse()) {
    const next = stripSuffix(cleaned, h.texto) || stripSuffix(cleaned, h.numero);
    if (next) {
      cleaned = next;
      changed = true;
    }
  }
  if (!changed && headers.length > 0) {
    const firstHeader = headers[0];
    const next = stripFromHeaderMarker(cleaned, firstHeader.numero);
    if (next) {
      cleaned = next;
      changed = true;
    }
  }
  return changed ? cleaned : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const slug: string = String(body.slug || "").trim();
    const dryRun: boolean = body.dry_run !== false;
    if (!slug) {
      return new Response(JSON.stringify({ error: "campo 'slug' é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: lei, error: leiErr } = await supa
      .from("vade_mecum_leis")
      .select("id, slug, nome, planalto_url")
      .eq("slug", slug).maybeSingle();
    if (leiErr) throw leiErr;
    if (!lei || !lei.planalto_url) {
      return new Response(JSON.stringify({ error: `lei '${slug}' inválida ou sem planalto_url` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Existentes ordenados — paginado para evitar limite de 1000
    const existentes: { id: string; numero: string; ordem: number; texto?: string | null }[] = [];
    const PAGE = 1000;
    for (let p = 0; ; p++) {
      const { data, error } = await supa
        .from("vade_mecum_artigos")
        .select("id, numero, ordem, texto")
        .eq("lei_id", lei.id)
        .order("ordem", { ascending: true })
        .range(p * PAGE, p * PAGE + PAGE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      existentes.push(...(data as any));
      if (data.length < PAGE) break;
    }
    if (!existentes || existentes.length === 0) {
      return new Response(JSON.stringify({ error: "nenhum artigo existente" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Detectar linhas estruturais que já existam no DB (segurança)
    const jaEstruturais = existentes.filter((a) =>
      /^(PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][AÃ]O|SUBSE[ÇC][AÃ]O)\b/i.test(a.numero || "")
    ).length;

    const html = await fetchHtml(lei.planalto_url);
    const blocos = extractBlocos(html);

    // Índice DB por numero normalizado -> registro (primeiro match)
    const dbByNum = new Map<string, { id: string; ordem: number; numero: string; texto?: string | null }>();
    for (const a of existentes) {
      if (/^(PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][AÃ]O|SUBSE[ÇC][AÃ]O)\b/i.test(a.numero || "")) continue;
      const k = normArt(a.numero);
      if (!dbByNum.has(k)) dbByNum.set(k, { id: a.id, ordem: a.ordem, numero: a.numero, texto: a.texto });
    }

    // Percorrer blocos: acumular headers pendentes, aplicar ao próximo art casado
    type NovaLinha =
      | { kind: "hier"; numero: string; texto: string }
      | { kind: "art"; id: string; numero_atual: string };
    const sequencia: NovaLinha[] = [];
    const naoCasados: string[] = [];
    let headersPending: { numero: string; texto: string }[] = [];
    const usedIds = new Set<string>();
    const textCleanups = new Map<string, string>();
    let lastArticle: { id: string; texto?: string | null } | null = null;

    for (const b of blocos) {
      if (b.tipo === "hier") {
        headersPending.push({ numero: b.numero, texto: b.texto });
        continue;
      }
      const k = normArt(b.numero);
      const hit = dbByNum.get(k);
      if (hit && !usedIds.has(hit.id)) {
        if (headersPending.length > 0 && lastArticle?.texto) {
          const cleaned = stripPendingHeaders(lastArticle.texto, headersPending);
          if (cleaned) textCleanups.set(lastArticle.id, cleaned);
        }
        for (const h of headersPending) sequencia.push({ kind: "hier", ...h });
        headersPending = [];
        sequencia.push({ kind: "art", id: hit.id, numero_atual: hit.numero });
        usedIds.add(hit.id);
        lastArticle = { id: hit.id, texto: hit.texto };
      } else {
        naoCasados.push(b.numero);
      }
    }

    // Anexar artigos do DB que não apareceram no HTML (preservar!) ao final
    const artigosOrfaos = existentes.filter((a) =>
      !usedIds.has(a.id) &&
      !/^(PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][AÃ]O|SUBSE[ÇC][AÃ]O)\b/i.test(a.numero || "")
    );
    for (const a of artigosOrfaos) sequencia.push({ kind: "art", id: a.id, numero_atual: a.numero });

    const totalHier = sequencia.filter((s) => s.kind === "hier").length;
    const totalArt = sequencia.filter((s) => s.kind === "art").length;

    const preview = {
      slug,
      total_artigos_db: existentes.length,
      cabecalhos_ja_existentes_db: jaEstruturais,
      blocos_html_hier: blocos.filter((b) => b.tipo === "hier").length,
      blocos_html_art: blocos.filter((b) => b.tipo === "art").length,
      hierarquia_a_inserir: totalHier,
      artigos_ordenados: totalArt,
      artigos_orfaos_preservados: artigosOrfaos.length,
      artigos_com_texto_residual_a_limpar: textCleanups.size,
      artigos_html_nao_casados_com_db: naoCasados.length,
      exemplo_nao_casados: naoCasados.slice(0, 10),
      preview_sequencia: sequencia.slice(0, 20).map((s) =>
        s.kind === "hier"
          ? { kind: "hier", numero: s.numero, texto: s.texto.slice(0, 80) }
          : { kind: "art", numero: s.numero_atual }
      ),
    };

    if (dryRun) {
      return new Response(JSON.stringify({ ok: true, dry_run: true, ...preview }, null, 2),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (totalHier === 0) {
      return new Response(JSON.stringify({ error: "nenhum cabeçalho detectado, abortando", ...preview }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (totalArt < Math.floor(existentes.length * 0.8)) {
      return new Response(JSON.stringify({
        error: "baixo casamento (<80%) entre HTML e DB, abortando",
        ...preview,
      }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // GRAVAÇÃO — remove cabeçalhos antigos antes da RPC para não duplicar em reexecuções.
    if (jaEstruturais > 0) {
      const { error: delErr } = await supa
        .from("vade_mecum_artigos")
        .delete()
        .eq("lei_id", lei.id)
        .or(STRUCTURAL_PREFIXES.map((prefix) => `numero.ilike.${prefix}`).join(","));
      if (delErr) throw delErr;
    }

    // GRAVAÇÃO — via RPC server-side (rápida, evita timeout)
    const artIds: string[] = [];
    const artOrdens: number[] = [];
    const hierNumeros: string[] = [];
    const hierTextos: string[] = [];
    const hierOrdens: number[] = [];
    let ord = 0;
    for (const s of sequencia) {
      ord += 1;
      if (s.kind === "hier") {
        hierNumeros.push(s.numero);
        hierTextos.push(s.texto);
        hierOrdens.push(ord);
      } else {
        artIds.push(s.id);
        artOrdens.push(ord);
      }
    }

    const { data: rpcData, error: rpcErr } = await supa.rpc("aplicar_hierarquia_lei", {
      _lei_id: lei.id,
      _art_ids: artIds,
      _art_ordens: artOrdens,
      _hier_numeros: hierNumeros,
      _hier_textos: hierTextos,
      _hier_ordens: hierOrdens,
    });
    if (rpcErr) throw rpcErr;

    let cleanedTexts = 0;
    for (const [id, texto] of textCleanups) {
      const { error: cleanupErr } = await supa
        .from("vade_mecum_artigos")
        .update({ texto })
        .eq("id", id);
      if (cleanupErr) throw cleanupErr;
      cleanedTexts += 1;
    }

    return new Response(JSON.stringify({
      ok: true, dry_run: false,
      rpc: rpcData,
      cabecalhos_inseridos: hierNumeros.length,
      artigos_reordenados: artIds.length,
      artigos_texto_limpo: cleanedTexts,
      ...preview,
    }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
