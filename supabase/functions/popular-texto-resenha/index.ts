// popular-texto-resenha
// Fetches the full text of a Planalto law/decree/MPV and saves it into
// `resenha_diaria.texto_completo`. Optionally generates a short IA
// "explicação" using Gemini (via `geminiFetch` with backup key rotation).
//
// Request body:
//   { id?: string, ids?: string[], force?: boolean, limit?: number,
//     skipExplicacao?: boolean }
//
// - `id`/`ids`: process specific rows.
// - No id: processes up to `limit` (default 25) rows where
//   `texto_completo IS NULL OR length(texto_completo) < 400`.
// - `force`: re-processes even when there is already text.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { geminiFetch } from "../_shared/geminiFetch.ts";
import { MODELS } from "../_shared/ai-models.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0 Safari/537.36";

/** Decode Planalto bytes — most pages are ISO-8859-1 but a few are UTF-8. */
function decodePlanalto(buf: ArrayBuffer, contentType: string | null): string {
  const bytes = new Uint8Array(buf);
  const asLatin1 = new TextDecoder("iso-8859-1").decode(bytes);
  const declared = /charset=([\w-]+)/i.exec(contentType ?? "")?.[1]?.toLowerCase()
    ?? /<meta[^>]+charset=["']?([\w-]+)/i.exec(asLatin1.slice(0, 4096))?.[1]?.toLowerCase();
  if (declared && /utf-?8/.test(declared)) {
    try { return new TextDecoder("utf-8", { fatal: false }).decode(bytes); } catch { /* fall through */ }
  }
  return asLatin1;
}

/** Robust HTML -> plain text conversion tuned for Planalto ccivil pages. */
function htmlToText(html: string): string {
  // Cut off boilerplate before <body> and after </body> when present.
  const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  let src = bodyMatch ? bodyMatch[1] : html;
  src = src.replace(/<script[\s\S]*?<\/script>/gi, " ");
  src = src.replace(/<style[\s\S]*?<\/style>/gi, " ");
  src = src.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  src = src.replace(/<!--[\s\S]*?-->/g, " ");
  // Common Planalto nav blocks
  src = src.replace(/<div[^>]+id=["']?(cabecalho|topo|rodape|menu)[^>]*>[\s\S]*?<\/div>/gi, " ");
  // Line breaks
  src = src.replace(/<\s*br\s*\/?>/gi, "\n");
  src = src.replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n");
  src = src.replace(/<[^>]+>/g, " ");
  // Entities
  src = src
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&[a-z]+;/gi, " ");
  // Whitespace normalization
  src = src.replace(/\r/g, "").replace(/\u00A0/g, " ");
  src = src.split("\n").map((l) => l.replace(/[ \t]+/g, " ").trim()).filter(Boolean).join("\n");
  // Trim boilerplate top/bottom often present on Planalto pages
  const startIdx = src.search(/Presid[eê]ncia\s+da\s+Rep[uú]blica|LEI\s+N[º°]?|DECRETO\s+N[º°]?|MEDIDA\s+PROVIS[ÓO]RIA\s+N[º°]?/i);
  if (startIdx > 0) src = src.slice(startIdx);
  const endIdx = src.search(/Este texto n[aã]o substitui o publicado no DOU|Bras[ií]lia,\s+em[\s\S]{0,300}?\n[\s\S]{0,50}Publicado no DOU/i);
  if (endIdx > 200) src = src.slice(0, endIdx + 60);
  return src.trim();
}

async function fetchPlanaltoText(rawUrl: string): Promise<{ text: string; finalUrl: string; status: number }> {
  // Force https so http->https redirect works reliably from Deno.
  const url = rawUrl.replace(/^http:\/\//i, "https://");
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "pt-BR,pt;q=0.9",
    },
  });
  const buf = await res.arrayBuffer();
  const html = decodePlanalto(buf, res.headers.get("content-type"));
  return { text: htmlToText(html), finalUrl: res.url, status: res.status };
}

async function gerarExplicacao(numero: string, tipo: string, texto: string): Promise<string | null> {
  if (!GEMINI_KEY) return null;
  const model = MODELS.text;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
  const prompt =
    `Explique, de forma didática e objetiva, o que muda com a norma abaixo (${tipo} ${numero}). ` +
    `Estruture em: 1) O que é; 2) Principais pontos; 3) A quem se aplica; 4) Impacto prático. ` +
    `Use markdown com títulos curtos e listas. Máximo 350 palavras. ` +
    `Base-se apenas no texto oficial fornecido:\n\n${texto.slice(0, 15000)}`;
  try {
    const res = await geminiFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 900 },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const out = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join("\n").trim();
    return out || null;
  } catch (e) {
    console.warn("explicacao err", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  let body: any = {};
  try { body = await req.json(); } catch { /* empty body allowed */ }
  const { id, ids, force = false, limit = 25, skipExplicacao = false } = body ?? {};

  // Load target rows
  let rows: any[] = [];
  const wantedIds: string[] = Array.isArray(ids) ? ids.filter(Boolean) : [];
  if (id) wantedIds.push(id);

  if (wantedIds.length) {
    const { data, error } = await supabase
      .from("resenha_diaria")
      .select("id,tipo_ato,numero_ato,url,texto_completo,explicacao")
      .in("id", wantedIds);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    rows = data ?? [];
  } else {
    const { data, error } = await supabase
      .from("resenha_diaria")
      .select("id,tipo_ato,numero_ato,url,texto_completo,explicacao")
      .or("texto_completo.is.null,texto_completo.eq.")
      .not("url", "is", null)
      .order("data_dou", { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 50));
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    rows = data ?? [];
  }

  const results: any[] = [];
  for (const row of rows) {
    try {
      const hasText = (row.texto_completo ?? "").trim().length >= 400;
      if (hasText && !force) {
        results.push({ id: row.id, skipped: true, reason: "already-has-text" });
        continue;
      }
      if (!row.url) {
        results.push({ id: row.id, error: "no-url" });
        continue;
      }
      const { text, status, finalUrl } = await fetchPlanaltoText(row.url);
      if (status >= 400 || text.length < 200) {
        results.push({ id: row.id, error: `fetch-failed status=${status} len=${text.length}`, finalUrl });
        continue;
      }

      let explicacao = row.explicacao;
      if (!skipExplicacao && (!explicacao || force)) {
        explicacao = (await gerarExplicacao(row.numero_ato ?? "", row.tipo_ato ?? "", text)) ?? explicacao;
      }

      const { error: upErr } = await supabase
        .from("resenha_diaria")
        .update({ texto_completo: text, explicacao })
        .eq("id", row.id);
      if (upErr) {
        results.push({ id: row.id, error: upErr.message });
        continue;
      }
      results.push({ id: row.id, ok: true, chars: text.length, hasExplicacao: !!explicacao });
    } catch (e: any) {
      results.push({ id: row.id, error: String(e?.message ?? e) });
    }
  }

  return new Response(
    JSON.stringify({ processed: results.length, results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
